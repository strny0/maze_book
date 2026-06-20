<script lang="ts">
  import { rooms, doors, doorsFrom, roomById } from "../lib/stores/content";
  import { currentRoom, explored } from "../lib/stores/workspace";

  $: ids = $rooms.map((r) => r.id).filter((id) => id !== "00"); // 01–45
  $: room = $roomById.get($currentRoom);
  $: outs = doorsFrom($doors, $currentRoom).filter((id) => id !== "00");
  $: idx = ids.indexOf($currentRoom);
  $: exploredCount = [...$explored].filter((id) => id !== "00").length;

  function go(id: string) { currentRoom.set(id); }
  function prev() { if (idx > 0) go(ids[idx - 1]); }
  function next() { if (idx >= 0 && idx < ids.length - 1) go(ids[idx + 1]); }
</script>

<div class="nav">
  <button on:click={prev} disabled={idx <= 0}>‹ prev</button>
  <button on:click={next} disabled={idx >= ids.length - 1}>next ›</button>
</div>

<div class="cur">
  <div class="big">{$currentRoom}</div>
  <div class="meta">
    <div class="title">{room?.title ?? `Room ${$currentRoom}`}</div>
    <div class="count">{exploredCount} / {ids.length} explored</div>
  </div>
</div>

{#if outs.length}
  <div class="sub">Doors from here</div>
  <div class="doors">
    {#each outs as d}<button class="chip" on:click={() => go(d)}>{d}</button>{/each}
  </div>
{/if}

<style>
  .nav { display: flex; gap: 8px; margin-bottom: 10px; }
  .nav button { flex: 1; background: var(--panel2); color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
  .nav button:hover:not(:disabled) { border-color: var(--mza); }
  .nav button:disabled { opacity: .4; cursor: default; }

  .cur { display: flex; gap: 12px; align-items: center; }
  .big { font-size: 40px; font-weight: 700; color: var(--mza); line-height: 1; }
  .meta { min-width: 0; }
  .title { font-size: 14px; }
  .count { font-size: 12px; color: var(--dim); margin-top: 2px; }

  .sub { font-size: 9.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--mzam);
    margin: 10px 0 6px; }
  .doors { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: var(--panel2); color: var(--mzam); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
  .chip:hover { border-color: var(--mza); }
</style>
