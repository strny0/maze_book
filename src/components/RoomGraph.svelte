<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import cytoscape, { type Core } from "cytoscape";
  import fcose from "cytoscape-fcose";
  import cola from "cytoscape-cola";
  import dagre from "cytoscape-dagre";
  import elk from "cytoscape-elk";
  import { buildElements } from "../lib/graph/elements";
  import { computeFrontier } from "../lib/graph/frontier";
  import { LAYOUT_NAMES, runLayout, type LayoutName } from "../lib/graph/layouts";
  import { rooms, doors } from "../lib/stores/content";
  import { currentRoom, explored, positions, userEdges, markExplored } from "../lib/stores/workspace";
  import AddEdgeModal from "./AddEdgeModal.svelte";
  import { get } from "svelte/store";

  cytoscape.use(fcose);
  cytoscape.use(cola);
  cytoscape.use(dagre);
  cytoscape.use(elk);

  let host: HTMLDivElement;
  let cy: Core;
  let layout: LayoutName = "dagre-LR";
  let modalOpen = false;

  const style = [
    {
      selector: "node",
      style: {
        "background-color": "#3a4756", label: "data(label)",
        color: "#cbd3dd", "font-size": 9, "text-valign": "center", "text-halign": "center",
        width: 22, height: 22,
      },
    },
    { selector: "node.explored", style: { "border-width": 2, "border-color": "#e2a857" } },
    { selector: "node.current", style: { "background-color": "#e2a857", color: "#15110a" } },
    {
      selector: "node.frontier",
      style: {
        "border-width": 2, "border-color": "#4a5a6a", "border-style": "dashed", opacity: 0.6,
      },
    },
    { selector: "edge", style: { width: 1, "line-color": "#33404f", "curve-style": "bezier" } },
    {
      selector: "edge.oneway",
      style: {
        "line-color": "#4ec3e0", "target-arrow-shape": "triangle", "target-arrow-color": "#4ec3e0",
      },
    },
    { selector: "edge.user", style: { "line-color": "#e2a857", width: 1.5 } },
    {
      selector: "edge.user-oneway",
      style: { "target-arrow-shape": "triangle", "target-arrow-color": "#e2a857" },
    },
  ];

  onMount(() => {
    const frontier = computeFrontier($explored, $doors, $userEdges);
    cy = cytoscape({
      container: host,
      elements: buildElements(
        $rooms, $doors, $userEdges, $currentRoom,
        $explored, frontier, get(positions), false
      ),
      style: style as any,
      layout: { name: "preset" },
    });
    cy.fit(undefined, 30);
    cy.on("tap", "node", (e) => {
      const id: string = e.target.id();
      markExplored(id);
      currentRoom.set(id);
    });
    cy.on("dragfree", "node", (e) => {
      const p = e.target.position();
      positions.update((m) => ({ ...m, [e.target.id()]: { x: p.x, y: p.y } }));
    });
  });
  onDestroy(() => cy?.destroy());

  // Reactive sync: runs whenever explored, userEdges, or currentRoom changes
  $: if (cy) syncGraph($explored, $userEdges, $currentRoom);

  function syncGraph(exp: Set<string>, ue: typeof $userEdges, cur: string) {
    const frontier = computeFrontier(exp, $doors, ue);
    const visible = new Set([...exp, ...frontier]);

    // Existing node/edge IDs in the graph
    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));

    // Add new nodes
    const pos = get(positions);
    const newIds = [...visible].filter((id) => !existingNodeIds.has(id));
    for (const id of newIds) {
      const p = pos[id] ?? computeIncrementalPosition(id, ue, pos);
      cy.add({ data: { id, label: id }, position: { x: p.x, y: p.y } });
      if (!pos[id]) positions.update((m) => ({ ...m, [id]: p }));
    }

    // Add new edges (use original array index for stable IDs)
    $doors.forEach((d, i) => {
      const id = `d${i}`;
      if (existingEdgeIds.has(id)) return;
      if (!visible.has(d.from) || !visible.has(d.to)) return;
      cy.add({ data: { id, source: d.from, target: d.to }, classes: d.oneWay ? "oneway" : "" });
    });
    ue.forEach((e, i) => {
      const id = `u${i}`;
      if (existingEdgeIds.has(id)) return;
      if (!visible.has(e.from) || !visible.has(e.to)) return;
      cy.add({
        data: { id, source: e.from, target: e.to },
        classes: ["user", e.oneWay ? "user-oneway" : ""].filter(Boolean).join(" "),
      });
    });

    // Update classes
    cy.nodes().forEach((n) => {
      const id = n.id();
      n.removeClass("current explored frontier");
      if (id === cur) n.addClass("current");
      else if (exp.has(id)) n.addClass("explored");
      else n.addClass("frontier");
    });
  }

  function computeIncrementalPosition(
    id: string,
    ue: typeof $userEdges,
    pos: Record<string, { x: number; y: number }>
  ): { x: number; y: number } {
    // Find the closest neighbor that already has a position
    const allConns = [
      ...$doors.map((d) => ({ a: d.from, b: d.to })),
      ...ue.map((e) => ({ a: e.from, b: e.to })),
    ];
    const conn = allConns.find((c) => (c.a === id && pos[c.b]) || (c.b === id && pos[c.a]));
    const sourcePos = conn ? (pos[conn.a === id ? conn.b : conn.a]) : { x: 60, y: 150 };
    const xTarget = sourcePos.x + 160;
    // Stagger y within the column
    const takenY = Object.values(pos)
      .filter((p) => Math.abs(p.x - xTarget) < 20)
      .map((p) => p.y);
    const y = takenY.length === 0 ? sourcePos.y : Math.max(...takenY) + 40;
    return { x: xTarget, y };
  }

  function runAndFit() {
    if (!cy) return;
    cy.resize();
    cy.one("layoutstop", () => {
      // Save all positions after a re-flow so they persist
      const newPos: Record<string, { x: number; y: number }> = {};
      cy.nodes().forEach((n) => { newPos[n.id()] = { ...n.position() }; });
      positions.set(newPos);
      cy.fit(undefined, 30);
    });
    runLayout(cy, layout);
  }

  function fit() { cy?.fit(undefined, 30); }

  function devLoadAll() {
    if (!cy) return;
    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
    const pos = get(positions);

    // Add all rooms not yet in graph
    for (const r of $rooms) {
      if (!existingNodeIds.has(r.id)) {
        const p = pos[r.id] ?? computeIncrementalPosition(r.id, $userEdges, get(positions));
        cy.add({ data: { id: r.id, label: r.id }, classes: "frontier", position: { x: p.x, y: p.y } });
        if (!pos[r.id]) positions.update((m) => ({ ...m, [r.id]: p }));
      }
    }
    // Add all obvious edges not yet in graph
    $doors.forEach((d, i) => {
      const id = `d${i}`;
      if (!existingEdgeIds.has(id)) {
        cy.add({ data: { id, source: d.from, target: d.to }, classes: d.oneWay ? "oneway" : "" });
      }
    });
    runAndFit();
  }
</script>

<div class="bar">
  <label>Layout
    <select bind:value={layout}>
      {#each LAYOUT_NAMES as n}<option value={n}>{n}</option>{/each}
    </select>
  </label>
  <button on:click={runAndFit}>Re-flow</button>
  <button on:click={fit}>Fit</button>
  <button on:click={() => (modalOpen = true)}>Add Edge</button>
  <button on:click={devLoadAll}>Dev: load all</button>
</div>
<div class="host" bind:this={host}></div>

<AddEdgeModal bind:open={modalOpen} currentRoom={$currentRoom} />

<style>
  .bar { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex: none; flex-wrap: wrap; }
  .host { width: 100%; flex: 1; min-height: 0; }
</style>
