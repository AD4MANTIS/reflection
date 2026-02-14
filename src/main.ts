import { Plugin, FileView, type TFile, type WorkspaceLeaf, type TAbstractFile } from 'obsidian';
import { DEFAULT_SETTINGS, type PluginSettings, ReflectionSettingTab } from "./settings";
import { getAllDailyNotes, getAllWeeklyNotes, getDailyNote, getDailyNoteSettings, getDateFromFile, getWeeklyNote, getWeeklyNoteSettings, type IPeriodicNoteSettings } from 'obsidian-daily-notes-interface';
import { isWorkspaceLeafEx, type CmEditor, type FileType, type GlobalPlugin, type WorkspaceLeafEx } from 'models';
import ReflectionSection from './ReflectionSection.svelte';
import { mount } from 'svelte';

const reflectionClass = "reflection-container";

export default class Reflection extends Plugin implements GlobalPlugin {
  settings: PluginSettings;
  ready = false;

  noteCaches: Record<FileType, Record<string, TFile>>;

  periodicNotesSettings: Record<FileType, IPeriodicNoteSettings>;

  readonly leafRegistry: Record<string, string> = {};

  public async onload() {
    await this.loadSettings();

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new ReflectionSettingTab(this.app, this));

    this.handleRegisterEvents();

    this.init();
    this.updateAllLeaves();
  }

  public onunload() {
    // do nothing
  }

  private handleRegisterEvents() {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf != null) {
          this.runOnLeaf(leaf);
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on("window-open", () => {
        this.updateAllLeaves();
      }),
    );
  }

  private init() {
    // Sometimes this loads before the dependencies are ready
    // This stops that from throwing an unncessary error
    try {
      this.establishNoteCaches();
      this.gatherPeriodicNoteSettings();
      this.ready = true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Dependencies not yet ready
    }
  }

  private establishNoteCaches() {
    this.noteCaches = {
      weekly: getAllWeeklyNotes(),
      daily: getAllDailyNotes()
    };
  }

  private gatherPeriodicNoteSettings() {
    this.periodicNotesSettings = {
      weekly: getWeeklyNoteSettings(),
      daily: getDailyNoteSettings()
    };
  }

  public async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
  }

  public async saveSettings() {
    await this.saveData(this.settings);
  }


  private updateAllLeaves() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType("markdown");

    leaves.forEach((l) => this.runOnLeaf(l));
  }

  private runOnLeaf(leaf: WorkspaceLeaf) {
    if (!this.ready) {
      this.init();
    }

    if (!isWorkspaceLeafEx(leaf) || !this.doesLeafNeedUpdating(leaf)) {
      return false;
    }

    const activeView = leaf.view;
    const activeFile = activeView.file;

    // The active view might not be a markdown view
    if (!activeFile) {
      return false;
    }
    this.setLeafRegistry(leaf);
    this.renderContent(activeView, activeFile);
    return true;
  }

  private doesLeafNeedUpdating(leaf: WorkspaceLeafEx) {
    return this.leafRegistry[leaf.id] == leaf.view.file?.path ? false : true;
  }

  private setLeafRegistry(leaf: WorkspaceLeafEx) {
    const path = leaf.view.file?.path;
    if (path) {
      this.leafRegistry[leaf.id] = path;
    }
  }

  private renderContent(view: WorkspaceLeafEx["view"], file: TFile) {
    const editor = view.sourceMode.cmEditor;

    removeContentFromFrame(editor.containerEl);

    const fileType = this.getTypeOfFile(file);
    if (fileType == null) {
      return false;
    }

    this.addComponentToFrame(view, editor, file, fileType);

    return true;
  }

  getTypeOfFile(file: TAbstractFile): FileType | null {
    if (file.parent == null) {
      return null;
    }

    if (this.periodicNotesSettings.daily.folder != null &&
      file.parent.path.startsWith(this.periodicNotesSettings.daily.folder)) {
      return "daily";
    }

    if (this.periodicNotesSettings.weekly.folder != null &&
      file.parent.path.startsWith(this.periodicNotesSettings.weekly.folder)) {
      return "weekly";
    }
    return null;
  }

  addComponentToFrame(
    view: FileView,
    editor: CmEditor,
    currentFile: TFile,
    fileType: FileType,
  ) {
    const props = {
      app: this.app,
      currentFile: currentFile,
      fileType,
      view,
      title: "No Previous Notes",
      plugin: this,
    };

    const div = document.createElement("div");
    div.classList.add(reflectionClass);

    const parentContainer = editor.containerEl.querySelector(".cm-sizer");
    const contentContainer = editor.containerEl.querySelector(
      ".cm-contentContainer",
    );

    if (parentContainer == null) {
      throw new Error("Could not find parent container");
    }

    const embeddedLinksContainer = parentContainer.querySelector(
      ".embedded-backlinks",
    );
    // const contentContainer = editor.containerEl.querySelector('.cm-active');

    // We should remove the existing one first
    removeElementsByClass(parentContainer, reflectionClass);

    if (embeddedLinksContainer?.parentNode != null) {
      embeddedLinksContainer.parentNode.insertBefore(
        div,
        embeddedLinksContainer,
      );
    } else if (contentContainer != null) {
      insertAfter(contentContainer, div);
    }
    else {
      throw new Error("Could not find content container");
    }

    mount(ReflectionSection, {
      target: div,
      props: props
    });
  }

  public getFilesFromLastTime(file: TFile, fileType: FileType) {
    // This will return an object with the files from the previous years
    // Where the key is how many years ago this file was from.
    switch (fileType) {
      case "daily":
        return this._getFilesFromPreviousPeriods(file, fileType);
      case "weekly":
        return this._getFilesFromPreviousPeriods(file, fileType);
      default:
        throw new Error("Unknown File Type");
    }
  }

  private _getFilesFromPreviousPeriods(file: TFile, fileType: FileType) {
    // We use the key in this object to know how many years back a file was
    // Otherwise we could use an array and just use the index
    // We're not necessarily going to have a file each year
    const files = new Map<number, TFile>();
    // Define how many years back we want to look back
    const checkLength = this.settings.lookBack;

    for (let i = 1; i <= checkLength; i++) {
      files.set(i, this._getFileFromPreviousPeriod(file, fileType, i));
    }

    return files;
  }

  private _getFileFromPreviousPeriod(
    file: TFile,
    fileType: FileType,
    lookBack: number,
  ) {
    switch (fileType) {
      case "daily":
        return getDailyNote(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          getDateFromFile(file, "day")!.subtract(lookBack, "years"),
          this.noteCaches.daily,
        );
      case "weekly":
        return getWeeklyNote(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          getDateFromFile(file, "week")!.subtract(lookBack, "years"),
          this.noteCaches.weekly,
        );
      default:
        throw new Error("Unknown File Type");
    }
  }
}

function removeContentFromFrame(container: HTMLElement) {
  removeElementsByClass(container, reflectionClass);
}

function removeElementsByClass(domNodeToSearch: Element, className: string) {
  const elements = domNodeToSearch.getElementsByClassName(className);
  while (elements.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    elements[0]!.parentNode?.removeChild(elements[0]!);
  }
}

function insertAfter(referenceNode: Element, newNode: Element) {
  referenceNode.parentNode?.insertAfter(newNode, referenceNode);
}


