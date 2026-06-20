<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import cytoscape, { type Core } from "cytoscape";
  import fcose from "cytoscape-fcose";
  import cola from "cytoscape-cola";
  import dagre from "cytoscape-dagre";
  import { buildElements } from "../lib/graph/elements";
  import { LAYOUT_NAMES, runLayout, type LayoutName } from "../lib/graph/layouts";
  import { rooms, doors } from "../lib/stores/content";
  import { currentRoom, explored, positions } from "../lib/stores/workspace";
  import { get } from "svelte/store";

  cytoscape.use(fcose); cytoscape.use(cola); cytoscape.use(dagre);

  let host: HTMLDivElement;
  let cy: Core;
  let layout: LayoutName = "fcose";

  const style = [
    { selector: "node", style: { "background-color": "#3a4756", label: "data(label)",
      color: "#cbd3dd", "font-size": 9, "text-valign": "center", "text-halign": "center", width: 22, height: 22 } },
    { selector: "node.explored", style: { "border-width": 2, "border-color": "#e2a857" } },
    { selector: "node.current", style: { "background-color": "#e2a857", color: "#15110a" } },
    { selector: "edge", style: { width: 1, "line-color": "#33404f", "curve-style": "bezier" } },
    { selector: "edge.oneway", style: { "line-color": "#4ec3e0", "target-arrow-shape": "triangle",
      "target-arrow-color": "#4ec3e0" } },
  ];

  onMount(() => {
    cy = cytoscape({
      container: host,
      elements: buildElements($rooms, $doors, $currentRoom, $explored, get(positions)),
      style: style as any,
      layout: { name: "preset" },
    });
    runLayout(cy, layout);
    cy.on("tap", "node", (e) => currentRoom.set(e.target.id()));
    cy.on("dragfree", "node", (e) => {
      const p = e.target.position();
      positions.update((m) => ({ ...m, [e.target.id()]: { x: p.x, y: p.y } }));
    });
  });
  onDestroy(() => cy?.destroy());

  // reflect current-room highlight without rebuilding the whole graph
  $: if (cy) {
    cy.nodes().removeClass("current explored");
    cy.nodes().forEach((n) => { if ($explored.has(n.id())) n.addClass("explored"); });
    cy.getElementById($currentRoom).addClass("current");
  }

  function reflow() { if (cy) runLayout(cy, layout); }
  function fit() { cy?.fit(undefined, 30); }
  function onLayoutChange() { runLayout(cy, layout); }
</script>

<div class="bar">
  <label>Layout
    <select bind:value={layout} on:change={onLayoutChange}>
      {#each LAYOUT_NAMES as n}<option value={n}>{n}</option>{/each}
    </select>
  </label>
  <button on:click={reflow}>Re-flow</button>
  <button on:click={fit}>Fit</button>
</div>
<div class="host" bind:this={host}></div>

<style>
  .bar { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
  .host { width: 100%; height: calc(60vh - 70px); }
</style>
