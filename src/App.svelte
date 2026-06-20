<script lang="ts">
  import { onMount } from "svelte";
  import { bootstrapContent } from "./lib/db/bootstrap";
  import { getWorkspace } from "./lib/db/idb";
  import { loadContent } from "./lib/stores/content";
  import { initWorkspace, startAutosave, currentRoom } from "./lib/stores/workspace";
  import { rooms, roomById } from "./lib/stores/content";
  import RoomImage from "./components/RoomImage.svelte";
  import Notes from "./components/Notes.svelte";

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
  <main class="core">
    <section class="image">
      {#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}
    </section>
    <section class="notes"><Notes roomId={$currentRoom} /></section>
  </main>
{:else}
  <p>Loading…</p>
{/if}
