# Manual Graph Editor Design

**Date:** 2026-06-20  
**Branch:** companion-app

---

## Context

The companion app for Christopher Manson's *The Maze* needs a user-driven map editor to replace the automatic fog-of-war graph. The previous system auto-derived visible rooms from an `explored` set and computed frontier nodes from pre-parsed `doors` data — this proved confusing and didn't match how a solver actually builds a map of the maze. The new system is fully manual: users drag rooms onto a canvas, draw connections by hand, and the graph reflects exactly what they've discovered.

Pre-parsed `doors` data remains available for the room text panel (reference), but plays no role in the graph.

---

## 1. Data Model

### `UserEdge` (updated)

```ts
interface UserEdge {
  a: string;
  b: string;
  aToB: boolean;  // can travel A→B; dot at A filled when true
  bToA: boolean;  // can travel B→A; dot at B filled when true
  // invariant: aToB || bToA (enforced at interaction layer — toggling the last true field deletes the edge)
}
```

`a`/`b` are unordered. The two booleans map directly to the two endpoint toggle dots in the UI and simplify BFS traversal (`edge.aToB` rather than `direction === "aToB" || direction === "both"`). The invariant is enforced behaviourally, not by the type system. Replaces the old `{ from, to, oneWay }` shape.

### `WorkspaceDoc` (updated)

`userEdges: UserEdge[]` stays, referencing the new type. `positions`, `roomWork`, `tags`, `globalNotes` are unchanged. Import migration: old `{ from, to, oneWay }` edges are converted to `{ a: from, b: to, aToB: true, bToA: !oneWay }` at parse time in `exportImport.ts`.

### "On canvas"

A room is on canvas if and only if it has an entry in the `positions` store. `new Set(Object.keys($positions))` gives the canvas room set. No separate `canvasRooms` store.

### `explored` (becomes derived)

Changes from `writable<Set<string>>` to a **derived store** computed by BFS from room `"01"` through `userEdges`, respecting direction:

- `aToB: true` → traversable from `a` to `b`
- `bToA: true` → traversable from `b` to `a`
- Both true → traversable either way

Updates automatically whenever `userEdges` changes. Room `"01"` is always on canvas (pre-placed on first load; cannot be removed). If `"01"` has no edges, `explored = new Set(["01"])`.

### Removed from workspace

- `explored` writable store
- `markExplored()` function
- `computeFrontier` (entire `frontier.ts` module deleted)

`addUserEdge()` stays but accepts the new `UserEdge` type.

---

## 2. Component Architecture

### Files deleted

| File | Reason |
|---|---|
| `src/lib/graph/frontier.ts` + `.test.ts` | frontier auto-computation removed |
| `src/lib/graph/elements.ts` + `.test.ts` | Cytoscape element builder removed |
| `src/lib/graph/layouts.ts` | layout engines removed |
| `src/lib/graph/positions.ts` | canonical positions no longer used |
| `src/components/AddEdgeModal.svelte` | replaced by inline edge drawing |
| `src/cytoscape-ext.d.ts` | Cytoscape type shim removed |

### Package changes

**Remove:** `cytoscape`, `cytoscape-dagre`, `cytoscape-elk`, `cytoscape-fcose`, `cytoscape-cola`, `elkjs`  
**Add:** `@xyflow/svelte`

### Component tree

```
RoomGraph.svelte            ← container; owns edge-draw state, query state
├── GraphQueryBar.svelte    ← find-room / shortest-path inputs and results
├── <SvelteFlow>            ← @xyflow/svelte canvas (nodes, edges, pan, zoom)
│   └── RoomNode.svelte     ← custom node component (room chip)
└── RoomDrawer.svelte       ← horizontal strip of unplaced rooms
```

**`RoomGraph.svelte`** — orchestrates everything. Converts `positions`/`userEdges` stores to Svelte Flow `nodes`/`edges` arrays on mount. Persists positions back on node drag-stop. Holds `drawingEdge: { sourceId: string } | null` state for shift-click edge drawing. Passes query highlight state down to nodes and edges.

**`GraphQueryBar.svelte`** — two interactions: find room (highlight + pan to node) and shortest path (BFS, highlight result). Receives `onHighlight` and `onPath` callbacks from `RoomGraph`. Shows inline status text for results.

**`RoomNode.svelte`** — custom Svelte Flow node. Displays room number. Receives `data` prop with visual state flags (`isCurrent`, `isExplored`, `isQueryHit`). Right-click opens a small inline context menu with "Remove from canvas."

**`RoomDrawer.svelte`** — receives list of rooms not in `positions`. Renders draggable chips. On `dragstart`, sets `dataTransfer` with room ID. Horizontally scrollable.

---

## 3. Key Interactions

### Drag room from drawer to canvas

1. User drags a chip from `RoomDrawer` — `dragstart` writes room ID to `dataTransfer`
2. `RoomGraph` listens for `drop` on the Svelte Flow container div
3. Convert `clientX/clientY` to graph coordinates via Svelte Flow's `screenToFlowPosition()`
4. Add node to `nodes` array at that position; update `positions` store
5. Room disappears from drawer immediately (it's now in `positions`)

Rooms can be placed without being connected to anything — isolated canvas nodes are valid.

### Shift-click to draw an edge

1. Shift-click a placed node → `drawingEdge = { sourceId }`
2. SVG overlay (absolute, `pointer-events: none`) renders a dashed ghost line from source node center to current mouse position, with arrowhead(s) based on current shift state
3. Holding shift during draw → ghost shows arrowheads at both ends (`aToB: true, bToA: true`); releasing shift → single arrowhead at target only (`aToB: true, bToA: false`)
4. **Cancel:** Escape key, right-click anywhere on canvas, or clicking the source node again → `drawingEdge = null`
5. **Confirm:** click any other placed node → creates `UserEdge { a: sourceId, b: targetId, aToB: true, bToA: shiftHeld }`, clears `drawingEdge`

Source node shows a subtle glow ring while draw mode is active.

### Edge endpoint dots to edit direction

On edge hover, two small circular toggle dots appear — one at each endpoint. Each dot represents the outgoing direction FROM that node:

- **Dot at A** (filled = `aToB: true`): can travel A→B
- **Dot at B** (filled = `bToA: true`): can travel B→A

Clicking a dot toggles its boolean. If the click would set both to `false` (last active direction), the edge is deleted instead. The dot turns red on hover when clicking it would trigger deletion, as a visual warning.

### Remove node from canvas

Right-click a node → inline context menu with "Remove from canvas." Confirms immediately (no dialog). Removes node from `nodes`, deletes its entry from `positions`, removes all `userEdges` where `a === id || b === id`.

Room `"01"` cannot be removed.

### Navigate to room

Plain click (no shift) on any canvas node → `currentRoom.set(id)`. No effect on canvas or edge state.

### Query: find room

Type room ID in query bar → pan canvas to that node, apply `isQueryHit` highlight. Clear button removes highlight.

### Query: shortest path A → B

BFS from A on `userEdges` respecting direction. If path found: highlight all nodes and edges on the path. If not found: show "No path found" inline. Clear button removes highlights.

---

## 4. Visual Design

### Node states

| State | Fill | Border | Opacity | Label color |
|---|---|---|---|---|
| Current room | `#e2a857` | none | 100% | `#15110a` |
| Explored (reachable from 01) | `#3a4756` | 2px `#e2a857` | 100% | light |
| On canvas, unreachable | `#3a4756` | 1px `#4a5a6a` dashed | 60% | dim |
| Query highlight | `#3a4756` | animated pulse ring `#e2a857` | 100% | light |

Nodes are 28×28px rounded squares, room number centered, 9px font.

### Edge states

All user edges are amber `#e2a857`, 1.5px. Arrowheads appear at endpoints where the corresponding boolean is true (`aToB` → arrowhead at B, `bToA` → arrowhead at A), using Svelte Flow `markerStart`/`markerEnd` SVG markers.

On hover, two small circular dots (~6px) appear at each endpoint — filled `#e2a857` if that direction is active, hollow/dim if inactive.

| State | Style |
|---|---|
| Normal | amber `#e2a857`, 1.5px |
| Query path | white `#ffffff`, 2.5px |
| Dot (direction active) | filled `#e2a857` |
| Dot (direction inactive) | hollow, `#4a5a6a` |
| Dot hover (would delete edge) | red `#e05050` |

### Ghost edge

Dashed amber line, SVG overlay, `pointer-events: none`. Arrowhead(s) update live with shift key state. Source node glows while draw mode is active.

### Room drawer

Horizontal scrollable strip, ~48px tall, pinned to bottom of graph panel. Chips: 24×24px rounded squares, `#3a4756` fill, `--line` border, room number, `cursor: grab`. Separator line at top of drawer from graph canvas.

### Query bar

Slim bar above the canvas:
```
[Find: ______  Go]    [Path: ___ → ___  Find]    [Clear]
```
Inline status text for results (`"Path: 01 → 20 → 37"` / `"No path found"`).

---

## 5. Files to Create / Modify

| File | Change |
|---|---|
| `src/lib/types.ts` | Update `UserEdge` interface |
| `src/lib/db/idb.ts` | `WorkspaceDoc.userEdges` references new type |
| `src/lib/stores/workspace.ts` | Remove `explored` writable + `markExplored`; add `explored` derived |
| `src/lib/db/exportImport.ts` | Migrate old `oneWay` edge format on parse |
| `src/components/RoomGraph.svelte` | Full rewrite — orchestrator |
| `src/components/GraphQueryBar.svelte` | New component |
| `src/components/RoomNode.svelte` | New custom Svelte Flow node |
| `src/components/RoomDrawer.svelte` | New drawer component |
| `package.json` | Remove Cytoscape packages, add `@xyflow/svelte` |
| Delete (6 files) | See Section 2 |
