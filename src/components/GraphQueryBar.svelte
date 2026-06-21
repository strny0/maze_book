<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { shortestPath } from "../lib/graph/shortestPath";
  import type { UserEdge } from "../lib/types";

  export let userEdges: UserEdge[] = [];
  export let canvasIds: Set<string> = new Set();

  const dispatch = createEventDispatcher<{
    highlight: Set<string>;
    pathEdges: Set<string>;
    clear: void;
  }>();

  let findInput = "";
  let pathFrom = "";
  let pathTo = "";
  let status = "";

  function onFind() {
    const id = findInput.trim();
    if (!id) return;
    if (!canvasIds.has(id)) { status = `Room ${id} is not on canvas`; return; }
    status = "";
    dispatch("highlight", new Set<string>([id]));
    dispatch("pathEdges", new Set<string>());
  }

  function onPath() {
    const from = pathFrom.trim();
    const to = pathTo.trim();
    if (!canvasIds.has(from) || !canvasIds.has(to)) {
      status = "Both rooms must be on canvas"; return;
    }
    const path = shortestPath(userEdges, from, to);
    if (!path) { status = `No path: ${from} → ${to}`; return; }
    status = `Path: ${path.join(" → ")}`;
    dispatch("highlight", new Set(path));
    // identify edge IDs along the path — stable format is ${e.a}--${e.b}
    const edgeIds = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const cur = path[i], nxt = path[i + 1];
      userEdges.forEach((e) => {
        if ((e.a === cur && e.b === nxt && e.aToB) || (e.b === cur && e.a === nxt && e.bToA))
          edgeIds.add(`${e.a}--${e.b}`);
      });
    }
    dispatch("pathEdges", edgeIds);
  }

  function onClear() {
    findInput = ""; pathFrom = ""; pathTo = ""; status = "";
    dispatch("clear");
  }
</script>

<div class="bar">
  <span class="group">
    <label>Find<input bind:value={findInput} maxlength="2" placeholder="01" /></label>
    <button on:click={onFind}>Go</button>
  </span>
  <span class="divider">|</span>
  <span class="group">
    <label>Path
      <input bind:value={pathFrom} maxlength="2" placeholder="01" />
    </label>
    <span class="arr">→</span>
    <input bind:value={pathTo} maxlength="2" placeholder="45" />
    <button on:click={onPath}>Find</button>
  </span>
  <button class="clr" on:click={onClear}>Clear</button>
  {#if status}<span class="status">{status}</span>{/if}
</div>

<style>
  .bar {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    padding: 4px 10px; border-bottom: 1px solid var(--line);
    flex: none; background: var(--panel); font-size: 11px;
  }
  .group { display: flex; align-items: center; gap: 5px; }
  .divider { color: var(--line); padding: 0 2px; }
  .arr { color: var(--dim); }
  label { color: var(--dim); display: flex; align-items: center; gap: 4px; }
  input {
    width: 34px; background: var(--panel2); border: 1px solid var(--line);
    border-radius: 4px; padding: 3px 5px; color: var(--text);
    font-size: 11px; font-family: inherit;
  }
  button {
    background: var(--panel2); border: 1px solid var(--line); border-radius: 4px;
    padding: 3px 8px; color: var(--text); font-size: 11px; cursor: pointer;
  }
  button:hover { border-color: var(--mza); }
  button.clr { color: var(--dim); }
  .status { color: var(--mza); }
</style>
