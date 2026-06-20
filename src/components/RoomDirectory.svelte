<script lang="ts">
  import { rooms, doors, doorsFrom } from "../lib/stores/content";
  import { currentRoom, explored } from "../lib/stores/workspace";
  let view: "grid" | "list" = "grid";
  let gridH = 0; // measured natural grid height; list scrolls within it
  $: visible = $rooms.filter((r) => r.id !== "00"); // rooms 01–45 only
  function go(id: string) { currentRoom.set(id); }
</script>

<div class="head">
  <span class="label">Room Directory</span>
  <span class="toggle">
    <button class:active={view === "grid"} on:click={() => (view = "grid")}>Grid</button>
    <button class:active={view === "list"} on:click={() => (view = "list")}>List</button>
  </span>
</div>

{#if view === "grid"}
  <div class="grid" bind:clientHeight={gridH}>
    {#each visible as r}
      <button class="cell" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)}
        on:click={() => go(r.id)}>{r.id}</button>
    {/each}
  </div>
{:else}
  <div class="list" style={gridH ? `max-height:${gridH}px` : ""}>
    {#each visible as r}
      <button class="row" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)} on:click={() => go(r.id)}>
        <span>{r.id}</span><span class="d">{doorsFrom($doors, r.id).join(" ")}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .head .label { margin: 0; }
  .toggle { display: inline-flex; background: var(--bg); border: 1px solid var(--line);
    border-radius: 7px; overflow: hidden; }
  .toggle button { background: none; color: var(--dim); border: none; padding: 4px 12px;
    cursor: pointer; font-size: 12px; }
  .toggle button.active { background: var(--mza); color: var(--mzad); font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .cell { padding: 9px 0; background: var(--panel2); border: 1px solid var(--line); border-radius: 7px;
    color: var(--text); cursor: pointer; font-size: 13px; transition: border-color .15s; }
  .cell:hover { border-color: var(--mzam); }
  .cell.seen { border-color: var(--mza); }
  .cell.cur, .row.cur { background: var(--mza); color: var(--mzad); font-weight: 600; }
  .list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
  .row { display: flex; justify-content: space-between; padding: 9px 10px; background: var(--panel2);
    border: 1px solid var(--line); border-radius: 7px; color: var(--text); cursor: pointer; }
  .row:hover { border-color: var(--mzam); }
  .row.seen { border-color: var(--mza); }
  .d { color: var(--mzam); font-size: 12px; }
</style>
