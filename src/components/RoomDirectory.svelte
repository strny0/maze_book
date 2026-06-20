<script lang="ts">
  import { rooms, doors, doorsFrom } from "../lib/stores/content";
  import { currentRoom, explored, markExplored } from "../lib/stores/workspace";
  let view: "grid" | "list" = "grid";
  function go(id: string) { currentRoom.set(id); markExplored(id); }
</script>

<div class="head">
  <span>Room Directory</span>
  <span>
    <button class:active={view === "grid"} on:click={() => (view = "grid")}>Grid</button>
    <button class:active={view === "list"} on:click={() => (view = "list")}>List</button>
  </span>
</div>

{#if view === "grid"}
  <div class="grid">
    {#each $rooms as r}
      <button class="cell" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)}
        on:click={() => go(r.id)}>{r.id}</button>
    {/each}
  </div>
{:else}
  <div class="list">
    {#each $rooms as r}
      <button class="row" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)} on:click={() => go(r.id)}>
        <span>{r.id}</span><span class="d">{doorsFrom($doors, r.id).join(" ")}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .head { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .head button.active { color: var(--mza); }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .cell { padding: 8px 0; background: #161b22; border: 1px solid var(--line); border-radius: 6px;
    color: var(--text); cursor: pointer; }
  .cell.seen { border-color: var(--mza); }
  .cell.cur, .row.cur { background: var(--mza); color: #15110a; }
  .list { display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; justify-content: space-between; padding: 8px; background: #161b22;
    border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer; }
  .row.seen { border-color: var(--mza); }
  .d { color: var(--mzam); font-size: 12px; }
</style>
