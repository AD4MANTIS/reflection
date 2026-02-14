import {
  Plugin,
  WorkspaceLeaf,
  FileView,
  TFile,
  TAbstractFile,
} from "obsidian";
import ReflectionSection from "./ReflectionSection.svelte";
import {
  getAllDailyNotes,
  getAllWeeklyNotes,
  getDailyNote,
  getWeeklyNote,
  getDateFromFile,
  getWeeklyNoteSettings,
  getDailyNoteSettings,
} from "obsidian-daily-notes-interface";
import type { CmEditor, FileType, GlobalPlugin } from "./models";

const noteCaches = {
  weekly: null,
  daily: null,
};

const periodicNotesSettings = {
  weekly: null,
  daily: null,
};

const reflectionClass = "reflection-container";

const leafRegistry = {};

function removeElementsByClass(domNodeToSearch: Element, className: string) {
  const elements = domNodeToSearch.getElementsByClassName(className);
  while (elements.length > 0) {
    elements[0].parentNode.removeChild(elements[0]);
  }
}

function insertAfter(referenceNode: Element, newNode: Element) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

export default class Reflection extends Plugin implements GlobalPlugin {
  ready = false;

  async runOnLeaf(leaf: WorkspaceLeaf) {
    if (!this.ready) {
      await this.init();
    }

    if (!this.doesLeafNeedUpdating(leaf)) {
      return false;
    }

    const activeView = leaf.view as FileView;
    const activeFile = activeView.file;

    if (activeView && activeFile) {
      // The active view might not be a markdown view
      this.setLeafRegistry(leaf);
      this.renderContent(activeView, activeFile);
    }
  }

  setLeafRegistry(leaf: WorkspaceLeaf) {
    leafRegistry[leaf["id"]] = (leaf.view as FileView).file.path;
  }

  handleRegisterEvents() {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async (leaf) => {
        this.runOnLeaf(leaf);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("window-open", async () => {
        this.updateAllLeaves();
      }),
    );
  }

  updateAllLeaves() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType("markdown");

    leaves.forEach((l) => this.runOnLeaf(l));
  }

  doesLeafNeedUpdating(leaf) {
    return leafRegistry[leaf.id] == leaf.view?.file?.path ? false : true;
  }

  removeContentFromFrame(container: HTMLElement) {
    removeElementsByClass(container, reflectionClass);
  }

  async addComponentToFrame(
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
    const embeddedLinksContainer = parentContainer.querySelector(
      ".embedded-backlinks",
    );
    // const contentContainer = editor.containerEl.querySelector('.cm-active');

    // We should remove the existing one first
    removeElementsByClass(parentContainer, reflectionClass);

    if (embeddedLinksContainer) {
      embeddedLinksContainer.parentNode.insertBefore(
        div,
        embeddedLinksContainer,
      );
    } else {
      insertAfter(contentContainer, div);
    }

    new ReflectionSection({
      target: div,
      props: props,
    });
  }

  async gatherAllWeeklyNotes() {
    return getAllWeeklyNotes();
  }

  async gatherAllDailyNotes() {
    return getAllDailyNotes();
  }

  async establishNoteCaches() {
    noteCaches.weekly = await this.gatherAllWeeklyNotes();
    noteCaches.daily = await this.gatherAllDailyNotes();
  }

  async gatherPeriodicNoteSettings() {
    periodicNotesSettings.weekly = getWeeklyNoteSettings();
    periodicNotesSettings.daily = getDailyNoteSettings();
  }

  getFileFromLastTime(file: TFile, fileType: FileType): TFile | undefined {
    return this._getFileFromPreviousPeriod(file, fileType, 1);
  }

  getFilesFromLastTime(file: TFile, fileType: FileType) {
    // This will return an object with the files from the previous years
    // Where the key is how many years ago this file was from.
    switch (fileType) {
      case "daily":
        return this._getFilesFromPreviousPeriods(file, fileType);
      case "weekly":
        return this._getFilesFromPreviousPeriods(file, fileType);
      default:
        throw "Unknown File Type";
    }
  }

  _getFileFromPreviousPeriod(
    file: TFile,
    fileType: FileType,
    lookback: number,
  ) {
    switch (fileType) {
      case "daily":
        return getDailyNote(
          getDateFromFile(file as any, "day").subtract(lookback, "years"),
          noteCaches.daily,
        ) as any as TFile;
      case "weekly":
        return getWeeklyNote(
          getDateFromFile(file as any, "week").subtract(lookback, "years"),
          noteCaches.weekly,
        ) as any as TFile;
      default:
        throw "Unknown File Type";
    }
  }

  _getFilesFromPreviousPeriods(file: TFile, fileType: FileType) {
    // We use the key in this object to know how many years back a file was
    // Otherwise we could use an array and just use the index
    // We're not necessarily going to have a file each year
    const files = new Map<number, TFile>();
    // Define how many years back we want to look back
    const checkLength = 5;

    for (let i = 1; i <= checkLength; i++) {
      files.set(i, this._getFileFromPreviousPeriod(file, fileType, i));
    }

    return files;
  }

  getTypeOfFile(file: TAbstractFile): FileType {
    if (file.parent.path.includes(periodicNotesSettings.daily.folder)) {
      return "daily";
    }

    if (file.parent.path.includes(periodicNotesSettings.weekly.folder)) {
      return "weekly";
    }
    return;
  }

  async renderContent(view: FileView, file: TFile) {
    const editor = (view as any).sourceMode.cmEditor as CmEditor;

    this.removeContentFromFrame(editor.containerEl);

    const fileType = this.getTypeOfFile(file);
    if (!noteCaches[fileType]) {
      return false;
    }

    this.addComponentToFrame(view, editor, file, fileType);
  }

  async init() {
    // Sometimes this loads before the dependencies are ready
    // This stops that from throwing an unncessary error
    try {
      await this.establishNoteCaches();
      await this.gatherPeriodicNoteSettings();
      this.ready = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Dependencies not yet ready
    }
  }

  async onload() {
    this.handleRegisterEvents();

    await this.init();
    this.updateAllLeaves();
  }

  onunload() {}
}
