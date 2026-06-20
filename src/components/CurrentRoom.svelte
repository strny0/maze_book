<script lang="ts">
  import { rooms, doors, doorsFrom, roomById } from "../lib/stores/content";
  import { currentRoom, explored, markExplored } from "../lib/stores/workspace";

  $: ids = $rooms.map((r) => r.id);
  $: room = $roomById.get($currentRoom);
  $: outs = doorsFrom($doors, $currentRoom);
  $: idx = ids.indexOf($currentRoom);

  function go(id: string) { currentRoom.set(id); markExplored(id); }
  function prev() { if (idx > 0) go(ids[idx - 1]); }
  function next() { if (idx < ids.length - 1) go(ids[idx + 1]); }
</script>

<div class="cur">
  <div class="big">{$currentRoom}</div>
  <div class="meta">
    <div class="title">{room?.title ?? `Room ${$currentRoom}`}</div>
    <div class="count">{$explored.size} / {ids.length} explored</div>
  </div>
</div>
<div class="doors">
  {#each outs as d}<button class="chip" on:click={() => go(d)}>{d}</button>{/each}
</div>
<div class="nav">
  <button on:click={prev} disabled={idx <= 0}>‹ prev</button>
  <button on:click={next} disabled={idx >= ids.length - 1}>next ›</button>
</div>

<style>
  .cur { display: flex; gap: 12px; align-items: center; }
  .big { font-size: 48px; font-weight: 700; color: var(--mza); }
  .doors { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { background: #1c232d; color: var(--mzam); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; }
  .nav { display: flex; gap: 8px; }
</style>
