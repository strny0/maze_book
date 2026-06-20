<script lang="ts">
  import RoomGraph from "./RoomGraph.svelte";
  import { rooms, doors, doorsFrom } from "../lib/stores/content";
  import { currentRoom, explored } from "../lib/stores/workspace";

  const LS_KEY = "dir-view";
  let view: "grid" | "list" | "graph" = (localStorage.getItem(LS_KEY) as "grid" | "list" | "graph") ?? "grid";
  function setView(v: "grid" | "list" | "graph") { view = v; localStorage.setItem(LS_KEY, v); }
  $: visible = $rooms.filter((r) => r.id !== "00");
  function go(id: string) { currentRoom.set(id); }
</script>

<div class="wrap">
  <div class="head">
    <span class="label">Room Directory</span>
    <span class="toggle">
      <button class:active={view === "grid"} on:click={() => setView("grid")}>Grid</button>
      <button class:active={view === "list"} on:click={() => setView("list")}>List</button>
      <button class:active={view === "graph"} on:click={() => setView("graph")}>Graph</button>
    </span>
  </div>

  {#if view === "graph"}
    <div class="graph-view">
      <RoomGraph />
    </div>
  {:else}
    <div class="scroll-area">
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
            <button class="row" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)}
              on:click={() => go(r.id)}>
              <span>{r.id}</span><span class="d">{doorsFrom($doors, r.id).join(" ")}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .wrap { display: flex; flex-direction: column; height: 100%; min-height: 0; }

  .head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 14px; flex: none; border-bottom: 1px solid var(--line);
  }
  .head .label { margin: 0; }

  .toggle {
    display: inline-flex;
    background: var(--seg-bg); border: 1px solid var(--seg-border);
    border-radius: 7px; overflow: hidden;
  }
  .toggle button {
    background: none; color: var(--seg-idle); border: none;
    padding: 4px 11px; cursor: pointer; font-size: 12px;
    font-family: var(--sc-font); letter-spacing: .03em;
    transition: background .1s, color .1s;
  }
  .toggle button.active {
    background: var(--seg-active-bg); color: var(--seg-active-text); font-weight: 600;
  }

  .scroll-area { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 14px; }
  .graph-view  { flex: 1; min-height: 0; overflow: hidden; }

  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .cell {
    padding: 9px 0; background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    box-shadow: 0 2px 2px rgba(60,40,12,.08), inset 0 1px 0 rgba(255,252,240,.3);
    transition: border-color .12s;
  }
  .cell:hover { border-color: var(--mzam); }
  .cell.seen { border-color: var(--mza); }
  .cell.cur, .row.cur {
    background: var(--seg-active-bg); color: var(--seg-active-text);
    border-color: var(--seg-active-bg); font-weight: 600;
    box-shadow: inset 0 2px 4px rgba(20,12,2,.3);
  }

  .list { display: flex; flex-direction: column; gap: 4px; }
  .row {
    display: flex; justify-content: space-between; padding: 9px 10px;
    background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; cursor: pointer;
    font-family: var(--sc-font); letter-spacing: .03em;
    box-shadow: 0 2px 2px rgba(60,40,12,.08), inset 0 1px 0 rgba(255,252,240,.3);
    transition: border-color .12s;
  }
  .row:hover { border-color: var(--mzam); }
  .row.seen { border-color: var(--mza); }
  .d { color: var(--mzam); font-size: 12px; }
</style>
