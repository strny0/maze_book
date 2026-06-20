<script lang="ts">
  import { onMount } from "svelte";
  import { bootstrapContent } from "./lib/db/bootstrap";
  import { getWorkspace } from "./lib/db/idb";
  import { loadContent } from "./lib/stores/content";
  import { initWorkspace, startAutosave, currentRoom } from "./lib/stores/workspace";
  import { rooms } from "./lib/stores/content";

  let ready = false;
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
  <main>
    <p>Loaded {$rooms.length} rooms. Current: {$currentRoom}</p>
  </main>
{:else}
  <p>Loading…</p>
{/if}
