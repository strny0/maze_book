<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { Splitpanes, Pane } from "svelte-splitpanes";
  import { bootstrapContent } from "./lib/db/bootstrap";
  import { getWorkspace, setWorkspace } from "./lib/db/idb";
  import { loadContent } from "./lib/stores/content";
  import { initWorkspace, startAutosave, currentRoom, workspaceDoc } from "./lib/stores/workspace";
  import { rooms, roomById } from "./lib/stores/content";
  import { serializeWorkspace, parseWorkspace, downloadJson } from "./lib/db/exportImport";
  import { theme } from "./lib/stores/theme";
  import RoomImage from "./components/RoomImage.svelte";
  import Notes from "./components/Notes.svelte";
  import CurrentRoom from "./components/CurrentRoom.svelte";
  import RoomDirectory from "./components/RoomDirectory.svelte";
  import RoomText from "./components/RoomText.svelte";
  import OptionsDialog from "./components/OptionsDialog.svelte";

  let ready = false;
  let showOptions = false;
  $: currentRoomObj = $roomById.get($currentRoom);

  // Write theme to <html data-theme="..."> whenever it changes
  $: document.documentElement.dataset.theme = $theme;

  function loadSplit(key: string, defaults: number[]): number[] {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : defaults;
    } catch { return defaults; }
  }
  type PaneSizeEvent = { size: number }[];
  const mainSizes = loadSplit("split-main", [23, 77]);
  const rightSizes = loadSplit("split-right", [62, 38]);
  function onMainResized(e: CustomEvent<PaneSizeEvent>) {
    localStorage.setItem("split-main", JSON.stringify(e.detail.map(p => p.size)));
  }
  function onRightResized(e: CustomEvent<PaneSizeEvent>) {
    localStorage.setItem("split-right", JSON.stringify(e.detail.map(p => p.size)));
  }

  onMount(async () => {
    const content = await bootstrapContent(
      (u) => fetch(u).then((r) => r.text()),
      (u) => fetch(u).then((r) => r.json())
    );
    loadContent(content.rooms, content.doors);
    initWorkspace(await getWorkspace());
    startAutosave();
    ready = true;
  });

  function exportWs() {
    downloadJson("maze-workspace.json", serializeWorkspace(get(workspaceDoc)));
  }
  async function importWs(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const doc = parseWorkspace(await file.text());
      await setWorkspace(doc);
      initWorkspace(doc);
    } catch (err) {
      alert("Import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      input.value = "";
    }
  }
</script>

{#if ready}
  <div class="shell">
    <Splitpanes theme="maze" style="height:100%" on:resized={onMainResized}>
      <!-- LEFT COLUMN -->
      <Pane size={mainSizes[0]} minSize={14}>
        <div class="leftcol">
          <div class="pcard none"><div class="label">Current Room</div>
            <div class="pbody"><CurrentRoom /></div></div>
          <div class="pcard grow"><div class="label">Room Text</div>
            <div class="pbody scroll">{#if currentRoomObj}<RoomText room={currentRoomObj} />{/if}</div></div>
          <div class="pcard grow dir-card">
            <div class="pbody fill"><RoomDirectory /></div></div>
        </div>
      </Pane>

      <!-- RIGHT SIDE: image + notes -->
      <Pane size={mainSizes[1]}>
        <Splitpanes theme="maze" on:resized={onRightResized}>
          <Pane size={rightSizes[0]} minSize={25}>
            <div class="pcard img-card">
              <div class="pbody fill">{#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}</div>
            </div>
          </Pane>
          <Pane size={rightSizes[1]} minSize={20}>
            <div class="pcard">
              <div class="notes-hd">
                <div class="label">Notes</div>
                <button class="cog" on:click={() => (showOptions = true)} title="Options">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              </div>
              <div class="pbody fill"><Notes roomId={$currentRoom} /></div>
            </div>
          </Pane>
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </div>

  <OptionsDialog
    show={showOptions}
    {exportWs}
    {importWs}
    on:close={() => (showOptions = false)}
  />
{:else}
  <p class="loading">Loading…</p>
{/if}

<style>
  .shell { height: 100vh; padding: 8px; }
  .loading { padding: 24px; color: var(--dim); font-family: var(--serif-font); }

  .leftcol { height: 100%; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
  .leftcol .pcard.none { flex: none; height: auto; }
  .leftcol .pcard.grow { flex: 1; min-height: 0; }
  .pcard.none .pbody { flex: none; }

  .pcard { height: 100%; display: flex; flex-direction: column; min-height: 0;
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    padding: 12px 14px; overflow: hidden; box-shadow: var(--panel-shadow); }
  .img-card { padding: 0; }
  .pbody { flex: 1; min-height: 0; }
  .pbody.scroll { overflow: auto; }
  .pbody.fill { display: flex; flex-direction: column; overflow: hidden; }
  .pbody.fill :global(textarea) { flex: 1; min-height: 0; resize: none; }
  .pbody.fill :global(.mdview) { flex: 1; min-height: 0; overflow: auto; }

  .notes-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .notes-hd .label { margin-bottom: 0; }
  .cog {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
    background: var(--panel2); color: var(--dim);
    border: 1px solid var(--line); border-bottom: 2px solid var(--btn-border-b);
    box-shadow: 0 2px 3px rgba(60,40,12,.10);
    transition: color .12s, border-color .12s;
  }
  .cog:hover { color: var(--text); border-color: var(--mzam); }

  .pcard.dir-card { padding: 0; }

  /* Splitter handles */
  :global(.splitpanes.maze) { --sp: 8px; }
  :global(.splitpanes__splitter) { background: transparent; position: relative; transition: background .15s; }
  :global(.splitpanes--vertical > .splitpanes__splitter) { width: 8px; min-width: 8px; cursor: col-resize; }
  :global(.splitpanes--horizontal > .splitpanes__splitter) { height: 8px; min-height: 8px; cursor: row-resize; }
  :global(.splitpanes__splitter::after) { content: ""; position: absolute; border-radius: 3px;
    background: var(--line); transition: background .15s; }
  :global(.splitpanes--vertical > .splitpanes__splitter::after) {
    top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2px; height: 34px; }
  :global(.splitpanes--horizontal > .splitpanes__splitter::after) {
    left: 50%; top: 50%; transform: translate(-50%, -50%); height: 2px; width: 34px; }
  :global(.splitpanes__splitter:hover::after) { background: var(--mza); }
  :global(.splitpanes__splitter:hover) { background: rgba(169,118,42,.14); }
</style>
