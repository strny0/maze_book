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
  .tabs { display: flex; gap: 0; margin-bottom: 10px; background: var(--seg-bg); border: 1px solid var(--seg-border); border-radius: 7px; overflow: hidden; width: fit-content; }
  button {
    background: none; color: var(--seg-idle); border: none;
    padding: 5px 14px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    transition: background .1s, color .1s;
  }
  button.active {
    background: var(--seg-active-bg); color: var(--seg-active-text);
  }
  textarea {
    width: 100%; min-height: 180px;
    background: var(--ta-bg); color: var(--ta-text);
    border: 1px solid var(--ta-border); border-radius: 7px;
    padding: 12px; resize: vertical; outline: none;
    font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6;
  }
  textarea::placeholder { color: var(--dim); opacity: .75; font-style: italic; }
  .mdview {
    padding: 4px 6px;
    font-family: var(--serif-font); font-size: 15px; line-height: 1.65; color: var(--text);
  }
  .mdview :global(p) { margin: 0 0 10px; }
  .mdview :global(h1), .mdview :global(h2), .mdview :global(h3) {
    font-family: var(--disp-font); color: var(--mza); margin: 12px 0 6px;
  }
  .mdview :global(a[data-room]) { color: var(--mza); cursor: pointer; text-decoration: underline dotted; }
</style>
