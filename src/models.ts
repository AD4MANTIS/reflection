import { FileView, type TFile, type WorkspaceLeaf } from "obsidian";

export type FileType = "daily" | "weekly";

export type WorkspaceLeafEx = WorkspaceLeaf & {
  id: string;
  view: FileView & {
    sourceMode: {
      cmEditor: CmEditor;
    };
  };
};

export function isWorkspaceLeafEx(leaf: WorkspaceLeaf): leaf is WorkspaceLeafEx {

  return "id" in leaf && typeof leaf.id === "string" && leaf.view instanceof FileView && "sourceMode" in leaf.view;
}

export type CmEditor = {
  containerEl: HTMLElement;
};

export type GlobalPlugin = {
  getFilesFromLastTime(file: TFile, fileType: FileType): Map<number, TFile>;
};
