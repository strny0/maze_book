# Graph Feature Design

**Date:** 2026-06-20  
**Branch:** companion-app

---

## Context

The companion app for Christopher Manson's *The Maze* needs a graph that reflects the player's actual progress through the book — starting at room 01, discovering rooms one at a time, and occasionally finding secret connections. The current `RoomGraph` renders all 45 rooms and all edges immediately, which gives away the structure and makes the layout hard to evaluate. This spec replaces that with a fog-of-war graph, better layout options, and a manual edge-add feature for secret connections.

---

## 1. Data Model

### Existing stores (unchanged shape)

- **`explored: Set<string>`** — rooms the player has visited. Already persisted in WorkspaceDoc.
- **`positions: Record<string, {x,y}>`** — saved manual drag positions per room. Already persisted.
- **`doors: Door[]`** (content store) — obvious connections parsed from `maze.txt`. Source of truth for non-secret edges.

### New: `userEdges`

Added to `WorkspaceDoc` and the workspace store:

```ts
interface UserEdge { from: string; to: string; oneWay: boolean }
```

Persisted as `userEdges: UserEdge[]` in the workspace document (alongside `explored`, `positions`, etc.). Represents secret or player-discovered connections. Default: `[]`.

### Derived: `frontier`

Not stored. Computed on every render from `explored` + `doors` + `userEdges`:

> A room is **frontier** if it is reachable from any explored room via at least one obvious door or user-added edge, and has not itself been explored.

Frontier rooms appear in the graph as navigable but unvisited nodes.

---

## 2. Graph Visibility

### Node tiers

| Tier | Condition | Appearance |
|---|---|---|
| Current | `id === currentRoom` | Gold fill, dark label |
| Explored | `explored.has(id)` | Dark fill, gold border |
| Frontier | reachable from explored, not yet visited | Dark fill, dashed border, dimmed label |

Only nodes in one of these three tiers are rendered. All other rooms are hidden.

### Edge tiers

| Tier | Condition | Appearance |
|---|---|---|
| Obvious two-way | `Door` with `oneWay: false`, both endpoints visible | Solid grey |
| Obvious one-way | `Door` with `oneWay: true`, both endpoints visible | Solid blue, arrow |
| User two-way | `UserEdge` with `oneWay: false`, both endpoints visible | Orange, no arrow |
| User one-way | `UserEdge` with `oneWay: true`, both endpoints visible | Orange, arrow |

An edge is only rendered if both its endpoints are visible (explored or frontier).

### Dev button

A **"Dev: load all"** button in the graph toolbar sets a local `devMode: boolean` flag in the `RoomGraph` component. When true, `buildElements` receives all 45 rooms and all obvious edges regardless of `explored`/frontier state. This flag lives only in component state — it does not touch the `explored` store and resets to false on page reload. Intended for layout engine comparison only.

---

## 3. Layout Engine

### Toolbar

```
Layout [dagre-LR ▾]  [Re-flow]  [Fit]  [Add Edge]  [Dev: load all]
```

### Layout options

The existing `LAYOUT_NAMES` array expands to include:

| Name | Engine | Notes |
|---|---|---|
| `dagre-LR` | cytoscape-dagre | `rankDir: "LR"`, room 01 rank 0, room 45 rank sink |
| `elk-layered` | cytoscape-elk + elkjs | Sugiyama algorithm, best crossing minimisation |
| `fcose` | cytoscape-fcose | Existing force-directed |
| `cola` | cytoscape-cola | Existing force-directed |
| `concentric` | built-in | Existing |
| `circle` | built-in | Existing |

`elk-layered` is a new dependency: `elkjs` + `cytoscape-elk`.

### Incremental placement

When a frontier node first appears in the graph and has no saved position in `positions`:

1. Find the explored source node it was discovered from (the door's other endpoint).
2. Place the new node at `x = source.x + 160`, `y = source.y + (siblingIndex - siblingCount/2) * 40`, where siblings are other frontier nodes with the same source.
3. Save this position to `positions` so it persists across sessions.

**Re-flow** runs the selected layout engine across all currently visible nodes, overwriting all saved positions.

### Pinning for dagre-LR and elk-layered

- Room `01` gets `rank: "source"` / `elk.position.x: 0` constraint.
- Room `45` gets `rank: "sink"` / high `elk.position.x` constraint.
- These constraints apply only during full Re-flow, not incremental placement.

---

## 4. Interaction

### Navigation

Clicking any node (explored or frontier) sets `currentRoom` to that room's ID. If the node was frontier, it is immediately moved to `explored`.

### Add Edge modal

Triggered by the **"Add Edge"** button in the toolbar. A centered modal overlay with a dark scrim:

```
┌─────────────────────────────┐
│  Add Connection             │
│                             │
│  From  [____]  To  [____]  │
│                             │
│  ○ → One-way               │
│  ○ ↔ Two-way               │
│                             │
│         [Cancel]  [Add]     │
└─────────────────────────────┘
```

- **From** pre-fills with `currentRoom`.
- Both fields accept room IDs (`01`–`45`). Validated against the 45-room content list on submit.
- On **Add**: appends to `userEdges`, triggers incremental placement for any newly visible rooms, closes modal.
- Uses a `<dialog>` element for accessibility.

---

## 5. Persistence

`WorkspaceDoc` gains one new field:

```ts
interface WorkspaceDoc {
  rooms: Record<string, RoomWork>;
  explored: string[];
  tags: TagState;
  positions: Record<string, { x: number; y: number }>;
  globalNotes: string;
  userEdges: UserEdge[];   // NEW — default []
}
```

All existing export/import logic passes through `serializeWorkspace` / `parseWorkspace` in `exportImport.ts` — both need updating to include `userEdges`.

---

## 6. Files to Create / Modify

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `UserEdge` interface |
| `src/lib/db/idb.ts` | Add `userEdges` to `WorkspaceDoc` |
| `src/lib/stores/workspace.ts` | Add `userEdges` store + helpers |
| `src/lib/db/exportImport.ts` | Include `userEdges` in serialize/parse |
| `src/lib/graph/elements.ts` | Rewrite: frontier logic, edge tiers, dev mode |
| `src/lib/graph/layouts.ts` | Add `dagre-LR` config + ELK layout |
| `src/components/RoomGraph.svelte` | Toolbar, incremental placement, re-flow, dev button |
| `src/components/AddEdgeModal.svelte` | New modal component |
| `package.json` | Add `elkjs`, `cytoscape-elk` |
