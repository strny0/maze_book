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
  .nav { display: flex; gap: 8px; margin-bottom: 12px; }
  .nav button {
    flex: 1; background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; padding: 5px 10px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    box-shadow: 0 2px 3px rgba(60,40,12,.1), inset 0 1px 0 rgba(255,252,240,.4);
  }
  .nav button:hover:not(:disabled) { border-color: var(--mzam); }
  .nav button:disabled { opacity: .35; cursor: default; }

  .cur { display: flex; gap: 12px; align-items: center; margin-bottom: 4px; }
  .big { font-family: var(--disp-font); font-size: 44px; color: var(--mza); line-height: 1; }
  .title { font-family: var(--serif-font); font-size: 15px; font-style: italic; }
  .count { font-size: 12px; color: var(--dim); margin-top: 3px; font-family: var(--sc-font); letter-spacing:.03em; }

  .sub {
    font-family: var(--sc-font); font-size: 11px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--mzam);
    margin: 12px 0 6px;
  }
  .doors { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    background: var(--panel2); color: var(--mzam);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; padding: 4px 12px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    box-shadow: 0 2px 2px rgba(60,40,12,.09), inset 0 1px 0 rgba(255,252,240,.35);
  }
  .chip:hover { border-color: var(--mza); color: var(--text); }
</style>
