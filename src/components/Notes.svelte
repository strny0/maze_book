<script lang="ts">
  import { renderMarkdown } from "../lib/markdown/render";
  import { roomWork, updateRoomWork, currentRoom } from "../lib/stores/workspace";

  export let roomId: string;
  let mode: "write" | "preview" = "write";
  let value = "";
  $: value = $roomWork[roomId]?.notes ?? "";

  function onInput(e: Event) {
    value = (e.target as HTMLTextAreaElement).value;
    updateRoomWork(roomId, { notes: value });
  }
  function onPreviewClick(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest("a[data-room]");
    if (a) { e.preventDefault(); currentRoom.set(a.getAttribute("data-room")!); }
  }
</script>

<div class="tabs">
  <button class:active={mode === "write"} on:click={() => (mode = "write")}>Write</button>
  <button class:active={mode === "preview"} on:click={() => (mode = "preview")}>Preview</button>
</div>
{#if mode === "write"}
  <textarea value={value} on:input={onInput} placeholder="Markdown — # heading, **bold**, [[room 22]]…"></textarea>
{:else}
  <div class="mdview" on:click={onPreviewClick}>{@html renderMarkdown(value)}</div>
{/if}

<style>
  .tabs { display: flex; gap: 6px; padding: 6px 8px; }
  button.active { color: var(--mza); }
  textarea { width: 100%; min-height: 240px; background: #0a0e13; color: var(--text);
    border: 1px solid var(--line); border-radius: 8px; padding: 12px; resize: vertical; }
  .mdview { padding: 4px 8px; }
</style>
