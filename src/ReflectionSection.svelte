<script lang="ts">
  import type { FileView, TFile, App } from "obsidian";
  import ReflectionDay from "./ReflectionDay.svelte";
  import type { FileType, GlobalPlugin } from "./models";

  let {
    currentFile,
    fileType,
    app,
    view,
    plugin,
  }: {
    currentFile: TFile;
    fileType: FileType;
    app: App;
    view: FileView;
    plugin: GlobalPlugin;
  } = $props();

  let files = $derived(plugin.getFilesFromLastTime(currentFile, fileType));
</script>

<div>
  {#each [...files.entries()].filter(([_, value]) => value !== null) as [index, file]}
    <ReflectionDay {currentFile} {index} {file} {view} {app} />
  {/each}
</div>

<style lang="scss"></style>
