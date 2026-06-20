<script lang="ts">
  import { rooms, doors, doorsFrom } from "../lib/stores/content";
  import { currentRoom, explored, markExplored, tags } from "../lib/stores/workspace";
  let view: "grid" | "list" = "grid";
  let filter: string | null = null;
  $: visible = filter ? $rooms.filter((r) => ($tags.byRoom[r.id] ?? []).includes(filter!)) : $rooms;
  function go(id: string) { currentRoom.set(id); markExplored(id); }
</script>

<div class="head">
  <span>Room Directory</span>
  <span>
    <button class:active={view === "grid"} on:click={() => (view = "grid")}>Grid</button>
    <button class:active={view === "list"} on:click={() => (view = "list")}>List</button>
  </span>
</div>

{#if $tags.defs.length > 0}
  <div class="filters">
    <button class:active={filter === null} on:click={() => (filter = null)}>all</button>
    {#each $tags.defs as def}
      <button class="tag-btn" class:active={filter === def.name}
        style={`border-color:${def.color}`}
        on:click={() => (filter = filter === def.name ? null : def.name)}>{def.name}</button>
    {/each}
  </div>
{/if}

{#if view === "grid"}
  <div class="grid">
    {#each visible as r}
      <button class="cell" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)}
        on:click={() => go(r.id)}>{r.id}</button>
    {/each}
  </div>
{:else}
  <div class="list">
    {#each visible as r}
      <button class="row" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)} on:click={() => go(r.id)}>
        <span>{r.id}</span><span class="d">{doorsFrom($doors, r.id).join(" ")}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .head { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .head button.active { color: var(--mza); }
  .filters { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .filters button { background: #1c232d; color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 2px 8px; cursor: pointer; font-size: 12px; }
  .filters button.active { outline: 2px solid var(--mza); }
  .tag-btn { border-width: 2px !important; }
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
