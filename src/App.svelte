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
  import RoomImage from "./components/RoomImage.svelte";
  import Notes from "./components/Notes.svelte";
  import CurrentRoom from "./components/CurrentRoom.svelte";
  import RoomDirectory from "./components/RoomDirectory.svelte";
  import RoomGraph from "./components/RoomGraph.svelte";
  import RoomText from "./components/RoomText.svelte";

  let ready = false;
  $: currentRoomObj = $roomById.get($currentRoom);

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
    <Splitpanes theme="maze" style="height:100%">
      <!-- LEFT COLUMN: fixed flex stack (no inner resize bars) -->
      <Pane size={23} minSize={14}>
        <div class="leftcol">
          <div class="pcard none"><div class="label">Current Room</div>
            <div class="pbody"><CurrentRoom /></div></div>
          <div class="pcard grow"><div class="label">Room Text</div>
            <div class="pbody scroll">{#if currentRoomObj}<RoomText room={currentRoomObj} />{/if}</div></div>
          <div class="pcard none"><div class="pbody"><RoomDirectory /></div></div>
        </div>
      </Pane>

      <!-- RIGHT SIDE: image+notes on top, graph docked below -->
      <Pane size={77}>
        <Splitpanes theme="maze" horizontal={true}>
          <Pane size={74} minSize={30}>
            <Splitpanes theme="maze">
              <Pane size={62} minSize={25}>
                <div class="pcard">
                  <div class="hd">
                    <div class="label">Room Image</div>
                    <div class="acts">
                      <button on:click={exportWs} title="Export workspace JSON">Export</button>
                      <label class="imp" title="Import workspace JSON">Import<input type="file" accept="application/json" on:change={importWs} hidden /></label>
                    </div>
                  </div>
                  <div class="pbody fill">{#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}</div>
                </div>
              </Pane>
              <Pane size={38} minSize={20}>
                <div class="pcard"><div class="label">Notes</div>
                  <div class="pbody fill"><Notes roomId={$currentRoom} /></div></div>
              </Pane>
            </Splitpanes>
          </Pane>
          <Pane size={26} minSize={12}>
            <div class="pcard"><div class="label">Room Graph</div>
              <div class="pbody fill"><RoomGraph /></div></div>
          </Pane>
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </div>
{:else}
  <p class="loading">Loading…</p>
{/if}

<style>
  .shell { height: 100vh; padding: 8px; }
  .loading { padding: 24px; color: var(--dim); }

  .leftcol { height: 100%; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
  .leftcol .pcard.none { flex: none; height: auto; }
  .leftcol .pcard.grow { flex: 1; min-height: 0; }
  .pcard.none .pbody { flex: none; }

  .pcard { height: 100%; display: flex; flex-direction: column; min-height: 0;
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    padding: 12px 14px; overflow: hidden; }
  .pbody { flex: 1; min-height: 0; }
  .pbody.scroll { overflow: auto; }
  .pbody.fill { display: flex; flex-direction: column; overflow: hidden; }
  /* let fill-mode editors (notes textarea / preview) grow with the pane */
  .pbody.fill :global(textarea) { flex: 1; min-height: 0; resize: none; }
  .pbody.fill :global(.mdview) { flex: 1; min-height: 0; overflow: auto; }

  .hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .acts { display: flex; gap: 6px; }
  .acts button, .imp { background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; cursor: pointer;
    font-size: 11px; }
  .acts button:hover, .imp:hover { border-color: var(--mza); }

  /* resizable splitter handles (every border) */
  :global(.splitpanes.maze) { --sp: 8px; }
  :global(.splitpanes__splitter) { background: transparent; position: relative;
    transition: background .15s; }
  :global(.splitpanes--vertical > .splitpanes__splitter) { width: 8px; min-width: 8px; cursor: col-resize; }
  :global(.splitpanes--horizontal > .splitpanes__splitter) { height: 8px; min-height: 8px; cursor: row-resize; }
  :global(.splitpanes__splitter::after) { content: ""; position: absolute; border-radius: 3px;
    background: var(--line); transition: background .15s; }
  :global(.splitpanes--vertical > .splitpanes__splitter::after) {
    top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2px; height: 34px; }
  :global(.splitpanes--horizontal > .splitpanes__splitter::after) {
    left: 50%; top: 50%; transform: translate(-50%, -50%); height: 2px; width: 34px; }
  :global(.splitpanes__splitter:hover::after) { background: var(--mza); }
  :global(.splitpanes__splitter:hover) { background: #e2a85722; }
</style>
