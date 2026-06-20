<script lang="ts">
  import { writable } from "svelte/store";
  import { SvelteFlow, Background, Controls, type Node, type Edge } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import RoomNode from "./RoomNode.svelte";
  import DirectedEdge from "./DirectedEdge.svelte";
  import RoomDrawer from "./RoomDrawer.svelte";
  import GraphQueryBar from "./GraphQueryBar.svelte";
  import { rooms } from "../lib/stores/content";
  import {
    currentRoom, explored, positions, userEdges,
    removeUserEdgesForNode,
  } from "../lib/stores/workspace";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes: any = { room: RoomNode };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeTypes: any = { user: DirectedEdge };

  // Query highlight state (extended in Task 7)
  let queryHighlight = new Set<string>();
  let pathEdgeHighlight = new Set<string>();

  // sfNodes and sfEdges are writable stores owned by SvelteFlow.
  // We initialise from workspace, then SvelteFlow mutates positions during drag.
  // We sync data-only updates (isCurrent, isExplored, etc.) by merging into existing nodes.
  const sfNodes = writable<Node[]>([]);
  const sfEdges = writable<Edge[]>([]);

  // Initialise sfNodes from positions on first reactive run
  let initialised = false;
  $: if (!initialised && Object.keys($positions).length > 0) {
    initialised = true;
    sfNodes.set(buildNodes($positions, $currentRoom, $explored, queryHighlight, null));
  }

  // When workspace data changes, update node DATA without clobbering SvelteFlow's positions
  $: syncNodeData($currentRoom, $explored, queryHighlight, drawingEdge?.sourceId ?? null);
  $: syncEdges($userEdges, pathEdgeHighlight);

  function buildNodes(
    pos: Record<string, { x: number; y: number }>,
    cur: string,
    exp: Set<string>,
    qh: Set<string>,
    drawSrc: string | null
  ): Node[] {
    return Object.entries(pos).map(([id, p]) => ({
      id,
      type: "room",
      position: { x: p.x, y: p.y },
      data: makeData(id, cur, exp, qh, drawSrc),
    }));
  }

  function makeData(id: string, cur: string, exp: Set<string>, qh: Set<string>, drawSrc: string | null) {
    return {
      roomId: id,
      isCurrent: id === cur,
      isExplored: exp.has(id),
      isQueryHit: qh.has(id),
      isDrawSource: id === drawSrc,
      onRemove: () => removeNode(id),
    };
  }

  function syncNodeData(cur: string, exp: Set<string>, qh: Set<string>, drawSrc: string | null) {
    sfNodes.update(nodes => {
      const posNow = $positions;
      const existing = new Set(nodes.map(n => n.id));
      // Add new nodes (from positions) that SvelteFlow doesn't know about yet
      const newIds = Object.keys(posNow).filter(id => !existing.has(id));
      const added = newIds.map(id => ({
        id, type: "room",
        position: { x: posNow[id].x, y: posNow[id].y },
        data: makeData(id, cur, exp, qh, drawSrc),
      }));
      // Remove nodes that are no longer in positions
      const filtered = nodes.filter(n => posNow[n.id]);
      // Update data on existing nodes (preserve SvelteFlow's position)
      const updated = filtered.map(n => ({ ...n, data: makeData(n.id, cur, exp, qh, drawSrc) }));
      return [...updated, ...added];
    });
  }

  function toggleEdge(a: string, b: string, field: 'aToB' | 'bToA') {
    userEdges.update(es => {
      const idx = es.findIndex(e => e.a === a && e.b === b);
      if (idx < 0) return es;
      const e = es[idx];
      const newVal = !e[field];
      const otherField = field === 'aToB' ? 'bToA' : 'aToB';
      if (!newVal && !e[otherField]) return es.filter((_, i) => i !== idx);
      return es.map((edge, i) => i === idx ? { ...edge, [field]: newVal } : edge);
    });
  }

  function syncEdges(ue: typeof $userEdges, peh: Set<string>) {
    sfEdges.set(ue.map((e) => {
      const id = `${e.a}--${e.b}`;
      return {
        id,
        source: e.a,
        target: e.b,
        type: "user",
        data: {
          aToB: e.aToB,
          bToA: e.bToA,
          isPath: peh.has(id),
          onToggleAToB: () => toggleEdge(e.a, e.b, 'aToB'),
          onToggleBToA: () => toggleEdge(e.a, e.b, 'bToA'),
        },
      };
    }));
  }

  // ── Drag-to-canvas ──────────────────────────────────────────────────────────
  let flowWrapper: HTMLDivElement;

  function screenToGraph(clientX: number, clientY: number) {
    const viewport = flowWrapper?.querySelector(".svelte-flow__viewport") as HTMLElement | null;
    if (!viewport) return { x: clientX, y: clientY };
    const rect = flowWrapper.getBoundingClientRect();
    const t = viewport.style.transform;
    const m = t.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/);
    const tx = m ? parseFloat(m[1]) : 0;
    const ty = m ? parseFloat(m[2]) : 0;
    const scale = m ? parseFloat(m[3]) : 1;
    return { x: (clientX - rect.left - tx) / scale, y: (clientY - rect.top - ty) / scale };
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const roomId = e.dataTransfer?.getData("text/plain");
    if (!roomId || $positions[roomId]) return;
    const pos = screenToGraph(e.clientX, e.clientY);
    positions.update(p => ({ ...p, [roomId]: pos }));
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); }

  // ── Node events ─────────────────────────────────────────────────────────────

  // drawingEdge state — extended in Task 5
  let drawingEdge: { sourceId: string; sourceX: number; sourceY: number } | null = null;
  let mouseX = 0;
  let mouseY = 0;
  let shiftHeld = false;

  function onMouseMove(e: MouseEvent) { mouseX = e.clientX; mouseY = e.clientY; }

  function onNodeClick(e: CustomEvent) {
    const { node, event } = e.detail;

    if (drawingEdge) {
      if (node.id === drawingEdge.sourceId) {
        // click on source = cancel
        drawingEdge = null;
        return;
      }
      // any click on a different node = confirm edge (shift determines bToA)
      userEdges.update(es => {
        const alreadyExists = es.some(
          edge => (edge.a === drawingEdge!.sourceId && edge.b === node.id) ||
                  (edge.a === node.id && edge.b === drawingEdge!.sourceId)
        );
        if (alreadyExists) return es;
        return [...es, { a: drawingEdge!.sourceId, b: node.id, aToB: true, bToA: event?.shiftKey ?? false }];
      });
      drawingEdge = null;
      return;
    }

    // Not drawing — plain click navigates, shift-click starts draw
    if (event?.shiftKey) {
      startDrawing(node.id);
    } else {
      currentRoom.set(node.id);
    }
  }

  function startDrawing(nodeId: string) {
    const el = flowWrapper?.querySelector(`[data-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drawingEdge = { sourceId: nodeId, sourceX: rect.left + rect.width / 2, sourceY: rect.top + rect.height / 2 };
  }

  function onNodeDragStop(e: CustomEvent) {
    const { node } = e.detail;
    positions.update(p => ({ ...p, [node.id]: { x: node.position.x, y: node.position.y } }));
  }

  function removeNode(id: string) {
    if (id === "01") return;
    positions.update(p => { const n = { ...p }; delete n[id]; return n; });
    removeUserEdgesForNode(id);
  }

  // ── Derived display values ───────────────────────────────────────────────────
  $: canvasIds = new Set(Object.keys($positions));
  $: unplacedRooms = $rooms.map(r => r.id).filter(id => !canvasIds.has(id)).sort();
</script>

<svelte:window
  on:mousemove={onMouseMove}
  on:keydown={(e) => { if (e.key === "Escape") drawingEdge = null; shiftHeld = e.shiftKey; }}
  on:keyup={(e) => { shiftHeld = e.shiftKey; }}
/>

<div class="graph-root">
  <GraphQueryBar
    userEdges={$userEdges}
    {canvasIds}
    on:highlight={(e) => { queryHighlight = e.detail; syncNodeData($currentRoom, $explored, queryHighlight, drawingEdge?.sourceId ?? null); }}
    on:pathEdges={(e) => { pathEdgeHighlight = e.detail; syncEdges($userEdges, pathEdgeHighlight); }}
    on:clear={() => { queryHighlight = new Set(); pathEdgeHighlight = new Set(); syncNodeData($currentRoom, $explored, queryHighlight, drawingEdge?.sourceId ?? null); syncEdges($userEdges, pathEdgeHighlight); }}
  />
  <div
    class="flow-wrap"
    bind:this={flowWrapper}
    on:drop={onDrop}
    on:dragover={onDragOver}
    on:contextmenu|preventDefault={() => { if (drawingEdge) drawingEdge = null; }}
  >
    <svg width="0" height="0" style="position:absolute;pointer-events:none">
      <defs>
        <marker id="arr-fwd"  markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#e2a857" />
        </marker>
        <marker id="arr-back" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#e2a857" />
        </marker>
      </defs>
    </svg>
    <SvelteFlow
      nodes={sfNodes}
      edges={sfEdges}
      {nodeTypes}
      {edgeTypes}
      fitView
      on:nodeclick={onNodeClick}
      on:nodedragstop={onNodeDragStop}
    >
      <Background />
      <Controls />
    </SvelteFlow>
    {#if drawingEdge}
      {@const dx = mouseX - drawingEdge.sourceX}
      {@const dy = mouseY - drawingEdge.sourceY}
      {@const len = Math.sqrt(dx * dx + dy * dy) || 1}
      {@const tipX = mouseX - (dx / len) * 10}
      {@const tipY = mouseY - (dy / len) * 10}
      <svg class="ghost-svg">
        <defs>
          <marker id="ga-fwd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#e2a857" opacity="0.85" />
          </marker>
          {#if shiftHeld}
            <marker id="ga-back" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 Z" fill="#e2a857" opacity="0.85" />
            </marker>
          {/if}
        </defs>
        <line
          x1={drawingEdge.sourceX} y1={drawingEdge.sourceY}
          x2={tipX} y2={tipY}
          stroke="#e2a857" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.75"
          marker-end="url(#ga-fwd)"
          marker-start={shiftHeld ? "url(#ga-back)" : undefined}
        />
      </svg>
    {/if}
  </div>
  <RoomDrawer {unplacedRooms} />
</div>

<style>
  .graph-root { display: flex; flex-direction: column; width: 100%; height: 100%; }
  .flow-wrap  { flex: 1; min-height: 0; position: relative; }

  :global(.svelte-flow__node) { padding: 0; border: none; background: none; box-shadow: none; }

  .ghost-svg {
    position: fixed; inset: 0; width: 100vw; height: 100vh;
    pointer-events: none; z-index: 9999;
  }
</style>
