<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { bootstrapContent } from "./lib/db/bootstrap";
  import { getWorkspace, setWorkspace } from "./lib/db/idb";
  import { loadContent } from "./lib/stores/content";
  import { initWorkspace, startAutosave, currentRoom, workspaceDoc } from "./lib/stores/workspace";
  import { rooms, roomById } from "./lib/stores/content";
  import { serializeWorkspace, parseWorkspace, downloadJson } from "./lib/db/exportImport";
  import RoomImage from "./components/RoomImage.svelte";
  import Notes from "./components/Notes.svelte";
  import LeftDrawer from "./components/LeftDrawer.svelte";
  import BottomDrawer from "./components/BottomDrawer.svelte";
  import CurrentRoom from "./components/CurrentRoom.svelte";
  import RoomDirectory from "./components/RoomDirectory.svelte";
  import RoomGraph from "./components/RoomGraph.svelte";
  import RoomText from "./components/RoomText.svelte";
  import GlobalNotes from "./components/GlobalNotes.svelte";

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

<div class="topbar">
  <button on:click={exportWs}>Export</button>
  <label class="imp">Import<input type="file" accept="application/json" on:change={importWs} hidden /></label>
</div>

{#if ready}
  <LeftDrawer>
    <CurrentRoom />
    <hr />
    {#if currentRoomObj}<RoomText room={currentRoomObj} />{/if}
    <hr />
    <RoomDirectory />
    <hr />
    <GlobalNotes />
  </LeftDrawer>

  <main class="core">
    <section class="image">{#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}</section>
    <section class="notes"><Notes roomId={$currentRoom} /></section>
  </main>

  <BottomDrawer>
    <RoomGraph />
  </BottomDrawer>
{:else}
  <p>Loading…</p>
{/if}

<style>
  .core { display: grid; grid-template-columns: 1fr 460px; gap: 14px; height: 100vh;
    padding: 14px; }
  .image, .notes { background: var(--panel); border: 1px solid var(--line);
    border-radius: 10px; overflow: auto; }
  .topbar { position: fixed; top: 8px; right: 12px; z-index: 30; display: flex; gap: 8px; }
  .topbar button, .imp { background: #1c232d; color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; }
</style>
