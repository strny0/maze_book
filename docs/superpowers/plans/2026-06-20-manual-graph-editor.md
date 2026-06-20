# Manual Graph Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the automatic fog-of-war Cytoscape graph with a fully manual Svelte Flow graph editor where users drag rooms onto a canvas, draw connections by shift-clicking, and edit edge directions via endpoint toggle dots.

**Architecture:** `@xyflow/svelte` (Svelte 4 compatible v0.x) replaces all Cytoscape packages. `UserEdge` becomes `{ a, b, aToB, bToA }`. `explored` becomes a derived store (BFS from `"01"` through `userEdges`). Four new/rewritten components: `RoomNode`, `RoomDrawer`, `DirectedEdge`, `GraphQueryBar`, and a rewritten `RoomGraph`.

**Tech Stack:** Svelte 4, `@xyflow/svelte@0.x`, Vitest (unit), Playwright (browser verify)

## Global Constraints

- Test command: `npm run test` (vitest run)
- Type check: `npm run check` (svelte-check)
- Node IDs are zero-padded two-digit strings: `"01"`, `"17"`, `"45"`
- Surgical changes only — touch only files listed in the task
- CSS variables: `--mza` (`#e2a857` gold), `--panel`, `--panel2`, `--line`, `--text`, `--dim`, `--bg`
- Room `"01"` is always on canvas and cannot be removed
- Use `@xyflow/svelte` Svelte 4 compatible version: before installing, run `npm info @xyflow/svelte versions --json` and pick the highest version that starts with `0.` (e.g. `0.0.44`). If no `0.x` exists, check peer deps of latest version — if it requires Svelte 5, the project must be upgraded to Svelte 5 first (update `svelte` in package.json to `^5.0.0` and fix rune syntax in all existing `.svelte` files). Ask the user before doing a Svelte 5 upgrade.
- Spec: `docs/superpowers/specs/2026-06-20-manual-graph-editor-design.md`

---

### Task 1: Data layer — `UserEdge` type, workspace store, migration, dead code removal, package swap

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/idb.ts`
- Modify: `src/lib/stores/workspace.ts`
- Modify: `src/lib/stores/workspace.test.ts`
- Modify: `src/lib/db/exportImport.ts`
- Modify: `src/lib/db/exportImport.test.ts`
- Delete: `src/lib/graph/frontier.ts`, `src/lib/graph/frontier.test.ts`, `src/lib/graph/elements.ts`, `src/lib/graph/elements.test.ts`, `src/lib/graph/layouts.ts`, `src/lib/graph/positions.ts`
- Delete: `src/components/AddEdgeModal.svelte`, `src/cytoscape-ext.d.ts`
- Modify: `package.json` (via npm)

**Interfaces:**
- Produces: `UserEdge { a: string; b: string; aToB: boolean; bToA: boolean }` in `src/lib/types.ts`
- Produces: `explored: Readable<Set<string>>` derived store (BFS from `"01"`) in `workspace.ts`
- Produces: `addUserEdge(edge: UserEdge): void`
- Produces: `removeUserEdgesForNode(id: string): void`
- Removes: `markExplored`, `explored` writable

- [ ] **Step 1: Find the latest Svelte 4 compatible @xyflow/svelte version**

```bash
npm info @xyflow/svelte versions --json
```

Pick the highest version starting with `0.`. Note it for Step 2.

- [ ] **Step 2: Swap packages**

```bash
npm uninstall cytoscape cytoscape-dagre cytoscape-elk cytoscape-fcose cytoscape-cola elkjs
npm install @xyflow/svelte@0.0.44
```

Replace `0.0.44` with the version you found. If install fails with a Svelte peer dep error, check with user before upgrading Svelte.

- [ ] **Step 3: Delete dead files**

```bash
rm src/lib/graph/frontier.ts src/lib/graph/frontier.test.ts
rm src/lib/graph/elements.ts src/lib/graph/elements.test.ts
rm src/lib/graph/layouts.ts src/lib/graph/positions.ts
rm src/components/AddEdgeModal.svelte
rm src/cytoscape-ext.d.ts
```

- [ ] **Step 4: Update `src/lib/types.ts`**

Replace the entire file:

```ts
export interface Room { id: string; title?: string; text: string[]; image: string }
export interface Door { from: string; to: string; oneWay: boolean }
export interface UserEdge {
  a: string;
  b: string;
  aToB: boolean;  // can travel a→b
  bToA: boolean;  // can travel b→a
}
```

- [ ] **Step 5: Update `src/lib/db/idb.ts`**

The `WorkspaceDoc` interface already imports `UserEdge` from types. Keep `explored: string[]` for backward-compat with saved files (it is ignored on load now). The file needs no interface shape change — the `UserEdge` import will now reference the updated type. Verify the import line at the top reads:

```ts
import type { Room, Door, UserEdge } from "../types";
```

No other changes needed in this file.

- [ ] **Step 6: Replace `src/lib/stores/workspace.ts`**

```ts
import { writable, derived, get } from "svelte/store";
import { setWorkspace, type WorkspaceDoc, type RoomWork } from "../db/idb";
import type { UserEdge } from "../types";

const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], pins: [] }) as RoomWork;

export const currentRoom = writable<string>("01");
export const roomWork = writable<Record<string, RoomWork>>({});
export const tags = writable<WorkspaceDoc["tags"]>({ defs: [], byRoom: {} });
export const positions = writable<Record<string, { x: number; y: number }>>({ "01": { x: 100, y: 200 } });
export const globalNotes = writable<string>("");
export const userEdges = writable<UserEdge[]>([]);

// BFS from "01" through userEdges — rooms reachable from the starting room
export const explored = derived(
  [userEdges, positions],
  ([$userEdges, $positions]) => {
    const onCanvas = new Set(Object.keys($positions));
    if (!onCanvas.has("01")) return new Set<string>();
    const visited = new Set<string>(["01"]);
    const queue = ["01"];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const e of $userEdges) {
        if (e.a === cur && e.aToB && !visited.has(e.b)) { visited.add(e.b); queue.push(e.b); }
        if (e.b === cur && e.bToA && !visited.has(e.a)) { visited.add(e.a); queue.push(e.a); }
      }
    }
    return visited;
  }
);

export function initWorkspace(doc?: WorkspaceDoc) {
  currentRoom.set("01");
  roomWork.set(doc?.rooms ?? {});
  tags.set(doc?.tags ?? { defs: [], byRoom: {} });
  // Always ensure "01" is on canvas
  positions.set({ "01": { x: 100, y: 200 }, ...(doc?.positions ?? {}) });
  globalNotes.set(doc?.globalNotes ?? "");
  userEdges.set(doc?.userEdges ?? []);
}

export function getRoomWork(id: string): RoomWork {
  return get(roomWork)[id] ?? EMPTY_WORK;
}
export function updateRoomWork(id: string, patch: Partial<RoomWork>) {
  roomWork.update((m) => ({ ...m, [id]: { ...EMPTY_WORK, ...m[id], ...patch } }));
}
export function addUserEdge(edge: UserEdge) {
  userEdges.update((es) => [...es, edge]);
}
export function removeUserEdgesForNode(id: string) {
  userEdges.update((es) => es.filter((e) => e.a !== id && e.b !== id));
}

export const workspaceDoc = derived(
  [roomWork, tags, positions, globalNotes, userEdges],
  ([$rw, $tg, $pos, $gn, $ue]): WorkspaceDoc => ({
    rooms: $rw, explored: [], tags: $tg, positions: $pos, globalNotes: $gn, userEdges: $ue,
  })
);

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
export function startAutosave() {
  if (started) return;
  started = true;
  workspaceDoc.subscribe((doc) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void setWorkspace(doc), 400);
  });
}

export function toggleTag(roomId: string, tagName: string) {
  tags.update((t) => {
    const current = t.byRoom[roomId] ?? [];
    const next = current.includes(tagName)
      ? current.filter((x) => x !== tagName)
      : [...current, tagName];
    return { ...t, byRoom: { ...t.byRoom, [roomId]: next } };
  });
}

export function setTagDef(name: string, color: string) {
  tags.update((t) => {
    const existing = t.defs.findIndex((d) => d.name === name);
    const defs =
      existing >= 0
        ? t.defs.map((d, i) => (i === existing ? { name, color } : d))
        : [...t.defs, { name, color }];
    return { ...t, defs };
  });
}
```

- [ ] **Step 7: Update `src/lib/db/exportImport.ts`**

Replace only the `parseWorkspace` function (keep everything else):

```ts
export function parseWorkspace(text: string): WorkspaceDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d)) throw new Error("Invalid workspace file");
  const rawEdges: any[] = d.userEdges ?? [];
  const userEdges = rawEdges.map((e) => {
    if ("from" in e) {
      // migrate { from, to, oneWay } → new shape
      return { a: e.from, b: e.to, aToB: true, bToA: !e.oneWay };
    }
    if ("direction" in e) {
      // migrate { a, b, direction } → new shape
      return {
        a: e.a, b: e.b,
        aToB: e.direction === "aToB" || e.direction === "both",
        bToA: e.direction === "bToA" || e.direction === "both",
      };
    }
    return e; // already new shape
  });
  return { ...d, userEdges } as WorkspaceDoc;
}
```

- [ ] **Step 8: Replace `src/lib/stores/workspace.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import {
  initWorkspace, explored, updateRoomWork, getRoomWork,
  userEdges, addUserEdge, positions,
} from "./workspace";
import type { UserEdge } from "../types";

describe("workspace store", () => {
  beforeEach(() => initWorkspace());

  it("patches room work immutably", () => {
    updateRoomWork("05", { notes: "hello" });
    expect(getRoomWork("05").notes).toBe("hello");
  });

  it("initialises userEdges to empty array by default", () => {
    expect(get(userEdges)).toEqual([]);
  });

  it("initialises userEdges from doc", () => {
    const edge: UserEdge = { a: "01", b: "17", aToB: true, bToA: false };
    initWorkspace({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [edge] });
    expect(get(userEdges)).toEqual([edge]);
  });

  it("addUserEdge appends an edge", () => {
    const edge: UserEdge = { a: "01", b: "17", aToB: true, bToA: false };
    addUserEdge(edge);
    expect(get(userEdges)).toEqual([edge]);
  });

  it("always places room 01 on canvas", () => {
    initWorkspace({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [] });
    expect(get(positions)["01"]).toBeDefined();
  });
});

describe("explored (derived BFS)", () => {
  beforeEach(() => initWorkspace());

  it("always includes room 01", () => {
    expect(get(explored).has("01")).toBe(true);
  });

  it("includes rooms reachable via aToB edges", () => {
    addUserEdge({ a: "01", b: "20", aToB: true, bToA: false });
    expect(get(explored).has("20")).toBe(true);
  });

  it("includes rooms reachable via bToA edges in reverse", () => {
    addUserEdge({ a: "20", b: "01", aToB: false, bToA: true });
    expect(get(explored).has("20")).toBe(true);
  });

  it("does not follow aToB=false forward", () => {
    addUserEdge({ a: "01", b: "20", aToB: false, bToA: true });
    expect(get(explored).has("20")).toBe(false);
  });

  it("does not include rooms unreachable from 01", () => {
    addUserEdge({ a: "20", b: "30", aToB: true, bToA: false });
    expect(get(explored).has("30")).toBe(false);
  });

  it("traverses multi-hop paths", () => {
    addUserEdge({ a: "01", b: "20", aToB: true, bToA: false });
    addUserEdge({ a: "20", b: "37", aToB: true, bToA: false });
    expect(get(explored).has("37")).toBe(true);
  });
});
```

- [ ] **Step 9: Add migration tests to `src/lib/db/exportImport.test.ts`**

Append inside the existing `describe` block (after the last `it`):

```ts
  it("migrates old { from, to, oneWay: true } userEdges", () => {
    const old = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ from: "01", to: "17", oneWay: true }] });
    expect(parseWorkspace(old).userEdges[0]).toEqual({ a: "01", b: "17", aToB: true, bToA: false });
  });

  it("migrates old { from, to, oneWay: false } userEdges", () => {
    const old = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ from: "01", to: "17", oneWay: false }] });
    expect(parseWorkspace(old).userEdges[0]).toEqual({ a: "01", b: "17", aToB: true, bToA: true });
  });

  it("migrates old { a, b, direction: 'both' } userEdges", () => {
    const old = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ a: "01", b: "17", direction: "both" }] });
    expect(parseWorkspace(old).userEdges[0]).toEqual({ a: "01", b: "17", aToB: true, bToA: true });
  });

  it("passes new { a, b, aToB, bToA } userEdges through unchanged", () => {
    const edge = { a: "01", b: "17", aToB: true, bToA: false };
    const doc = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [edge] });
    expect(parseWorkspace(doc).userEdges[0]).toEqual(edge);
  });
```

Also update the existing round-trip test — it currently uses `explored: ["01"]`. Change it to use `explored: []` so it stays valid (explored is no longer written with room IDs in practice, but the field still round-trips):

No change needed — `explored: ["01"]` still round-trips correctly since parseWorkspace spreads `...d` so the explored array is preserved verbatim.

- [ ] **Step 10: Fix components that imported deleted items**

Read `src/App.svelte`. Remove any import of `markExplored`. Also check `src/components/CurrentRoom.svelte`, `src/components/RoomDirectory.svelte` — if either imports `markExplored`, remove it. The `explored` store still exists as a derived store so those imports stay.

Read `src/components/RoomGraph.svelte` — it still imports from Cytoscape and deleted graph modules. The simplest fix now: replace its entire contents with a temporary stub so type-check passes:

```svelte
<script lang="ts">
</script>
<div style="padding:16px;color:var(--dim)">Graph editor — coming in next task</div>
```

- [ ] **Step 11: Run tests**

```bash
npm run test
```

Expected: workspace and exportImport tests all pass. Frontier/elements tests are gone. Fix any remaining failures before continuing.

- [ ] **Step 12: Type check**

```bash
npm run check
```

Fix any remaining type errors from removed imports.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: new UserEdge type, explored derived store, dead code removed, @xyflow/svelte installed"
```

---

### Task 2: `RoomNode.svelte` — custom Svelte Flow node

**Files:**
- Create: `src/components/RoomNode.svelte`

**Interfaces:**
- Consumes via Svelte Flow `data` prop: `{ roomId: string; isCurrent: boolean; isExplored: boolean; isQueryHit: boolean; isDrawSource: boolean; onRemove: () => void }`
- Registered as `nodeTypes.room` in Task 4

- [ ] **Step 1: Create `src/components/RoomNode.svelte`**

```svelte
<script lang="ts">
  export let data: {
    roomId: string;
    isCurrent: boolean;
    isExplored: boolean;
    isQueryHit: boolean;
    isDrawSource: boolean;
    onRemove: () => void;
  };

  let showMenu = false;

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    showMenu = true;
  }

  function dismissMenu() { showMenu = false; }
  function doRemove() { showMenu = false; data.onRemove(); }
</script>

<svelte:window on:click={dismissMenu} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="node"
  class:current={data.isCurrent}
  class:explored={data.isExplored && !data.isCurrent}
  class:unreachable={!data.isExplored && !data.isCurrent}
  class:query-hit={data.isQueryHit}
  class:draw-source={data.isDrawSource}
  on:contextmenu={onContextMenu}
>
  {data.roomId}
  {#if showMenu}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu" on:click|stopPropagation>
      {#if data.roomId !== "01"}
        <button on:click={doRemove}>Remove from canvas</button>
      {:else}
        <span class="no-remove">Room 01 cannot be removed</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .node {
    width: 28px; height: 28px; border-radius: 6px;
    background: #3a4756; border: 1px solid #4a5a6a;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 600; color: #cbd3dd;
    cursor: pointer; position: relative; user-select: none;
    box-sizing: border-box;
  }
  .node.current  { background: #e2a857; color: #15110a; border-color: #e2a857; }
  .node.explored { border: 2px solid #e2a857; }
  .node.unreachable { opacity: 0.6; border-style: dashed; }
  .node.query-hit { box-shadow: 0 0 0 3px #e2a857, 0 0 0 5px #3a4756; }
  .node.draw-source { box-shadow: 0 0 0 3px #e2a857aa; }

  .menu {
    position: absolute; top: 32px; left: 0; z-index: 200;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px; white-space: nowrap;
    box-shadow: 0 4px 16px #0008;
  }
  .menu button {
    display: block; width: 100%; background: none; border: none;
    color: var(--text); font-size: 11px; padding: 6px 10px;
    text-align: left; cursor: pointer; border-radius: 4px;
  }
  .menu button:hover { background: var(--panel2); color: #e05050; }
  .no-remove { display: block; padding: 6px 10px; font-size: 11px; color: var(--dim); }
</style>
```

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/RoomNode.svelte
git commit -m "feat: RoomNode custom Svelte Flow node with context menu"
```

---

### Task 3: `RoomDrawer.svelte` — unplaced rooms strip

**Files:**
- Create: `src/components/RoomDrawer.svelte`

**Interfaces:**
- Props: `unplacedRooms: string[]`
- Behaviour: sets `dataTransfer` with room ID on `dragstart` so drop handler in `RoomGraph` can read it

- [ ] **Step 1: Create `src/components/RoomDrawer.svelte`**

```svelte
<script lang="ts">
  export let unplacedRooms: string[] = [];

  function onDragStart(e: DragEvent, roomId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData("text/plain", roomId);
    e.dataTransfer.effectAllowed = "copy";
  }
</script>

<div class="drawer">
  {#if unplacedRooms.length === 0}
    <span class="empty">All rooms placed</span>
  {:else}
    {#each unplacedRooms as roomId (roomId)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="chip"
        draggable="true"
        title="Drag to place room {roomId}"
        on:dragstart={(e) => onDragStart(e, roomId)}
      >
        {roomId}
      </div>
    {/each}
  {/if}
</div>

<style>
  .drawer {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 12px; overflow-x: auto; flex: none; height: 48px;
    border-top: 1px solid var(--line); background: var(--panel);
    scrollbar-width: thin;
  }
  .chip {
    width: 28px; height: 28px; flex: none; border-radius: 6px;
    background: #3a4756; border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 600; color: #cbd3dd;
    cursor: grab;
  }
  .chip:active { cursor: grabbing; }
  .chip:hover { border-color: var(--mza); }
  .empty { font-size: 11px; color: var(--dim); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoomDrawer.svelte
git commit -m "feat: RoomDrawer horizontal strip of unplaced rooms"
```

---

### Task 4: `RoomGraph.svelte` core — canvas, drag-to-canvas, navigation, node removal

**Files:**
- Modify: `src/components/RoomGraph.svelte` (replace the stub from Task 1)

**Interfaces:**
- Consumes: `positions`, `userEdges`, `currentRoom`, `explored` from workspace; `rooms` from content store; `RoomNode` (Task 2), `RoomDrawer` (Task 3)
- Produces: working canvas — room placement, navigation, removal. No edge features yet.

**Before writing**, check the installed @xyflow/svelte version's API:

```bash
node -e "const p=require('./node_modules/@xyflow/svelte/package.json');console.log(p.version,JSON.stringify(p.peerDependencies))"
```

If v0.x: use `export let data` in custom nodes and `on:nodeclick` / `on:nodedragstop` event syntax. If v1.x (Svelte 5): use `$props()` and `onnodeclick` / `onnodedragstop` prop syntax.

The code below uses **v0.x syntax**. Adapt if needed.

- [ ] **Step 1: Replace `src/components/RoomGraph.svelte`**

```svelte
<script lang="ts">
  import { writable } from "svelte/store";
  import { SvelteFlow, Background, Controls, type Node, type Edge } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import RoomNode from "./RoomNode.svelte";
  import RoomDrawer from "./RoomDrawer.svelte";
  import { rooms } from "../lib/stores/content";
  import {
    currentRoom, explored, positions, userEdges,
    removeUserEdgesForNode,
  } from "../lib/stores/workspace";

  const nodeTypes = { room: RoomNode };

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

  function syncEdges(ue: typeof $userEdges, peh: Set<string>) {
    sfEdges.set(ue.map((e, i) => ({
      id: `ue-${i}`,
      source: e.a,
      target: e.b,
      // markerStart/markerEnd added in Task 6 when DirectedEdge is wired up
      style: peh.has(`ue-${i}`) ? "stroke:#ffffff;stroke-width:2.5px" : "stroke:#e2a857;stroke-width:1.5px",
    })));
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

  function onNodeClick(e: CustomEvent) {
    const { node, event } = e.detail;
    if (event?.shiftKey) {
      if (drawingEdge) {
        if (drawingEdge.sourceId === node.id) { drawingEdge = null; return; }
        // edge creation handled in Task 5
      } else {
        startDrawing(node.id);
      }
    } else {
      if (drawingEdge) { drawingEdge = null; return; }
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

<svelte:window on:keydown={(e) => { if (e.key === "Escape") drawingEdge = null; }} />

<div class="graph-root">
  <!-- GraphQueryBar placeholder — wired in Task 7 -->
  <div
    class="flow-wrap"
    bind:this={flowWrapper}
    on:drop={onDrop}
    on:dragover={onDragOver}
    on:contextmenu|preventDefault={() => { if (drawingEdge) drawingEdge = null; }}
  >
    <SvelteFlow
      nodes={sfNodes}
      edges={sfEdges}
      {nodeTypes}
      fitView
      on:nodeclick={onNodeClick}
      on:nodedragstop={onNodeDragStop}
    >
      <Background />
      <Controls />
    </SvelteFlow>
  </div>
  <RoomDrawer {unplacedRooms} />
</div>

<style>
  .graph-root { display: flex; flex-direction: column; width: 100%; height: 100%; }
  .flow-wrap  { flex: 1; min-height: 0; position: relative; }

  :global(.svelte-flow__node) { padding: 0; border: none; background: none; box-shadow: none; }
</style>
```

**Note on SvelteFlow event API:** If `on:nodeclick` does not fire, the version you installed uses Svelte 5 prop-style events. In that case replace:
- `on:nodeclick={onNodeClick}` → `onnodeclick={onNodeClick}`
- `on:nodedragstop={onNodeDragStop}` → `onnodedragstop={onNodeDragStop}`
And adapt custom node from `export let data` to `let { data } = $props()`.

- [ ] **Step 2: Type check**

```bash
npm run check
```

Fix type errors. If `Node`/`Edge` types complain about the `data` field, annotate as `data: any`.

- [ ] **Step 3: Run dev server and verify in browser**

```bash
npm run dev
```

Check:
- Graph panel shows without error
- Room `01` is pre-placed on canvas
- All other rooms appear as draggable chips in the bottom drawer
- Drag a chip from drawer → releases on canvas → node appears where dropped, chip disappears from drawer
- Plain click a canvas node → left panel updates to that room
- Right-click a non-01 node → context menu → "Remove from canvas" → node gone, chip back in drawer
- Right-click room 01 → menu shows "Room 01 cannot be removed"
- Drag a placed node around → position persists after page refresh

- [ ] **Step 4: Commit**

```bash
git add src/components/RoomGraph.svelte
git commit -m "feat: RoomGraph with Svelte Flow canvas, drag-to-canvas, navigation, node removal"
```

---

### Task 5: Ghost edge drawing — shift-click, SVG overlay, edge creation, cancellation

**Files:**
- Modify: `src/components/RoomGraph.svelte`

**Interfaces:**
- Produces: `UserEdge { a, b, aToB: true, bToA: shiftHeld }` on edge confirmation
- State: `drawingEdge` (already declared as `null` in Task 4; now fully wired)

- [ ] **Step 1: Add mouse/key tracking and ghost SVG to `RoomGraph.svelte`**

In the `<script>` block, add after the `drawingEdge` declaration:

```ts
let mouseX = 0;
let mouseY = 0;
let shiftHeld = false;

function onMouseMove(e: MouseEvent) { mouseX = e.clientX; mouseY = e.clientY; }
function onShiftKey(e: KeyboardEvent) { shiftHeld = e.shiftKey; }
```

Replace the `onNodeClick` function with this complete version:

```ts
function onNodeClick(e: CustomEvent) {
  const { node, event } = e.detail;
  if (event?.shiftKey) {
    if (drawingEdge) {
      if (drawingEdge.sourceId === node.id) {
        drawingEdge = null; // cancel — clicked source again
      } else {
        // confirm edge creation
        userEdges.update(es => [...es, {
          a: drawingEdge!.sourceId,
          b: node.id,
          aToB: true,
          bToA: shiftHeld,
        }]);
        drawingEdge = null;
      }
    } else {
      startDrawing(node.id);
    }
  } else {
    if (drawingEdge) { drawingEdge = null; return; }
    currentRoom.set(node.id);
  }
}
```

- [ ] **Step 2: Update `<svelte:window>` and add ghost SVG to template**

Replace the existing `<svelte:window>` line with:

```svelte
<svelte:window
  on:mousemove={onMouseMove}
  on:keydown={(e) => { if (e.key === "Escape") drawingEdge = null; shiftHeld = e.shiftKey; }}
  on:keyup={(e) => { shiftHeld = e.shiftKey; }}
/>
```

Inside `.flow-wrap`, after `</SvelteFlow>`, add:

```svelte
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
```

Add to `<style>`:

```css
.ghost-svg {
  position: fixed; inset: 0; width: 100vw; height: 100vh;
  pointer-events: none; z-index: 9999;
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Check:
- Shift-click a placed node → node glows, ghost dashed line follows mouse
- Release Shift mid-draw → single arrowhead at target end
- Hold Shift mid-draw → arrowheads at both ends
- Escape → ghost disappears
- Right-click canvas → ghost disappears
- Shift-click source node again → ghost disappears
- Shift-click a different placed node → amber edge appears; arrow direction matches what ghost showed
- Refresh → edge persists

- [ ] **Step 4: Commit**

```bash
git add src/components/RoomGraph.svelte
git commit -m "feat: shift-click ghost edge drawing with Escape/right-click/source-cancel"
```

---

### Task 6: `DirectedEdge.svelte` — custom edge with endpoint toggle dots

**Files:**
- Create: `src/components/DirectedEdge.svelte`
- Modify: `src/components/RoomGraph.svelte`

**Interfaces:**
- Custom edge component registered as `edgeTypes.user`
- Receives `data: { aToB: boolean; bToA: boolean; isPath: boolean; onToggleAToB: () => void; onToggleBToA: () => void }`

- [ ] **Step 1: Create `src/components/DirectedEdge.svelte`**

```svelte
<script lang="ts">
  import { BaseEdge, getBezierPath } from "@xyflow/svelte";

  export let id: string;
  export let sourceX: number;
  export let sourceY: number;
  export let targetX: number;
  export let targetY: number;
  export let sourcePosition: any = undefined;
  export let targetPosition: any = undefined;
  export let data: {
    aToB: boolean;
    bToA: boolean;
    isPath: boolean;
    onToggleAToB: () => void;
    onToggleBToA: () => void;
  };

  $: [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  let hovered = false;
  let hoverSrc = false; // hovering dot near source (controls bToA)
  let hoverTgt = false; // hovering dot near target (controls aToB)

  // Red if click would delete edge (last remaining direction being toggled)
  $: srcDotColor = hoverSrc
    ? (data.bToA && !data.aToB ? "#e05050" : (data.bToA ? "#e2a857" : "#e05050"))
    : (data.bToA ? "#e2a857" : "#4a5a6a");
  $: tgtDotColor = hoverTgt
    ? (data.aToB && !data.bToA ? "#e05050" : (data.aToB ? "#e2a857" : "#e05050"))
    : (data.aToB ? "#e2a857" : "#4a5a6a");

  $: edgeStyle = data.isPath
    ? "stroke:#ffffff;stroke-width:2.5px"
    : "stroke:#e2a857;stroke-width:1.5px";
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<g
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => { hovered = false; hoverSrc = false; hoverTgt = false; }}
>
  <BaseEdge
    {id}
    path={edgePath}
    style={edgeStyle}
    markerStart={data.bToA ? "url(#arr-back)" : undefined}
    markerEnd={data.aToB ? "url(#arr-fwd)" : undefined}
  />

  {#if hovered}
    <!-- Dot near source — controls bToA -->
    <circle
      cx={sourceX} cy={sourceY} r="6"
      fill={srcDotColor} stroke="#0a0f14" stroke-width="1.5"
      style="cursor:pointer"
      on:mouseenter={() => (hoverSrc = true)}
      on:mouseleave={() => (hoverSrc = false)}
      on:click|stopPropagation={data.onToggleBToA}
    />
    <!-- Dot near target — controls aToB -->
    <circle
      cx={targetX} cy={targetY} r="6"
      fill={tgtDotColor} stroke="#0a0f14" stroke-width="1.5"
      style="cursor:pointer"
      on:mouseenter={() => (hoverTgt = true)}
      on:mouseleave={() => (hoverTgt = false)}
      on:click|stopPropagation={data.onToggleAToB}
    />
  {/if}
</g>
```

- [ ] **Step 2: Wire `DirectedEdge` into `RoomGraph.svelte`**

Add import:
```ts
import DirectedEdge from "./DirectedEdge.svelte";
```

Add `edgeTypes` constant after `nodeTypes`:
```ts
const edgeTypes = { user: DirectedEdge };
```

Add SVG arrow markers inside `.flow-wrap` (before `<SvelteFlow>`):
```svelte
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
```

Replace the `syncEdges` function:
```ts
function syncEdges(ue: typeof $userEdges, peh: Set<string>) {
  sfEdges.set(ue.map((e, i) => ({
    id: `ue-${i}`,
    source: e.a,
    target: e.b,
    type: "user",
    data: {
      aToB: e.aToB,
      bToA: e.bToA,
      isPath: peh.has(`ue-${i}`),
      onToggleAToB: () => toggleAToB(i),
      onToggleBToA: () => toggleBToA(i),
    },
  })));
}
```

Add toggle functions:
```ts
function toggleAToB(i: number) {
  userEdges.update(es => {
    const e = es[i];
    if (e.aToB && !e.bToA) return es.filter((_, idx) => idx !== i); // delete
    return es.map((edge, idx) => idx === i ? { ...edge, aToB: !edge.aToB } : edge);
  });
}

function toggleBToA(i: number) {
  userEdges.update(es => {
    const e = es[i];
    if (e.bToA && !e.aToB) return es.filter((_, idx) => idx !== i); // delete
    return es.map((edge, idx) => idx === i ? { ...edge, bToA: !edge.bToA } : edge);
  });
}
```

Add `{edgeTypes}` to `<SvelteFlow>`:
```svelte
<SvelteFlow nodes={sfNodes} edges={sfEdges} {nodeTypes} {edgeTypes} fitView ...>
```

- [ ] **Step 3: Verify in browser**

Check:
- Edges render in amber with arrowheads matching `aToB`/`bToA` state
- Hover an edge → two dots appear near source and target endpoints
- Filled dot = direction active; hollow dark dot = direction inactive
- Click filled dot that is the only active direction → edge deletes; dot turns red on hover to warn
- Click hollow dot → adds that direction (arrowhead appears at that end)
- Click filled dot where other direction is also active → removes that arrowhead only
- Query path edges render in white/thick (wired in Task 7)

- [ ] **Step 4: Commit**

```bash
git add src/components/DirectedEdge.svelte src/components/RoomGraph.svelte
git commit -m "feat: DirectedEdge with endpoint toggle dots and direction control"
```

---

### Task 7: `shortestPath` + `GraphQueryBar.svelte` — find room and path queries

**Files:**
- Create: `src/lib/graph/shortestPath.ts`
- Create: `src/lib/graph/shortestPath.test.ts`
- Create: `src/components/GraphQueryBar.svelte`
- Modify: `src/components/RoomGraph.svelte`

**Interfaces:**
- Produces: `shortestPath(edges: UserEdge[], from: string, to: string): string[] | null`
- `GraphQueryBar` dispatches: `highlight` (detail: `Set<string>`), `pathEdges` (detail: `Set<string>`), `clear`

- [ ] **Step 1: Write failing tests in `src/lib/graph/shortestPath.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { shortestPath } from "./shortestPath";
import type { UserEdge } from "../types";

describe("shortestPath", () => {
  it("returns [start] when start === end", () => {
    expect(shortestPath([], "01", "01")).toEqual(["01"]);
  });

  it("returns direct one-hop path (aToB)", () => {
    const edges: UserEdge[] = [{ a: "01", b: "20", aToB: true, bToA: false }];
    expect(shortestPath(edges, "01", "20")).toEqual(["01", "20"]);
  });

  it("returns null when no path exists", () => {
    const edges: UserEdge[] = [{ a: "01", b: "20", aToB: true, bToA: false }];
    expect(shortestPath(edges, "20", "01")).toBeNull();
  });

  it("cannot traverse aToB=false forward", () => {
    const edges: UserEdge[] = [{ a: "01", b: "20", aToB: false, bToA: true }];
    expect(shortestPath(edges, "01", "20")).toBeNull();
  });

  it("traverses bToA direction (b→a)", () => {
    const edges: UserEdge[] = [{ a: "20", b: "01", aToB: false, bToA: true }];
    expect(shortestPath(edges, "01", "20")).toBeNull();
    expect(shortestPath(edges, "20", "01")).toEqual(["20", "01"]);
  });

  it("finds multi-hop path", () => {
    const edges: UserEdge[] = [
      { a: "01", b: "20", aToB: true, bToA: false },
      { a: "20", b: "37", aToB: true, bToA: false },
    ];
    expect(shortestPath(edges, "01", "37")).toEqual(["01", "20", "37"]);
  });

  it("returns shortest of two paths", () => {
    const edges: UserEdge[] = [
      { a: "01", b: "20", aToB: true, bToA: true },
      { a: "01", b: "37", aToB: true, bToA: true },
      { a: "20", b: "37", aToB: true, bToA: true },
    ];
    expect(shortestPath(edges, "01", "37")).toEqual(["01", "37"]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- shortestPath
```

Expected: "Cannot find module './shortestPath'"

- [ ] **Step 3: Create `src/lib/graph/shortestPath.ts`**

```ts
import type { UserEdge } from "../types";

export function shortestPath(
  edges: UserEdge[],
  from: string,
  to: string
): string[] | null {
  if (from === to) return [from];
  const prev = new Map<string, string>();
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const e of edges) {
      let next: string | null = null;
      if (e.a === cur && e.aToB && !visited.has(e.b)) next = e.b;
      else if (e.b === cur && e.bToA && !visited.has(e.a)) next = e.a;
      if (!next) continue;
      prev.set(next, cur);
      if (next === to) {
        const path: string[] = [];
        let n: string | undefined = to;
        while (n !== undefined) { path.unshift(n); n = prev.get(n); }
        return path;
      }
      visited.add(next);
      queue.push(next);
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- shortestPath
```

Expected: 7 passing.

- [ ] **Step 5: Create `src/components/GraphQueryBar.svelte`**

```svelte
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
    dispatch("highlight", new Set([id]));
    dispatch("pathEdges", new Set());
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
    // identify edge IDs along the path
    const edgeIds = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      userEdges.forEach((e, idx) => {
        if ((e.a === a && e.b === b && e.aToB) || (e.b === a && e.a === b && e.bToA))
          edgeIds.add(`ue-${idx}`);
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
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 5px 10px; border-bottom: 1px solid var(--line);
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
```

- [ ] **Step 6: Wire `GraphQueryBar` into `RoomGraph.svelte`**

Add import:
```ts
import GraphQueryBar from "./GraphQueryBar.svelte";
```

Replace the `<!-- GraphQueryBar placeholder -->` comment with:
```svelte
<GraphQueryBar
  userEdges={$userEdges}
  {canvasIds}
  on:highlight={(e) => { queryHighlight = e.detail; syncNodeData($currentRoom, $explored, queryHighlight, drawingEdge?.sourceId ?? null); }}
  on:pathEdges={(e) => { pathEdgeHighlight = e.detail; syncEdges($userEdges, pathEdgeHighlight); }}
  on:clear={() => { queryHighlight = new Set(); pathEdgeHighlight = new Set(); syncNodeData($currentRoom, $explored, queryHighlight, drawingEdge?.sourceId ?? null); syncEdges($userEdges, pathEdgeHighlight); }}
/>
```

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: all tests pass (workspace, exportImport, shortestPath).

- [ ] **Step 8: Verify in browser**

```bash
npm run dev
```

Place a few rooms, draw some edges, then:
- Type a room ID in Find → node gets pulse ring highlight, canvas centers on it
- Type a room not on canvas → status shows error
- Enter valid From/To rooms with a path → path highlighted in white on canvas, status shows `"Path: 01 → 20 → 37"`
- Enter rooms with no path → `"No path: ..."` status
- Click Clear → all highlights removed

- [ ] **Step 9: Commit**

```bash
git add src/lib/graph/shortestPath.ts src/lib/graph/shortestPath.test.ts src/components/GraphQueryBar.svelte src/components/RoomGraph.svelte
git commit -m "feat: shortestPath BFS and GraphQueryBar with find-room and path highlight"
```

---

## Self-Review

**Spec coverage:**
- ✅ New `UserEdge { a, b, aToB, bToA }` — Task 1
- ✅ Dead code removal (frontier, elements, layouts, positions, AddEdgeModal, cytoscape-ext.d.ts) — Task 1
- ✅ Package swap (remove Cytoscape family, add @xyflow/svelte) — Task 1
- ✅ Migration from `{ from, to, oneWay }` and `{ a, b, direction }` formats — Task 1
- ✅ `explored` as BFS-derived store — Task 1
- ✅ Room `"01"` always on canvas — Task 1 (initWorkspace spreads "01" first), Task 4 (removeNode guards)
- ✅ `RoomNode` with visual states (current, explored, unreachable, query-hit, draw-source) — Task 2
- ✅ Right-click → context menu → remove — Task 2 + Task 4
- ✅ `RoomDrawer` horizontal scrollable strip of unplaced rooms — Task 3
- ✅ Drag-to-canvas (HTML5 drag API, coordinate conversion, positions update) — Task 4
- ✅ Node plain-click → navigate (set currentRoom) — Task 4
- ✅ Node drag-stop → persist positions — Task 4
- ✅ Node removal → positions delete + edge cleanup — Task 4
- ✅ Shift-click to start draw mode (glow on source) — Task 5
- ✅ Ghost SVG overlay (dashed amber line + arrowheads reactive to Shift key) — Task 5
- ✅ Edge creation on target click: `{ a, b, aToB: true, bToA: shiftHeld }` — Task 5
- ✅ Cancel: Escape, right-click on canvas, click source node again — Task 5
- ✅ `DirectedEdge` custom edge with arrowheads per `aToB`/`bToA` — Task 6
- ✅ Endpoint dots on hover (source dot = bToA, target dot = aToB) — Task 6
- ✅ Toggle direction via dot click, delete edge when last direction removed — Task 6
- ✅ Red dot warning when click would delete edge — Task 6
- ✅ `shortestPath` BFS with direction-aware traversal — Task 7
- ✅ `GraphQueryBar` find-room highlight — Task 7
- ✅ `GraphQueryBar` shortest-path highlight (nodes + edges) — Task 7
- ✅ Clear button removes all highlights — Task 7

**Type consistency:**
- `UserEdge { a, b, aToB, bToA }` defined Task 1, used in Tasks 4, 5, 6, 7 — consistent
- `removeUserEdgesForNode` defined Task 1, imported in Task 4 — consistent
- `sfEdges` entry `data.onToggleAToB` / `data.onToggleBToA` set in `syncEdges` (Task 6), consumed by `DirectedEdge` (Task 6) — consistent
- `makeData` returns `isDrawSource` — `RoomNode` accepts it (Task 2) — consistent
- `shortestPath(edges, from, to)` signature defined Task 7 step 3, called in `GraphQueryBar` step 5 — consistent
- Edge IDs `ue-${i}` used in `syncEdges`, `onToggleAToB/BToA`, `pathEdges` dispatch — consistent

**No placeholders found.**
