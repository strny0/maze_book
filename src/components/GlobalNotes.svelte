<script lang="ts">
  import { renderMarkdown } from "../lib/markdown/render";
  import { globalNotes } from "../lib/stores/workspace";
  let mode: "write" | "preview" = "write";
</script>
<div class="tabs">
  <button class:active={mode === "write"} on:click={() => (mode = "write")}>Write</button>
  <button class:active={mode === "preview"} on:click={() => (mode = "preview")}>Preview</button>
</div>
{#if mode === "write"}
  <textarea bind:value={$globalNotes} placeholder="Global theories, solution path, riddle log…"></textarea>
{:else}
  <div class="mdview">{@html renderMarkdown($globalNotes)}</div>
{/if}
<style>
  textarea { width: 100%; min-height: 200px; background: #0a0e13; color: var(--text);
    border: 1px solid var(--line); border-radius: 8px; padding: 12px; box-sizing: border-box; }
  .tabs { display: flex; gap: 6px; margin-bottom: 6px; }
  .tabs button.active { color: var(--mza); }
</style>
