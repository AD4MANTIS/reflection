<script lang="ts">
  import type { FileView, TFile, App } from "obsidian";
  import ReflectionDay from "./ReflectionDay.svelte";
  import type { FileType, GlobalPlugin } from "./models";
  export let currentFile: TFile;
  export let fileType: FileType;
  export let app: App;
  export let view: FileView;
  export let plugin: GlobalPlugin;

  let files = plugin.getFilesFromLastTime(currentFile, fileType);
</script>

<div>
  {#each [...files.entries()].filter(([_, value]) => value !== null) as [index, file]}
    <ReflectionDay {currentFile} {index} {file} {view} {app} />
  {/each}
</div>

<style lang="scss"></style>
