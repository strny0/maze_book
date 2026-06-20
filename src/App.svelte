<script lang="ts">
  import { onMount } from "svelte";
  import { bootstrapContent } from "./lib/db/bootstrap";
  import { getWorkspace } from "./lib/db/idb";
  import { loadContent } from "./lib/stores/content";
  import { initWorkspace, startAutosave, currentRoom } from "./lib/stores/workspace";
  import { rooms, roomById } from "./lib/stores/content";
  import RoomImage from "./components/RoomImage.svelte";
  import Notes from "./components/Notes.svelte";
  import LeftDrawer from "./components/LeftDrawer.svelte";
  import BottomDrawer from "./components/BottomDrawer.svelte";
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
</script>

{#if ready}
  <LeftDrawer>
    <CurrentRoom />
    <hr />
    {#if currentRoomObj}<RoomText room={currentRoomObj} />{/if}
    <hr />
    <RoomDirectory />
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
</style>
