# Graph Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-rooms-upfront graph with a fog-of-war exploration graph featuring frontier nodes, user-added secret edges, multiple layout engines including ELK, and incremental node placement.

**Architecture:** The data layer gains a `userEdges` store persisted in `WorkspaceDoc`. A new pure `computeFrontier` function derives visible non-explored rooms from the current explored set. `RoomGraph.svelte` incrementally adds nodes to Cytoscape as exploration progresses rather than rebuilding from scratch; a "Dev: load all" button bypasses fog-of-war for layout testing.

**Tech Stack:** Svelte 4, Cytoscape.js 3, cytoscape-dagre (existing), cytoscape-elk + elkjs (new), Vitest

## Global Constraints

- Test command: `npm run test` (runs `vitest run`)
- Type check: `npm run check`
- Node IDs are zero-padded two-digit strings: `"01"`, `"17"`, `"45"`
- Never modify unrelated files — surgical changes only
- CSS variables: `--mza` (gold), `--panel`, `--panel2`, `--line`, `--text`, `--dim`, `--bg`

---

### Task 1: UserEdge type + workspace store + persistence

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/idb.ts`
- Modify: `src/lib/stores/workspace.ts`
- Modify: `src/lib/db/exportImport.ts`
- Modify: `src/lib/stores/workspace.test.ts`

**Interfaces:**
- Produces: `UserEdge { from: string; to: string; oneWay: boolean }` (used by Tasks 2, 3, 5, 6)
- Produces: `userEdges: Writable<UserEdge[]>` store export from `workspace.ts`
- Produces: `addUserEdge(edge: UserEdge): void` export from `workspace.ts`

- [ ] **Step 1: Write failing tests for `addUserEdge` and `initWorkspace` with `userEdges`**

In `src/lib/stores/workspace.test.ts`, add after the existing tests:

```ts
import { initWorkspace, explored, markExplored, updateRoomWork, getRoomWork, userEdges, addUserEdge } from "./workspace";
import { get } from "svelte/store";

// (add inside the existing describe block or as a new describe block)
it("initialises userEdges to empty array by default", () => {
  initWorkspace();
  expect(get(userEdges)).toEqual([]);
});

it("initialises userEdges from doc", () => {
  initWorkspace({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ from: "01", to: "17", oneWay: true }] });
  expect(get(userEdges)).toEqual([{ from: "01", to: "17", oneWay: true }]);
});

it("addUserEdge appends an edge", () => {
  initWorkspace();
  addUserEdge({ from: "01", to: "17", oneWay: false });
  expect(get(userEdges)).toEqual([{ from: "01", to: "17", oneWay: false }]);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm run test -- workspace
```

Expected: 3 failures (userEdges not exported, addUserEdge not exported)

- [ ] **Step 3: Add `UserEdge` to `src/lib/types.ts`**

```ts
export interface Room { id: string; title?: string; text: string[]; image: string }
export interface Door { from: string; to: string; oneWay: boolean }
export interface UserEdge { from: string; to: string; oneWay: boolean }
```

- [ ] **Step 4: Add `userEdges` to `WorkspaceDoc` in `src/lib/db/idb.ts`**

Replace the `WorkspaceDoc` interface:

```ts
export interface WorkspaceDoc {
  rooms: Record<string, RoomWork>;
  explored: string[];
  tags: TagState;
  positions: Record<string, { x: number; y: number }>;
  globalNotes: string;
  userEdges: UserEdge[];
}
```

Add the import at the top of the file:

```ts
import type { Room, Door, UserEdge } from "../types";
```

- [ ] **Step 5: Update `src/lib/stores/workspace.ts`**

Replace the entire file:

```ts
import { writable, derived, get } from "svelte/store";
import { setWorkspace, type WorkspaceDoc, type RoomWork } from "../db/idb";
import type { UserEdge } from "../types";

const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], pins: [] }) as RoomWork;

export const currentRoom = writable<string>("01");
export const explored = writable<Set<string>>(new Set());
export const roomWork = writable<Record<string, RoomWork>>({});
export const tags = writable<WorkspaceDoc["tags"]>({ defs: [], byRoom: {} });
export const positions = writable<Record<string, { x: number; y: number }>>({});
export const globalNotes = writable<string>("");
export const userEdges = writable<UserEdge[]>([]);

export function initWorkspace(doc?: WorkspaceDoc) {
  currentRoom.set("01");
  explored.set(new Set(doc?.explored ?? []));
  roomWork.set(doc?.rooms ?? {});
  tags.set(doc?.tags ?? { defs: [], byRoom: {} });
  positions.set(doc?.positions ?? {});
  globalNotes.set(doc?.globalNotes ?? "");
  userEdges.set(doc?.userEdges ?? []);
}

export function getRoomWork(id: string): RoomWork {
  return get(roomWork)[id] ?? EMPTY_WORK;
}
export function updateRoomWork(id: string, patch: Partial<RoomWork>) {
  roomWork.update((m) => ({ ...m, [id]: { ...EMPTY_WORK, ...m[id], ...patch } }));
}
export function markExplored(id: string) {
  explored.update((s) => new Set(s).add(id));
}
export function addUserEdge(edge: UserEdge) {
  userEdges.update((es) => [...es, edge]);
}

export const workspaceDoc = derived(
  [roomWork, explored, tags, positions, globalNotes, userEdges],
  ([$rw, $ex, $tg, $pos, $gn, $ue]): WorkspaceDoc => ({
    rooms: $rw, explored: [...$ex], tags: $tg, positions: $pos, globalNotes: $gn, userEdges: $ue,
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
```

- [ ] **Step 6: Update `parseWorkspace` in `src/lib/db/exportImport.ts` to default `userEdges`**

Replace the `parseWorkspace` function only:

```ts
export function parseWorkspace(text: string): WorkspaceDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d)) throw new Error("Invalid workspace file");
  return { ...d, userEdges: d.userEdges ?? [] } as WorkspaceDoc;
}
```

- [ ] **Step 7: Run tests to confirm they pass**

```
npm run test -- workspace
```

Expected: all pass

- [ ] **Step 8: Type check**

```
npm run check
```

Expected: no errors

- [ ] **Step 9: Commit**

```
git add src/lib/types.ts src/lib/db/idb.ts src/lib/stores/workspace.ts src/lib/db/exportImport.ts src/lib/stores/workspace.test.ts
git commit -m "feat: add UserEdge type, store, and persistence"
```

---

### Task 2: Frontier computation

**Files:**
- Create: `src/lib/graph/frontier.ts`
- Create: `src/lib/graph/frontier.test.ts`

**Interfaces:**
- Consumes: `Door` from `src/lib/types.ts`, `UserEdge` from `src/lib/types.ts`
- Produces: `computeFrontier(explored: Set<string>, doors: Door[], userEdges: UserEdge[]): Set<string>`

- [ ] **Step 1: Write failing tests in `src/lib/graph/frontier.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeFrontier } from "./frontier";
import type { Door, UserEdge } from "../types";

const doors: Door[] = [
  { from: "01", to: "20", oneWay: false },
  { from: "01", to: "21", oneWay: false },
  { from: "17", to: "45", oneWay: true },
];

describe("computeFrontier", () => {
  it("returns rooms reachable from explored via obvious doors", () => {
    const f = computeFrontier(new Set(["01"]), doors, []);
    expect(f.has("20")).toBe(true);
    expect(f.has("21")).toBe(true);
  });

  it("excludes already explored rooms", () => {
    const f = computeFrontier(new Set(["01", "20"]), doors, []);
    expect(f.has("20")).toBe(false);
    expect(f.has("21")).toBe(true);
  });

  it("includes reverse direction of two-way doors", () => {
    const f = computeFrontier(new Set(["20"]), doors, []);
    expect(f.has("01")).toBe(true);
  });

  it("excludes reverse of one-way doors", () => {
    const f = computeFrontier(new Set(["45"]), doors, []);
    expect(f.has("17")).toBe(false);
  });

  it("includes rooms reachable via user edges", () => {
    const ue: UserEdge[] = [{ from: "01", to: "17", oneWay: false }];
    const f = computeFrontier(new Set(["01"]), [], ue);
    expect(f.has("17")).toBe(true);
  });

  it("excludes reverse of one-way user edges", () => {
    const ue: UserEdge[] = [{ from: "01", to: "17", oneWay: true }];
    const f = computeFrontier(new Set(["17"]), [], ue);
    expect(f.has("01")).toBe(false);
  });

  it("returns empty set when explored is empty", () => {
    const f = computeFrontier(new Set(), doors, []);
    expect(f.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm run test -- frontier
```

Expected: all fail (module not found)

- [ ] **Step 3: Implement `src/lib/graph/frontier.ts`**

```ts
import type { Door, UserEdge } from "../types";

export function computeFrontier(
  explored: Set<string>,
  doors: Door[],
  userEdges: UserEdge[]
): Set<string> {
  const frontier = new Set<string>();
  for (const d of doors) {
    if (explored.has(d.from) && !explored.has(d.to)) frontier.add(d.to);
    if (!d.oneWay && explored.has(d.to) && !explored.has(d.from)) frontier.add(d.from);
  }
  for (const e of userEdges) {
    if (explored.has(e.from) && !explored.has(e.to)) frontier.add(e.to);
    if (!e.oneWay && explored.has(e.to) && !explored.has(e.from)) frontier.add(e.from);
  }
  return frontier;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm run test -- frontier
```

Expected: 7 pass

- [ ] **Step 5: Commit**

```
git add src/lib/graph/frontier.ts src/lib/graph/frontier.test.ts
git commit -m "feat: add computeFrontier pure function"
```

---

### Task 3: Rewrite elements.ts with new visibility model

**Files:**
- Modify: `src/lib/graph/elements.ts`
- Modify: `src/lib/graph/elements.test.ts`

**Interfaces:**
- Consumes: `UserEdge` from Task 1, `computeFrontier` from Task 2 (frontier passed in as parameter)
- Produces: `buildElements(rooms, doors, userEdges, current, explored, frontier, positions, devMode): ElementDefinition[]`

- [ ] **Step 1: Rewrite `src/lib/graph/elements.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildElements } from "./elements";
import type { Door, UserEdge } from "../types";

const rooms = [
  { id: "01", text: [], image: "01.jpg" },
  { id: "20", text: [], image: "20.jpg" },
  { id: "21", text: [], image: "21.jpg" },
];
const doors: Door[] = [
  { from: "01", to: "20", oneWay: false },
  { from: "01", to: "21", oneWay: true },
];
const noUserEdges: UserEdge[] = [];

function nodes(els: ReturnType<typeof buildElements>) {
  return els.filter(e => !("source" in (e.data as any)));
}
function edges(els: ReturnType<typeof buildElements>) {
  return els.filter(e => "source" in (e.data as any));
}
function nodeById(els: ReturnType<typeof buildElements>, id: string) {
  return nodes(els).find(e => (e.data as any).id === id);
}

describe("buildElements", () => {
  it("only renders explored and frontier nodes in normal mode", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20", "21"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodes(els)).toHaveLength(3);
  });

  it("renders no nodes when nothing explored", () => {
    const els = buildElements(rooms, doors, noUserEdges, "01", new Set(), new Set(), {}, false);
    expect(nodes(els)).toHaveLength(0);
  });

  it("tags current node with current class", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodeById(els, "01")?.classes).toContain("current");
  });

  it("tags explored non-current nodes with explored class", () => {
    const explored = new Set(["01", "20"]);
    const frontier = new Set(["21"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodeById(els, "20")?.classes).toContain("explored");
  });

  it("tags frontier nodes with frontier class", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodeById(els, "20")?.classes).toContain("frontier");
  });

  it("applies saved positions", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, { "20": { x: 5, y: 9 } }, false);
    expect(nodeById(els, "20")?.position).toEqual({ x: 5, y: 9 });
  });

  it("only renders edges where both endpoints are visible", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]); // 21 not in frontier
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(edges(els)).toHaveLength(1);
    expect((edges(els)[0].data as any).target).toBe("20");
  });

  it("tags one-way obvious edges with oneway class", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20", "21"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    const oneway = edges(els).find(e => (e.data as any).target === "21");
    expect(oneway?.classes).toContain("oneway");
  });

  it("renders user edges with user class", () => {
    const ue: UserEdge[] = [{ from: "01", to: "20", oneWay: false }];
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, ue, "01", explored, frontier, {}, false);
    const userEdge = edges(els).find(e => (e.data as any).id.startsWith("u"));
    expect(userEdge?.classes).toContain("user");
    expect(userEdge?.classes).not.toContain("user-oneway");
  });

  it("renders one-way user edges with user-oneway class", () => {
    const ue: UserEdge[] = [{ from: "01", to: "20", oneWay: true }];
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, ue, "01", explored, frontier, {}, false);
    const userEdge = edges(els).find(e => (e.data as any).id.startsWith("u"));
    expect(userEdge?.classes).toContain("user-oneway");
  });

  it("devMode renders all rooms regardless of explored/frontier", () => {
    const els = buildElements(rooms, doors, noUserEdges, "01", new Set(), new Set(), {}, true);
    expect(nodes(els)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm run test -- elements
```

Expected: most tests fail (wrong signature)

- [ ] **Step 3: Rewrite `src/lib/graph/elements.ts`**

```ts
import type { ElementDefinition } from "cytoscape";
import type { Room, Door, UserEdge } from "../types";

export function buildElements(
  rooms: Room[],
  doors: Door[],
  userEdges: UserEdge[],
  current: string,
  explored: Set<string>,
  frontier: Set<string>,
  positions: Record<string, { x: number; y: number }>,
  devMode: boolean
): ElementDefinition[] {
  const visibleIds: Set<string> = devMode
    ? new Set(rooms.map((r) => r.id))
    : new Set([...explored, ...frontier]);

  const nodes: ElementDefinition[] = rooms
    .filter((r) => visibleIds.has(r.id))
    .map((r) => {
      const cls: string[] = [];
      if (r.id === current) cls.push("current");
      else if (explored.has(r.id)) cls.push("explored");
      else cls.push("frontier");
      const el: ElementDefinition = { data: { id: r.id, label: r.id }, classes: cls.join(" ") };
      if (positions[r.id]) el.position = { ...positions[r.id] };
      return el;
    });

  const edgeEls: ElementDefinition[] = [];
  doors.forEach((d, i) => {
    if (!visibleIds.has(d.from) || !visibleIds.has(d.to)) return;
    edgeEls.push({
      data: { id: `d${i}`, source: d.from, target: d.to },
      classes: d.oneWay ? "oneway" : "",
    });
  });
  userEdges.forEach((e, i) => {
    if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) return;
    edgeEls.push({
      data: { id: `u${i}`, source: e.from, target: e.to },
      classes: ["user", e.oneWay ? "user-oneway" : ""].filter(Boolean).join(" "),
    });
  });

  return [...nodes, ...edgeEls];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm run test -- elements
```

Expected: all pass

- [ ] **Step 5: Type check**

```
npm run check
```

Expected: errors in `RoomGraph.svelte` (old `buildElements` call signature) — these will be fixed in Task 6. Ignore for now.

- [ ] **Step 6: Commit**

```
git add src/lib/graph/elements.ts src/lib/graph/elements.test.ts
git commit -m "feat: rewrite elements builder with frontier/userEdge/devMode support"
```

---

### Task 4: Install ELK and update layout options

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/lib/graph/layouts.ts`

**Interfaces:**
- Produces: updated `LAYOUT_NAMES` array including `"dagre-LR"` and `"elk-layered"`
- Produces: updated `layoutOptions` function handling the two new names
- Note: ELK plugin registration (`cytoscape.use(elk)`) stays in `RoomGraph.svelte` (Task 6), not here

- [ ] **Step 1: Install ELK dependencies**

```
npm install elkjs cytoscape-elk
```

Expected: packages added to `node_modules` and `package.json` dependencies

- [ ] **Step 2: Replace `src/lib/graph/layouts.ts`**

```ts
import type { Core, LayoutOptions } from "cytoscape";

export const LAYOUT_NAMES = ["dagre-LR", "elk-layered", "fcose", "cola", "dagre", "concentric", "circle"] as const;
export type LayoutName = (typeof LAYOUT_NAMES)[number];

export function layoutOptions(name: LayoutName): LayoutOptions {
  switch (name) {
    case "dagre-LR":
      return { name: "dagre", rankDir: "LR", ranker: "network-simplex" } as unknown as LayoutOptions;
    case "elk-layered":
      return {
        name: "elk",
        nodeDimensionsIncludeLabels: false,
        elk: { algorithm: "layered", "elk.direction": "RIGHT" },
      } as unknown as LayoutOptions;
    case "fcose":
      return { name: "fcose", animate: true, randomize: true } as unknown as LayoutOptions;
    case "cola":
      return { name: "cola", animate: true } as unknown as LayoutOptions;
    case "dagre":
      return { name: "dagre", rankDir: "TB" } as unknown as LayoutOptions;
    case "concentric":
      return { name: "concentric" } as LayoutOptions;
    case "circle":
      return { name: "circle" } as LayoutOptions;
  }
}

export function runLayout(cy: Core, name: LayoutName) {
  cy.layout(layoutOptions(name)).run();
}
```

- [ ] **Step 3: Type check**

```
npm run check
```

Expected: no new errors from layouts.ts

- [ ] **Step 4: Commit**

```
git add package.json package-lock.json src/lib/graph/layouts.ts
git commit -m "feat: add ELK and dagre-LR layout options"
```

---

### Task 5: AddEdgeModal component

**Files:**
- Create: `src/components/AddEdgeModal.svelte`

**Interfaces:**
- Consumes: `rooms` store from `src/lib/stores/content.ts`, `addUserEdge` from Task 1
- Props: `currentRoom: string`, `open: boolean` (bindable)
- Emits: nothing (closes itself by setting `open = false`)

- [ ] **Step 1: Create `src/components/AddEdgeModal.svelte`**

```svelte
<script lang="ts">
  import { rooms } from "../lib/stores/content";
  import { addUserEdge } from "../lib/stores/workspace";

  export let currentRoom: string;
  export let open = false;

  let from = "";
  let to = "";
  let oneWay = false;
  let error = "";

  $: if (open) {
    from = currentRoom;
    to = "";
    oneWay = false;
    error = "";
  }

  function submit() {
    const ids = new Set($rooms.map((r) => r.id));
    if (!ids.has(from)) { error = `Room "${from}" does not exist`; return; }
    if (!ids.has(to)) { error = `Room "${to}" does not exist`; return; }
    if (from === to) { error = "From and To must be different"; return; }
    addUserEdge({ from, to, oneWay });
    open = false;
  }

  function cancel() { open = false; }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") cancel();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if open}
  <div class="scrim" on:click={cancel} role="presentation">
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-label="Add Connection">
      <h3>Add Connection</h3>
      <div class="row">
        <label>From <input bind:value={from} maxlength="2" /></label>
        <label>To <input bind:value={to} maxlength="2" /></label>
      </div>
      <div class="dir">
        <label><input type="radio" bind:group={oneWay} value={false} /> ↔ Two-way</label>
        <label><input type="radio" bind:group={oneWay} value={true} /> → One-way</label>
      </div>
      {#if error}<p class="err">{error}</p>{/if}
      <div class="btns">
        <button on:click={cancel}>Cancel</button>
        <button class="primary" on:click={submit}>Add</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; background: #00000088;
    display: flex; align-items: center; justify-content: center; z-index: 100;
  }
  .modal {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 10px; padding: 20px 24px; min-width: 280px;
  }
  h3 { margin: 0 0 16px; font-size: 13px; color: var(--text); font-weight: 600; }
  .row { display: flex; gap: 16px; margin-bottom: 14px; }
  label { font-size: 11px; color: var(--dim); display: flex; flex-direction: column; gap: 4px; }
  input[type="text"], input:not([type]) {
    background: var(--panel2); border: 1px solid var(--line); border-radius: 6px;
    padding: 6px 8px; color: var(--text); width: 64px; font-size: 12px;
  }
  .dir { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
  .dir label { flex-direction: row; align-items: center; gap: 6px; cursor: pointer; color: var(--text); }
  .err { color: #e05050; font-size: 11px; margin: 0 0 10px; }
  .btns { display: flex; justify-content: flex-end; gap: 8px; }
  .btns button {
    background: var(--panel2); color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-family: inherit;
  }
  .btns button.primary { border-color: var(--mza); color: var(--mza); }
  .btns button:hover { border-color: var(--mza); }
</style>
```

- [ ] **Step 2: Type check**

```
npm run check
```

Expected: no errors in AddEdgeModal.svelte

- [ ] **Step 3: Commit**

```
git add src/components/AddEdgeModal.svelte
git commit -m "feat: add AddEdgeModal component"
```

---

### Task 6: RoomGraph integration

**Files:**
- Modify: `src/components/RoomGraph.svelte`

**Interfaces:**
- Consumes: `computeFrontier` (Task 2), updated `buildElements` (Task 3), updated `LAYOUT_NAMES`/`LayoutName` (Task 4), `AddEdgeModal` (Task 5), `userEdges`/`addUserEdge`/`markExplored` from workspace store (Task 1)

This is the most complex task. The new `RoomGraph.svelte` replaces the old one entirely. Key behaviors:

1. **Initial mount**: build from `explored` + `frontier` with `preset` layout (uses saved positions)
2. **Incremental sync**: when `explored`/`userEdges`/`currentRoom` changes, add new nodes/edges to Cytoscape without rebuilding existing ones
3. **Position saving**: new nodes without a saved position get auto-placed at `source.x + 160, y` staggered by column occupancy
4. **Re-flow**: full layout run via selected engine, saves all resulting positions
5. **Dev: load all**: adds all 45 rooms + all obvious edges in one shot for layout testing
6. **Modal**: "Add Edge" button opens `AddEdgeModal`
7. **Styles**: frontier nodes get dashed border + 60% opacity; user edges are amber

- [ ] **Step 1: Replace `src/components/RoomGraph.svelte`**

```svelte
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
    runAndFit();
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
```

- [ ] **Step 2: Run all tests**

```
npm run test
```

Expected: all pass (elements, frontier, workspace tests)

- [ ] **Step 3: Type check**

```
npm run check
```

Expected: no errors

- [ ] **Step 4: Start dev server and manually verify**

```
npm run dev
```

Open the app in a browser and verify:
- Graph starts with only room `01` visible (explored) and its obvious neighbors (20, 21, 26, 41) as frontier nodes (dashed, dimmed)
- Clicking a frontier node navigates to it and makes it explored (solid, gold border)
- New frontier nodes from the newly explored room appear in the graph
- "Re-flow" button runs the selected layout engine and fits the view
- Switching layout dropdown and re-flowing changes the arrangement
- "Dev: load all" adds all 45 rooms and all obvious edges, then reflowed
- "Add Edge" opens the modal; submitting `from=01`, `to=17`, one-way adds an amber arrow in the graph
- The amber arrow appears correctly after submitting
- Closing modal with Escape or Cancel works
- Dragging a node saves its position (survives page refresh)

- [ ] **Step 5: Commit**

```
git add src/components/RoomGraph.svelte
git commit -m "feat: fog-of-war graph with incremental placement, ELK, and add-edge modal"
```

---

## Self-Review

**Spec coverage:**
- ✅ `explored` tier (existing store, new rendering logic)
- ✅ `frontier` tier (`computeFrontier`, frontier class in elements + Cytoscape style)
- ✅ `userEdges` persisted in WorkspaceDoc, `addUserEdge` helper
- ✅ Export/import backward-compat (`userEdges ?? []`)
- ✅ 4 edge styles (obvious-two-way, obvious-one-way, user-two-way, user-one-way)
- ✅ dagre-LR and elk-layered layout options
- ✅ Incremental node placement with position saving
- ✅ Re-flow saves positions post-layout
- ✅ AddEdgeModal with From/To inputs, direction radio, Escape key
- ✅ "Dev: load all" button bypasses fog-of-war (local, no store mutation for explored)
- ✅ Clicking any node (explored or frontier) marks it explored and navigates

**Type consistency check:**
- `UserEdge` defined in `types.ts` (Task 1), used in `idb.ts`, `workspace.ts`, `frontier.ts`, `elements.ts`, `RoomGraph.svelte`, `AddEdgeModal.svelte` — consistent
- `buildElements` signature updated in Task 3 — RoomGraph in Task 6 uses the new signature — consistent
- `LAYOUT_NAMES` / `LayoutName` updated in Task 4 — RoomGraph uses the new type — consistent
- `addUserEdge` exported from `workspace.ts` (Task 1), imported in `AddEdgeModal.svelte` (Task 5) — consistent
- Edge IDs: `d${originalIndex}` for obvious, `u${originalIndex}` for user — consistent between `elements.ts` (Task 3) and `RoomGraph.svelte` (Task 6)
