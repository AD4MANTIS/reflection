import type { TFile } from "obsidian";

export type FileType = "daily" | "weekly";

export type CmEditor = {
  containerEl: HTMLElement;
};

export type GlobalPlugin = {
  getFilesFromLastTime(file: TFile, fileType: FileType): Map<number, TFile>;
};
