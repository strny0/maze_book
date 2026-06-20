# The Maze — Book Companion App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lightweight, browser-stored Svelte app to explore and annotate the 1985 puzzle book *The Maze*, with vector ink on room images, markdown notes, text/image annotations, tags, and an interactive door graph.

**Architecture:** Vite + Svelte + TypeScript SPA. Three layers: (1) static seed data in `public/assets/` parsed once into IndexedDB, (2) Svelte stores as reactive state, (3) an IndexedDB persistence layer with JSON export/import. Content ("the book") and Workspace ("my solving work") are two independent stores so the app can later ship without bundled assets.

**Tech Stack:** Vite, Svelte 4, TypeScript, `idb` (IndexedDB), `cytoscape` + `cytoscape-fcose` + `cytoscape-cola` + `cytoscape-dagre`, `perfect-freehand`, `marked`, `dompurify`, `vitest`.

## Global Constraints

- **Run model:** builds to static files via `npm run build`; dev via `npm run dev`. No backend.
- **Storage:** IndexedDB only (via `idb`). No localStorage for app data. Manual export/import as `.json`.
- **Two data layers, never mixed:** `content` store (rooms/doors) and `workspace` store (notes/ink/annotations/pins/tags/positions/explored/global notes). Workspace references rooms by string id.
- **Room ids are zero-padded strings:** `"00"` (prologue/entrance) and `"01"`–`"45"`. Never use numbers as ids.
- **Seed parsing:** parse `assets/maze.txt` IGNORING every line whose first non-space char is `#`. Secret passages are NOT seeded.
- **TDD:** pure logic (parsers, store reducers, persistence, annotation anchoring) gets Vitest unit tests first. Visual/interactive components get a build-passes check plus a manual browser verification step.
- **Frequent commits:** one commit per task minimum.
- **No copyrighted text in code or tests:** tests use synthetic room text (e.g. `"para one"`), never the book's actual prose.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, svelte.config.js, index.html
public/assets/                  # copied from ./assets (content.json, maze.txt, images/)
src/
  main.ts                       # mount App
  App.svelte                    # layout shell: core (image+notes) + drawers
  lib/
    types.ts                    # shared TS types
    seed/parseMaze.ts           # maze.txt -> Door[]
    seed/parseContent.ts        # content.json -> Room[]
    db/idb.ts                   # open DB, get/set content & workspace docs
    db/bootstrap.ts             # seed content store on first run
    db/exportImport.ts          # serialize/restore JSON files
    stores/content.ts           # rooms, doors (readable)
    stores/workspace.ts         # currentRoom, explored, notes, ink, annotations, pins, tags, positions, globalNotes (+ autosave)
    ink/freehand.ts             # stroke -> SVG path via perfect-freehand
    text/annotations.ts         # anchoring + range application helpers
    markdown/render.ts          # marked + dompurify + [[room NN]] wiki-links
    graph/elements.ts           # rooms+doors+positions -> cytoscape elements
    graph/layouts.ts            # layout configs registry
  components/
    RoomImage.svelte            # image + ink canvas + pins
    Notes.svelte                # markdown editor/preview
    LeftDrawer.svelte           # hover-reveal + lock wrapper
    BottomDrawer.svelte         # hover-reveal + lock wrapper
    CurrentRoom.svelte          # number, doors, prev/next, explored count
    RoomDirectory.svelte        # grid/list + tag filter
    RoomText.svelte             # Text/Comments tabs + highlight popover
    RoomGraph.svelte            # cytoscape host + layout dropdown
    GlobalNotes.svelte          # global notebook
  styles/theme.css              # colors/tokens from prototype
```

---

## Task 1: Project scaffold

**Files:**
- Delete: `src/` (old React+Vite template)
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/styles/theme.css`
- Create: `public/assets/` (copy of `./assets/`)

**Interfaces:**
- Produces: a running Vite+Svelte+TS dev server mounting `App.svelte`; `vitest` runnable.

- [ ] **Step 1: Remove old template and copy assets**

```bash
rm -rf src
mkdir -p public
cp -r assets public/assets
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "maze-book-companion",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.1.2",
    "@tsconfig/svelte": "^5.0.4",
    "svelte": "^4.2.19",
    "svelte-check": "^3.8.6",
    "tslib": "^2.7.0",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2",
    "jsdom": "^25.0.1"
  },
  "dependencies": {
    "idb": "^8.0.0",
    "marked": "^14.1.2",
    "dompurify": "^3.1.7",
    "perfect-freehand": "^1.2.2",
    "cytoscape": "^3.30.2",
    "cytoscape-fcose": "^2.2.0",
    "cytoscape-cola": "^2.5.1",
    "cytoscape-dagre": "^2.5.0"
  }
}
```

- [ ] **Step 3: Create config files**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  base: "./",
  test: { environment: "jsdom", globals: true },
});
```

`svelte.config.js`:
```js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
export default { preprocess: vitePreprocess() };
```

`tsconfig.json`:
```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["vitest/globals"],
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "strict": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"]
}
```

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Maze — Companion</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.ts`, `src/App.svelte`, `src/styles/theme.css`**

`src/main.ts`:
```ts
import "./styles/theme.css";
import App from "./App.svelte";

const app = new App({ target: document.getElementById("app")! });
export default app;
```

`src/App.svelte`:
```svelte
<script lang="ts">
</script>

<main>
  <h1>The Maze — Companion</h1>
</main>
```

`src/styles/theme.css` (tokens taken from the prototype):
```css
:root {
  --mza: #e2a857;  --mzam: #e2c089;  --mzad: #15110a;  --mzabg: #242f3b;
  --bg: #0d1014;   --panel: #161b22; --line: #222a35;  --text: #cbd3dd;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text);
  font-family: system-ui, sans-serif; }
```

- [ ] **Step 5: Install and verify dev server boots**

Run: `npm install && npm run build`
Expected: build completes with no errors, `dist/` produced.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+Svelte+TS project, remove old template"
```

---

## Task 2: Seed parsers (maze.txt + content.json)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/seed/parseMaze.ts`, `src/lib/seed/parseContent.ts`
- Test: `src/lib/seed/parseMaze.test.ts`, `src/lib/seed/parseContent.test.ts`

**Interfaces:**
- Produces:
  - `interface Room { id: string; title?: string; text: string[]; image: string }`
  - `interface Door { from: string; to: string; oneWay: boolean }`
  - `parseMaze(src: string): Door[]` — ignores `#` lines; a pair present in both directions is `oneWay:false` (emitted once, from<to ordering); a pair present one direction only is `oneWay:true`.
  - `parseContent(json: unknown): Room[]` — maps `prologue` to id `"00"`, `rooms["NN"]` to id `"NN"`.

- [ ] **Step 1: Write failing tests for `parseMaze`**

`src/lib/seed/parseMaze.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseMaze } from "./parseMaze";

describe("parseMaze", () => {
  it("ignores comment lines starting with #", () => {
    const doors = parseMaze("01 -> 20\n# 22 -> ?? secret\n20 -> 01");
    expect(doors.some((d) => d.to.includes("?"))).toBe(false);
  });
  it("marks a bidirectional pair as not one-way, emitted once", () => {
    const doors = parseMaze("01 -> 20\n20 -> 01");
    expect(doors).toEqual([{ from: "01", to: "20", oneWay: false }]);
  });
  it("marks a single-direction pair as one-way", () => {
    const doors = parseMaze("06 -> 40");
    expect(doors).toEqual([{ from: "06", to: "40", oneWay: true }]);
  });
  it("trims whitespace and ignores blank lines", () => {
    const doors = parseMaze("  01 -> 20  \n\n20 -> 01\n");
    expect(doors).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/seed/parseMaze.test.ts`
Expected: FAIL — `parseMaze` not found.

- [ ] **Step 3: Implement `types.ts` and `parseMaze.ts`**

`src/lib/types.ts`:
```ts
export interface Room { id: string; title?: string; text: string[]; image: string }
export interface Door { from: string; to: string; oneWay: boolean }
```

`src/lib/seed/parseMaze.ts`:
```ts
import type { Door } from "../types";

export function parseMaze(src: string): Door[] {
  const pairs = new Set<string>();
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(\d+)\s*->\s*(\d+)$/.exec(line);
    if (!m) continue;
    pairs.add(`${m[1]}->${m[2]}`);
  }
  const doors: Door[] = [];
  const seen = new Set<string>();
  for (const key of pairs) {
    const [from, to] = key.split("->");
    const reverse = `${to}->${from}`;
    const canonical = from < to ? `${from}->${to}` : reverse;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const oneWay = !pairs.has(reverse);
    const [a, b] = canonical.split("->");
    doors.push({ from: a, to: b, oneWay });
  }
  return doors;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/seed/parseMaze.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write failing tests for `parseContent`**

`src/lib/seed/parseContent.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseContent } from "./parseContent";

const sample = {
  prologue: { text: ["p one"], image: "prologue.jpg", title: "PROLOGUE" },
  rooms: {
    "01": { text: ["r one", "r two"], image: "01.jpg" },
    "02": { text: ["x"], image: "02.jpg", title: "TWO" },
  },
};

describe("parseContent", () => {
  it("maps prologue to id 00", () => {
    const rooms = parseContent(sample);
    expect(rooms.find((r) => r.id === "00")?.title).toBe("PROLOGUE");
  });
  it("maps room keys to ids and preserves text arrays", () => {
    const rooms = parseContent(sample);
    expect(rooms.find((r) => r.id === "01")?.text).toEqual(["r one", "r two"]);
  });
  it("sorts rooms by id ascending", () => {
    const ids = parseContent(sample).map((r) => r.id);
    expect(ids).toEqual(["00", "01", "02"]);
  });
});
```

- [ ] **Step 6: Run tests, verify fail**

Run: `npx vitest run src/lib/seed/parseContent.test.ts`
Expected: FAIL — `parseContent` not found.

- [ ] **Step 7: Implement `parseContent.ts`**

`src/lib/seed/parseContent.ts`:
```ts
import type { Room } from "../types";

interface RawRoom { text: string[]; image: string; title?: string }
interface RawContent { prologue: RawRoom; rooms: Record<string, RawRoom> }

export function parseContent(json: unknown): Room[] {
  const data = json as RawContent;
  const rooms: Room[] = [];
  rooms.push({ id: "00", title: data.prologue.title, text: data.prologue.text, image: data.prologue.image });
  for (const [key, r] of Object.entries(data.rooms)) {
    rooms.push({ id: key, title: r.title, text: r.text, image: r.image });
  }
  rooms.sort((a, b) => a.id.localeCompare(b.id));
  return rooms;
}
```

- [ ] **Step 8: Run tests, verify pass**

Run: `npx vitest run src/lib/seed/parseContent.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: seed parsers for maze.txt doors and content.json rooms"
```

---

## Task 3: IndexedDB persistence layer

**Files:**
- Create: `src/lib/db/idb.ts`
- Test: `src/lib/db/idb.test.ts`

**Interfaces:**
- Produces:
  - `interface ContentDoc { rooms: Room[]; doors: Door[]; meta: { name: string; version: number } }`
  - `interface WorkspaceDoc { rooms: Record<string, RoomWork>; explored: string[]; tags: TagState; positions: Record<string, {x:number;y:number}>; globalNotes: string }`
  - `getContent(): Promise<ContentDoc | undefined>` / `setContent(doc): Promise<void>`
  - `getWorkspace(): Promise<WorkspaceDoc | undefined>` / `setWorkspace(doc): Promise<void>`
- Consumes: `Room`, `Door` from Task 2.

- [ ] **Step 1: Write failing test (jsdom + fake-indexeddb)**

Add dev dep first: `npm install -D fake-indexeddb`

`src/lib/db/idb.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { getContent, setContent, getWorkspace, setWorkspace } from "./idb";

describe("idb", () => {
  it("round-trips a content doc", async () => {
    await setContent({ rooms: [{ id: "00", text: ["a"], image: "p.jpg" }], doors: [], meta: { name: "seed", version: 1 } });
    const got = await getContent();
    expect(got?.rooms[0].id).toBe("00");
  });
  it("returns undefined for empty workspace", async () => {
    expect(await getWorkspace()).toBeUndefined();
  });
  it("round-trips a workspace doc", async () => {
    await setWorkspace({ rooms: {}, explored: ["01"], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "hi" });
    expect((await getWorkspace())?.explored).toEqual(["01"]);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/db/idb.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `idb.ts`**

`src/lib/db/idb.ts`:
```ts
import { openDB, type IDBPDatabase } from "idb";
import type { Room, Door } from "../types";

export interface RoomWork {
  notes: string;
  ink: { tool: "pen" | "highlighter"; color: string; points: number[][] }[];
  annotations: TextAnnotation[];
  pins: Pin[];
}
export interface TextAnnotation {
  paraIndex: number; start: number; end: number;
  textColor?: string; highlight?: string; bold?: boolean; italic?: boolean; comment?: string;
}
export interface Pin { x: number; y: number; label: string; target?: string; note?: string }
export interface TagState { defs: { name: string; color: string }[]; byRoom: Record<string, string[]> }

export interface ContentDoc { rooms: Room[]; doors: Door[]; meta: { name: string; version: number } }
export interface WorkspaceDoc {
  rooms: Record<string, RoomWork>;
  explored: string[];
  tags: TagState;
  positions: Record<string, { x: number; y: number }>;
  globalNotes: string;
}

const DB_NAME = "maze-companion";
const STORE = "docs";
let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbp) dbp = openDB(DB_NAME, 1, { upgrade(d) { d.createObjectStore(STORE); } });
  return dbp;
}

export async function getContent() { return (await db()).get(STORE, "content") as Promise<ContentDoc | undefined>; }
export async function setContent(doc: ContentDoc) { await (await db()).put(STORE, doc, "content"); }
export async function getWorkspace() { return (await db()).get(STORE, "workspace") as Promise<WorkspaceDoc | undefined>; }
export async function setWorkspace(doc: WorkspaceDoc) { await (await db()).put(STORE, doc, "workspace"); }
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/db/idb.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: IndexedDB persistence layer for content and workspace docs"
```

---

## Task 4: Seed bootstrap

**Files:**
- Create: `src/lib/db/bootstrap.ts`
- Test: `src/lib/db/bootstrap.test.ts`

**Interfaces:**
- Produces: `bootstrapContent(fetchText, fetchJson): Promise<ContentDoc>` — if `getContent()` is empty, parse seed and `setContent`; returns the content doc. `fetchText`/`fetchJson` are injected so tests don't hit the network.
- Consumes: `parseMaze`, `parseContent` (Task 2), `getContent`/`setContent` (Task 3).

- [ ] **Step 1: Write failing test**

`src/lib/db/bootstrap.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { bootstrapContent } from "./bootstrap";

const json = { prologue: { text: ["p"], image: "prologue.jpg", title: "PROLOGUE" },
  rooms: { "01": { text: ["a"], image: "01.jpg" } } };

describe("bootstrapContent", () => {
  it("seeds content store when empty", async () => {
    const doc = await bootstrapContent(async () => "01 -> 00\n00 -> 01", async () => json);
    expect(doc.rooms.map((r) => r.id)).toContain("01");
    expect(doc.doors).toEqual([{ from: "00", to: "01", oneWay: false }]);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/db/bootstrap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `bootstrap.ts`**

`src/lib/db/bootstrap.ts`:
```ts
import { parseMaze } from "../seed/parseMaze";
import { parseContent } from "../seed/parseContent";
import { getContent, setContent, type ContentDoc } from "./idb";

export async function bootstrapContent(
  fetchText: (url: string) => Promise<string>,
  fetchJson: (url: string) => Promise<unknown>
): Promise<ContentDoc> {
  const existing = await getContent();
  if (existing) return existing;
  const [mazeSrc, contentJson] = await Promise.all([
    fetchText("assets/maze.txt"),
    fetchJson("assets/content.json"),
  ]);
  const doc: ContentDoc = {
    rooms: parseContent(contentJson),
    doors: parseMaze(mazeSrc),
    meta: { name: "The Maze (seed)", version: 1 },
  };
  await setContent(doc);
  return doc;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/db/bootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed bootstrap into content store on first run"
```

---

## Task 5: Stores + autosave wiring

**Files:**
- Create: `src/lib/stores/content.ts`, `src/lib/stores/workspace.ts`
- Modify: `src/App.svelte`
- Test: `src/lib/stores/workspace.test.ts`

**Interfaces:**
- Produces:
  - content store: `rooms` (writable `Room[]`), `doors` (writable `Door[]`), `roomById` (derived `Map`).
  - workspace store: `currentRoom` (writable string), `explored` (writable `Set<string>`), helpers `getRoomWork(id)`, `updateRoomWork(id, patch)`, `markExplored(id)`, plus `initWorkspace(doc?)` and a `workspaceDoc` derived snapshot that autosaves (debounced 400ms) via `setWorkspace`.
- Consumes: `WorkspaceDoc`, `RoomWork`, `setWorkspace`, `getWorkspace` (Task 3).

- [ ] **Step 1: Write failing test for workspace reducers**

`src/lib/stores/workspace.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import { initWorkspace, explored, markExplored, updateRoomWork, getRoomWork } from "./workspace";

describe("workspace store", () => {
  beforeEach(() => initWorkspace());
  it("marks a room explored", () => {
    markExplored("05");
    expect(get(explored).has("05")).toBe(true);
  });
  it("patches room work immutably", () => {
    updateRoomWork("05", { notes: "hello" });
    expect(getRoomWork("05").notes).toBe("hello");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/stores/workspace.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `content.ts`**

`src/lib/stores/content.ts`:
```ts
import { writable, derived } from "svelte/store";
import type { Room, Door } from "../types";

export const rooms = writable<Room[]>([]);
export const doors = writable<Door[]>([]);
export const roomById = derived(rooms, ($r) => new Map($r.map((x) => [x.id, x])));

export function loadContent(r: Room[], d: Door[]) { rooms.set(r); doors.set(d); }

export function doorsFrom(allDoors: Door[], id: string): string[] {
  const out = new Set<string>();
  for (const d of allDoors) {
    if (d.from === id) out.add(d.to);
    if (d.to === id && !d.oneWay) out.add(d.from);
  }
  return [...out].sort();
}
```

- [ ] **Step 4: Implement `workspace.ts`**

`src/lib/stores/workspace.ts`:
```ts
import { writable, derived, get } from "svelte/store";
import { setWorkspace, type WorkspaceDoc, type RoomWork } from "../db/idb";

const EMPTY_WORK: RoomWork = { notes: "", ink: [], annotations: [], pins: [] };

export const currentRoom = writable<string>("00");
export const explored = writable<Set<string>>(new Set());
export const roomWork = writable<Record<string, RoomWork>>({});
export const tags = writable<WorkspaceDoc["tags"]>({ defs: [], byRoom: {} });
export const positions = writable<Record<string, { x: number; y: number }>>({});
export const globalNotes = writable<string>("");

export function initWorkspace(doc?: WorkspaceDoc) {
  currentRoom.set("00");
  explored.set(new Set(doc?.explored ?? []));
  roomWork.set(doc?.rooms ?? {});
  tags.set(doc?.tags ?? { defs: [], byRoom: {} });
  positions.set(doc?.positions ?? {});
  globalNotes.set(doc?.globalNotes ?? "");
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

export const workspaceDoc = derived(
  [roomWork, explored, tags, positions, globalNotes],
  ([$rw, $ex, $tg, $pos, $gn]): WorkspaceDoc => ({
    rooms: $rw, explored: [...$ex], tags: $tg, positions: $pos, globalNotes: $gn,
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

- [ ] **Step 5: Run test, verify pass**

Run: `npx vitest run src/lib/stores/workspace.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire bootstrap + stores into `App.svelte`**

`src/App.svelte`:
```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { bootstrapContent } from "./lib/db/bootstrap";
  import { getWorkspace } from "./lib/db/idb";
  import { loadContent } from "./lib/stores/content";
  import { initWorkspace, startAutosave, currentRoom } from "./lib/stores/workspace";
  import { rooms } from "./lib/stores/content";

  let ready = false;
  onMount(async () => {
    const content = await bootstrapContent(
      (u) => fetch(u).then((r) => r.text()),
      (u) => fetch(u).then((r) => r.json())
    );
    loadContent(content.rooms, content.doors);
    initWorkspace(await getWorkspace());
    startAutosave();
    ready = true;
  });
</script>

{#if ready}
  <main>
    <p>Loaded {$rooms.length} rooms. Current: {$currentRoom}</p>
  </main>
{:else}
  <p>Loading…</p>
{/if}
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`, open the served URL.
Expected: page shows "Loaded 46 rooms. Current: 00". Reload — still loads (content from IDB, no refetch error in console).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: content + workspace stores with debounced IndexedDB autosave"
```

---

## Task 6: Export / Import

**Files:**
- Create: `src/lib/db/exportImport.ts`
- Test: `src/lib/db/exportImport.test.ts`

**Interfaces:**
- Produces:
  - `serializeWorkspace(doc): string` / `parseWorkspace(text): WorkspaceDoc`
  - `serializeContent(doc): string` / `parseContent2(text): ContentDoc`
  - `downloadJson(filename, text): void` (browser-only; not unit-tested)
- Consumes: `WorkspaceDoc`, `ContentDoc` (Task 3).

- [ ] **Step 1: Write failing test**

`src/lib/db/exportImport.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { serializeWorkspace, parseWorkspace } from "./exportImport";

describe("export/import", () => {
  it("round-trips a workspace doc through JSON", () => {
    const doc = { rooms: { "01": { notes: "n", ink: [], annotations: [], pins: [] } },
      explored: ["01"], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "g" };
    expect(parseWorkspace(serializeWorkspace(doc))).toEqual(doc);
  });
  it("throws on malformed json", () => {
    expect(() => parseWorkspace("{not json")).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/db/exportImport.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `exportImport.ts`**

`src/lib/db/exportImport.ts`:
```ts
import type { WorkspaceDoc, ContentDoc } from "./idb";

export function serializeWorkspace(doc: WorkspaceDoc): string { return JSON.stringify(doc, null, 2); }
export function parseWorkspace(text: string): WorkspaceDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d)) throw new Error("Invalid workspace file");
  return d as WorkspaceDoc;
}
export function serializeContent(doc: ContentDoc): string { return JSON.stringify(doc, null, 2); }
export function parseContent2(text: string): ContentDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d) || !("doors" in d)) throw new Error("Invalid content file");
  return d as ContentDoc;
}
export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/db/exportImport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: workspace/content JSON export and import"
```

---

## Task 7: Room Image panel with vector ink

**Files:**
- Create: `src/lib/ink/freehand.ts`, `src/components/RoomImage.svelte`
- Modify: `src/App.svelte`
- Test: `src/lib/ink/freehand.test.ts`

**Interfaces:**
- Produces:
  - `strokeToPath(points: number[][], opts?): string` — perfect-freehand outline → SVG path `d`.
  - `RoomImage.svelte` props: `room: Room`. Renders image, an SVG ink overlay bound to `getRoomWork(room.id).ink`, pen/highlighter/eraser tools, color palette, zoom/pan, hide-ink, reset. Persists ink via `updateRoomWork`.
- Consumes: `getRoomWork`, `updateRoomWork` (Task 5); `Room` (Task 2).

- [ ] **Step 1: Write failing test for `strokeToPath`**

`src/lib/ink/freehand.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { strokeToPath } from "./freehand";

describe("strokeToPath", () => {
  it("returns empty string for no points", () => {
    expect(strokeToPath([])).toBe("");
  });
  it("returns an SVG path starting with M for a stroke", () => {
    const d = strokeToPath([[0, 0], [10, 10], [20, 5]]);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("Z");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/ink/freehand.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `freehand.ts`**

`src/lib/ink/freehand.ts`:
```ts
import { getStroke } from "perfect-freehand";

export function strokeToPath(points: number[][], opts: { size?: number } = {}): string {
  if (points.length === 0) return "";
  const outline = getStroke(points, { size: opts.size ?? 6, thinning: 0.6, smoothing: 0.5 });
  if (outline.length === 0) return "";
  const d = outline.reduce(
    (acc, [x, y], i) => acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `),
    ""
  );
  return d + "Z";
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/ink/freehand.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `RoomImage.svelte`**

`src/components/RoomImage.svelte`:
```svelte
<script lang="ts">
  import type { Room } from "../lib/types";
  import { strokeToPath } from "../lib/ink/freehand";
  import { getRoomWork, updateRoomWork } from "../lib/stores/workspace";

  export let room: Room;

  type Stroke = { tool: "pen" | "highlighter"; color: string; points: number[][] };
  let tool: "pen" | "highlighter" | "eraser" = "pen";
  let color = "#e2a857";
  const colors = ["#ff6b6b", "#e2a857", "#f3a45b", "#4ec3e0", "#5fd38d", "#ffffff"];
  let strokes: Stroke[] = [];
  let current: Stroke | null = null;
  let hideInk = false;
  let svg: SVGSVGElement;

  $: strokes = (getRoomWork(room.id).ink as Stroke[]) ?? [];

  function persist() { updateRoomWork(room.id, { ink: strokes }); }
  function pt(e: PointerEvent): number[] {
    const r = svg.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5];
  }
  function down(e: PointerEvent) {
    if (tool === "eraser") return;
    current = { tool, color, points: [pt(e)] };
    strokes = [...strokes, current];
  }
  function move(e: PointerEvent) {
    if (!current) return;
    current.points.push(pt(e));
    strokes = strokes;
  }
  function up() { if (current) { current = null; persist(); } }
  function eraseStroke(i: number) {
    if (tool !== "eraser") return;
    strokes = strokes.filter((_, j) => j !== i);
    persist();
  }
  function reset() { strokes = []; persist(); }
</script>

<div class="toolbar">
  {#each (["pen", "highlighter", "eraser"] as const) as t}
    <button class:active={tool === t} on:click={() => (tool = t)}>{t}</button>
  {/each}
  {#each colors as c}
    <button class="swatch" style="background:{c}" class:active={color === c} on:click={() => (color = c)} aria-label={c}></button>
  {/each}
  <button on:click={() => (hideInk = !hideInk)}>{hideInk ? "show ink" : "hide ink"}</button>
  <button on:click={reset}>reset</button>
</div>

<div class="canvas">
  <img src={`assets/images/${room.image.includes("/") ? room.image : (room.id === "00" ? room.image : "room/" + room.image)}`} alt={`Room ${room.id}`} draggable="false" />
  <svg bind:this={svg} on:pointerdown={down} on:pointermove={move} on:pointerup={up} on:pointerleave={up}>
    {#if !hideInk}
      {#each strokes as s, i}
        <path d={strokeToPath(s.points, { size: s.tool === "highlighter" ? 16 : 6 })}
          fill={s.color} opacity={s.tool === "highlighter" ? 0.35 : 1}
          on:click={() => eraseStroke(i)} />
      {/each}
    {/if}
  </svg>
</div>

<style>
  .canvas { position: relative; width: 100%; }
  .canvas img { width: 100%; display: block; user-select: none; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
  .toolbar { display: flex; gap: 6px; padding: 8px; flex-wrap: wrap; }
  .swatch { width: 22px; height: 22px; border-radius: 50%; border: 1px solid #0006; }
  button.active { outline: 2px solid var(--mza); }
</style>
```

Note on image paths: seed room images live at `assets/images/room/NN.jpg`; prologue/cover at `assets/images/<file>`. The `image` field is the bare filename (e.g. `01.jpg`, `prologue.jpg`). The expression above routes room ids `01`–`45` to `room/` and `00` to the top-level image folder.

- [ ] **Step 6: Render it in `App.svelte`**

Replace the `{#if ready}` block body in `src/App.svelte`:
```svelte
{#if ready}
  <main class="core">
    <section class="image">
      {#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}
    </section>
  </main>
{:else}
  <p>Loading…</p>
{/if}
```
Add to the `<script>`:
```ts
  import RoomImage from "./components/RoomImage.svelte";
  import { roomById } from "./lib/stores/content";
  $: currentRoomObj = $roomById.get($currentRoom);
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`. Expected: room 00 image shows; draw with pen leaves a stroke; switch tool to eraser and click a stroke to remove it; reload — strokes persist.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: room image panel with persistent vector ink"
```

---

## Task 8: Notes panel (markdown) + wiki-links

**Files:**
- Create: `src/lib/markdown/render.ts`, `src/components/Notes.svelte`
- Modify: `src/App.svelte`
- Test: `src/lib/markdown/render.test.ts`

**Interfaces:**
- Produces:
  - `renderMarkdown(src: string): string` — `marked` → DOMPurify-sanitized HTML, with `[[room NN]]` rewritten to `<a data-room="NN" href="#">room NN</a>`.
  - `Notes.svelte` props: `roomId: string`. Write/Preview toggle bound to `getRoomWork(roomId).notes`, persisted via `updateRoomWork`; clicking a wiki-link sets `currentRoom`.
- Consumes: `getRoomWork`, `updateRoomWork`, `currentRoom` (Task 5).

- [ ] **Step 1: Write failing test**

`src/lib/markdown/render.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./render";

describe("renderMarkdown", () => {
  it("renders bold markdown", () => {
    expect(renderMarkdown("**hi**")).toContain("<strong>hi</strong>");
  });
  it("rewrites [[room 22]] into a room link", () => {
    const html = renderMarkdown("see [[room 22]]");
    expect(html).toContain('data-room="22"');
  });
  it("strips script tags", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/markdown/render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `render.ts`**

`src/lib/markdown/render.ts`:
```ts
import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdown(src: string): string {
  const withLinks = src.replace(/\[\[room\s*(\d{1,2})\]\]/gi, (_m, n) => {
    const id = String(n).padStart(2, "0");
    return `<a data-room="${id}" href="#">room ${id}</a>`;
  });
  const html = marked.parse(withLinks, { async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ["data-room"] });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/markdown/render.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `Notes.svelte`**

`src/components/Notes.svelte`:
```svelte
<script lang="ts">
  import { renderMarkdown } from "../lib/markdown/render";
  import { getRoomWork, updateRoomWork, currentRoom } from "../lib/stores/workspace";

  export let roomId: string;
  let mode: "write" | "preview" = "write";
  let value = "";
  $: value = getRoomWork(roomId).notes;

  function onInput(e: Event) {
    value = (e.target as HTMLTextAreaElement).value;
    updateRoomWork(roomId, { notes: value });
  }
  function onPreviewClick(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest("a[data-room]");
    if (a) { e.preventDefault(); currentRoom.set(a.getAttribute("data-room")!); }
  }
</script>

<div class="tabs">
  <button class:active={mode === "write"} on:click={() => (mode = "write")}>Write</button>
  <button class:active={mode === "preview"} on:click={() => (mode = "preview")}>Preview</button>
</div>
{#if mode === "write"}
  <textarea value={value} on:input={onInput} placeholder="Markdown — # heading, **bold**, [[room 22]]…"></textarea>
{:else}
  <div class="mdview" on:click={onPreviewClick}>{@html renderMarkdown(value)}</div>
{/if}

<style>
  .tabs { display: flex; gap: 6px; padding: 6px 8px; }
  button.active { color: var(--mza); }
  textarea { width: 100%; min-height: 240px; background: #0a0e13; color: var(--text);
    border: 1px solid var(--line); border-radius: 8px; padding: 12px; resize: vertical; }
  .mdview { padding: 4px 8px; }
</style>
```

- [ ] **Step 6: Add to `App.svelte` core**

In `src/App.svelte`, import and render inside `<main class="core">`:
```svelte
  import Notes from "./components/Notes.svelte";
```
```svelte
    <section class="notes"><Notes roomId={$currentRoom} /></section>
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`. Type `**bold** and [[room 05]]` in Write, switch to Preview — bold renders, the link is clickable and navigates to room 05. Reload — note persists.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: markdown notes panel with wiki-links"
```

---

## Task 9: Hover-reveal lockable drawers + Current Room + Directory

**Files:**
- Create: `src/components/LeftDrawer.svelte`, `src/components/BottomDrawer.svelte`, `src/components/CurrentRoom.svelte`, `src/components/RoomDirectory.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Produces:
  - `LeftDrawer.svelte` / `BottomDrawer.svelte`: slots; hover the screen edge to reveal, a lock button to pin. Props: `side` is implicit per component. Emits nothing; manages its own `locked`/`open` state. When unlocked it is `position: fixed` overlay (does not affect layout).
  - `CurrentRoom.svelte`: shows `$currentRoom`, title, doors-from-here chips (click → navigate + markExplored), prev/next, explored count.
  - `RoomDirectory.svelte`: grid/list toggle of all rooms, click → navigate; current room highlighted.
- Consumes: `currentRoom`, `explored`, `markExplored` (Task 5); `rooms`, `doors`, `doorsFrom` (Task 5 content).

- [ ] **Step 1: Implement `CurrentRoom.svelte`**

`src/components/CurrentRoom.svelte`:
```svelte
<script lang="ts">
  import { rooms, doors, doorsFrom, roomById } from "../lib/stores/content";
  import { currentRoom, explored, markExplored } from "../lib/stores/workspace";

  $: ids = $rooms.map((r) => r.id);
  $: room = $roomById.get($currentRoom);
  $: outs = doorsFrom($doors, $currentRoom);
  $: idx = ids.indexOf($currentRoom);

  function go(id: string) { currentRoom.set(id); markExplored(id); }
  function prev() { if (idx > 0) go(ids[idx - 1]); }
  function next() { if (idx < ids.length - 1) go(ids[idx + 1]); }
</script>

<div class="cur">
  <div class="big">{$currentRoom}</div>
  <div class="meta">
    <div class="title">{room?.title ?? `Room ${$currentRoom}`}</div>
    <div class="count">{$explored.size} / {ids.length} explored</div>
  </div>
</div>
<div class="doors">
  {#each outs as d}<button class="chip" on:click={() => go(d)}>{d}</button>{/each}
</div>
<div class="nav">
  <button on:click={prev} disabled={idx <= 0}>‹ prev</button>
  <button on:click={next} disabled={idx >= ids.length - 1}>next ›</button>
</div>

<style>
  .cur { display: flex; gap: 12px; align-items: center; }
  .big { font-size: 48px; font-weight: 700; color: var(--mza); }
  .doors { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { background: #1c232d; color: var(--mzam); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; }
  .nav { display: flex; gap: 8px; }
</style>
```

- [ ] **Step 2: Implement `RoomDirectory.svelte`**

`src/components/RoomDirectory.svelte`:
```svelte
<script lang="ts">
  import { rooms, doors, doorsFrom } from "../lib/stores/content";
  import { currentRoom, explored, markExplored } from "../lib/stores/workspace";
  let view: "grid" | "list" = "grid";
  function go(id: string) { currentRoom.set(id); markExplored(id); }
</script>

<div class="head">
  <span>Room Directory</span>
  <span>
    <button class:active={view === "grid"} on:click={() => (view = "grid")}>Grid</button>
    <button class:active={view === "list"} on:click={() => (view = "list")}>List</button>
  </span>
</div>

{#if view === "grid"}
  <div class="grid">
    {#each $rooms as r}
      <button class="cell" class:cur={r.id === $currentRoom} class:seen={$explored.has(r.id)}
        on:click={() => go(r.id)}>{r.id}</button>
    {/each}
  </div>
{:else}
  <div class="list">
    {#each $rooms as r}
      <button class="row" class:cur={r.id === $currentRoom} on:click={() => go(r.id)}>
        <span>{r.id}</span><span class="d">{doorsFrom($doors, r.id).join(" ")}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .head { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .head button.active { color: var(--mza); }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .cell { padding: 8px 0; background: #161b22; border: 1px solid var(--line); border-radius: 6px;
    color: var(--text); cursor: pointer; }
  .cell.seen { border-color: var(--mza); }
  .cell.cur, .row.cur { background: var(--mza); color: #15110a; }
  .list { display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; justify-content: space-between; padding: 8px; background: #161b22;
    border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer; }
  .d { color: var(--mzam); font-size: 12px; }
</style>
```

- [ ] **Step 3: Implement `LeftDrawer.svelte`**

`src/components/LeftDrawer.svelte`:
```svelte
<script lang="ts">
  let locked = false;
  let hovering = false;
  $: open = locked || hovering;
</script>

<div class="edge" role="presentation"
  on:mouseenter={() => (hovering = true)} on:mouseleave={() => (hovering = false)}>
  <aside class="panel" class:open class:locked>
    <button class="lock" on:click={() => (locked = !locked)} title={locked ? "unlock" : "lock open"}>
      {locked ? "🔒" : "🔓"}
    </button>
    <div class="body"><slot /></div>
  </aside>
</div>

<style>
  .edge { position: fixed; top: 0; left: 0; height: 100%; width: 14px; z-index: 20; }
  .panel { position: fixed; top: 0; left: 0; height: 100%; width: 360px; background: var(--panel);
    border-right: 1px solid var(--line); transform: translateX(-100%);
    transition: transform .28s ease; overflow-y: auto; padding: 14px; }
  .panel.open { transform: translateX(0); }
  .lock { position: absolute; top: 8px; right: 8px; background: none; border: none;
    color: var(--mza); cursor: pointer; font-size: 16px; }
</style>
```

- [ ] **Step 4: Implement `BottomDrawer.svelte`**

`src/components/BottomDrawer.svelte`:
```svelte
<script lang="ts">
  let locked = false;
  let hovering = false;
  $: open = locked || hovering;
</script>

<div class="edge" role="presentation"
  on:mouseenter={() => (hovering = true)} on:mouseleave={() => (hovering = false)}>
  <section class="panel" class:open>
    <button class="lock" on:click={() => (locked = !locked)} title={locked ? "unlock" : "lock open"}>
      {locked ? "🔒" : "🔓"}
    </button>
    <div class="body"><slot /></div>
  </section>
</div>

<style>
  .edge { position: fixed; left: 0; bottom: 0; width: 100%; height: 16px; z-index: 20; }
  .panel { position: fixed; left: 0; bottom: 0; width: 100%; height: 60vh; background: var(--panel);
    border-top: 1px solid var(--line); transform: translateY(100%);
    transition: transform .28s ease; padding: 14px; }
  .panel.open { transform: translateY(0); }
  .lock { position: absolute; top: 8px; right: 12px; background: none; border: none;
    color: var(--mza); cursor: pointer; font-size: 16px; }
</style>
```

- [ ] **Step 5: Compose in `App.svelte`**

`src/App.svelte` template (keep the `<script>` from prior tasks, add drawer imports + `CurrentRoom`/`RoomDirectory`):
```svelte
{#if ready}
  <LeftDrawer>
    <CurrentRoom />
    <hr />
    <RoomDirectory />
  </LeftDrawer>

  <main class="core">
    <section class="image">{#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}</section>
    <section class="notes"><Notes roomId={$currentRoom} /></section>
  </main>

  <BottomDrawer>
    <p>Room graph goes here (Task 10)</p>
  </BottomDrawer>
{:else}
  <p>Loading…</p>
{/if}
```
Add imports to `<script>`:
```ts
  import LeftDrawer from "./components/LeftDrawer.svelte";
  import BottomDrawer from "./components/BottomDrawer.svelte";
  import CurrentRoom from "./components/CurrentRoom.svelte";
  import RoomDirectory from "./components/RoomDirectory.svelte";
```
Add core layout CSS to the component `<style>`:
```svelte
<style>
  .core { display: grid; grid-template-columns: 1fr 460px; gap: 14px; height: 100vh;
    padding: 14px; }
  .image, .notes { background: var(--panel); border: 1px solid var(--line);
    border-radius: 10px; overflow: auto; }
</style>
```

- [ ] **Step 6: Verify in browser**

Run: `npm run dev`. Expected: clean image+notes layout; moving the mouse to the left edge slides the room panel out and back; lock pins it; bottom edge reveals the placeholder; clicking a door chip or a directory cell navigates and marks explored (count rises). Drawers overlay without resizing image/notes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: hover-reveal lockable drawers, current room, directory"
```

---

## Task 10: Room Graph (Cytoscape) with swappable layouts

**Files:**
- Create: `src/lib/graph/elements.ts`, `src/lib/graph/layouts.ts`, `src/components/RoomGraph.svelte`
- Modify: `src/App.svelte` (replace bottom-drawer placeholder)
- Test: `src/lib/graph/elements.test.ts`

**Interfaces:**
- Produces:
  - `buildElements(rooms, doors, current, explored, positions): ElementDefinition[]` — nodes (with `data.id`, classes `current`/`explored`) and edges (class `oneway` when `oneWay`). Includes saved `position` when present.
  - `LAYOUTS: Record<string, (cy) => LayoutOptions>` registry with keys `fcose`, `cola`, `dagre`, `concentric`, `circle`.
  - `RoomGraph.svelte`: mounts cytoscape, layout `<select>`, re-flow button, fit button. Click node → `currentRoom.set(id)`. Dragging a node writes to `positions`.
- Consumes: `rooms`, `doors`, `currentRoom`, `explored`, `positions` (Tasks 5).

- [ ] **Step 1: Write failing test for `buildElements`**

`src/lib/graph/elements.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildElements } from "./elements";

const rooms = [{ id: "00", text: [], image: "p.jpg" }, { id: "01", text: [], image: "01.jpg" }];
const doors = [{ from: "00", to: "01", oneWay: false }];

describe("buildElements", () => {
  it("creates a node per room and an edge per door", () => {
    const els = buildElements(rooms, doors, "00", new Set(), {});
    expect(els.filter((e) => !("source" in (e.data as any)))).toHaveLength(2);
    expect(els.filter((e) => "source" in (e.data as any))).toHaveLength(1);
  });
  it("tags the current node with the current class", () => {
    const els = buildElements(rooms, doors, "00", new Set(), {});
    const node = els.find((e) => (e.data as any).id === "00");
    expect(node?.classes).toContain("current");
  });
  it("applies saved positions", () => {
    const els = buildElements(rooms, doors, "00", new Set(), { "01": { x: 5, y: 9 } });
    expect(els.find((e) => (e.data as any).id === "01")?.position).toEqual({ x: 5, y: 9 });
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/graph/elements.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `elements.ts`**

`src/lib/graph/elements.ts`:
```ts
import type { ElementDefinition } from "cytoscape";
import type { Room, Door } from "../types";

export function buildElements(
  rooms: Room[], doors: Door[], current: string,
  explored: Set<string>, positions: Record<string, { x: number; y: number }>
): ElementDefinition[] {
  const nodes: ElementDefinition[] = rooms.map((r) => {
    const cls: string[] = [];
    if (r.id === current) cls.push("current");
    if (explored.has(r.id)) cls.push("explored");
    const el: ElementDefinition = { data: { id: r.id, label: r.id }, classes: cls.join(" ") };
    if (positions[r.id]) el.position = { ...positions[r.id] };
    return el;
  });
  const edges: ElementDefinition[] = doors.map((d, i) => ({
    data: { id: `e${i}`, source: d.from, target: d.to },
    classes: d.oneWay ? "oneway" : "",
  }));
  return [...nodes, ...edges];
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/graph/elements.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `layouts.ts`**

`src/lib/graph/layouts.ts`:
```ts
import type { Core, LayoutOptions } from "cytoscape";

export const LAYOUT_NAMES = ["fcose", "cola", "dagre", "concentric", "circle"] as const;
export type LayoutName = (typeof LAYOUT_NAMES)[number];

export function layoutOptions(name: LayoutName): LayoutOptions {
  switch (name) {
    case "fcose": return { name: "fcose", animate: true, randomize: true } as unknown as LayoutOptions;
    case "cola": return { name: "cola", animate: true } as unknown as LayoutOptions;
    case "dagre": return { name: "dagre", rankDir: "TB" } as unknown as LayoutOptions;
    case "concentric": return { name: "concentric" } as LayoutOptions;
    case "circle": return { name: "circle" } as LayoutOptions;
  }
}

export function runLayout(cy: Core, name: LayoutName) {
  cy.layout(layoutOptions(name)).run();
}
```

- [ ] **Step 6: Implement `RoomGraph.svelte`**

`src/components/RoomGraph.svelte`:
```svelte
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
    cy.nodes().removeClass("current");
    cy.getElementById($currentRoom).addClass("current");
  }

  function reflow() { runLayout(cy, layout); }
  function fit() { cy.fit(undefined, 30); }
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
```

- [ ] **Step 7: Swap placeholder in `App.svelte`**

In `src/App.svelte`, replace the BottomDrawer placeholder content:
```svelte
  <BottomDrawer>
    <RoomGraph />
  </BottomDrawer>
```
Add import:
```ts
  import RoomGraph from "./components/RoomGraph.svelte";
```

- [ ] **Step 8: Add cytoscape extension type shims if needed**

If `npm run check` complains about missing types for the extensions, create `src/cytoscape-ext.d.ts`:
```ts
declare module "cytoscape-fcose";
declare module "cytoscape-cola";
declare module "cytoscape-dagre";
```

- [ ] **Step 9: Verify in browser**

Run: `npm run dev`. Reveal/lock the bottom drawer. Expected: graph of 46 nodes and door edges; current room is gold; clicking a node navigates (and the gold node updates); one-way doors show a blue arrow; changing the layout dropdown re-arranges; dragging a node and reloading keeps its position.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: cytoscape room graph with swappable layouts and persisted positions"
```

---

## Task 11: Room Text panel with highlight/comment annotations

**Files:**
- Create: `src/lib/text/annotations.ts`, `src/components/RoomText.svelte`
- Modify: `src/components/LeftDrawer` usage in `App.svelte` (add RoomText)
- Test: `src/lib/text/annotations.test.ts`

**Interfaces:**
- Produces:
  - `applyAnnotations(paragraph: string, anns: TextAnnotation[]): Segment[]` where `Segment = { text: string; ann?: TextAnnotation }` — splits a paragraph string into styled/un-styled contiguous segments by character offset (handles overlaps by last-wins on conflict, non-overlapping assumed otherwise).
  - `RoomText.svelte` props: `room: Room`. Tabs Text/Comments. On text selection within a paragraph, shows a popover (text color, highlight color, bold, italic, comment) that writes a `TextAnnotation` via `updateRoomWork`. Comments tab lists all annotations with comments.
- Consumes: `TextAnnotation`, `getRoomWork`, `updateRoomWork` (Tasks 3/5).

- [ ] **Step 1: Write failing test for `applyAnnotations`**

`src/lib/text/annotations.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyAnnotations } from "./annotations";

describe("applyAnnotations", () => {
  it("returns the whole paragraph as one plain segment when no annotations", () => {
    expect(applyAnnotations("hello world", [])).toEqual([{ text: "hello world" }]);
  });
  it("splits a paragraph around one annotation", () => {
    const segs = applyAnnotations("hello world", [
      { paraIndex: 0, start: 0, end: 5, bold: true },
    ]);
    expect(segs[0]).toEqual({ text: "hello", ann: { paraIndex: 0, start: 0, end: 5, bold: true } });
    expect(segs[1]).toEqual({ text: " world" });
  });
  it("orders multiple annotations by start offset", () => {
    const segs = applyAnnotations("abcdef", [
      { paraIndex: 0, start: 4, end: 6, italic: true },
      { paraIndex: 0, start: 0, end: 2, bold: true },
    ]);
    expect(segs.map((s) => s.text)).toEqual(["ab", "cd", "ef"]);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/text/annotations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `annotations.ts`**

`src/lib/text/annotations.ts`:
```ts
import type { TextAnnotation } from "../db/idb";

export interface Segment { text: string; ann?: TextAnnotation }

export function applyAnnotations(paragraph: string, anns: TextAnnotation[]): Segment[] {
  const sorted = [...anns].sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let cursor = 0;
  for (const a of sorted) {
    const start = Math.max(a.start, cursor);
    if (start > cursor) segs.push({ text: paragraph.slice(cursor, start) });
    if (a.end > start) { segs.push({ text: paragraph.slice(start, a.end), ann: a }); cursor = a.end; }
  }
  if (cursor < paragraph.length) segs.push({ text: paragraph.slice(cursor) });
  return segs;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/text/annotations.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `RoomText.svelte`**

`src/components/RoomText.svelte`:
```svelte
<script lang="ts">
  import type { Room } from "../lib/types";
  import type { TextAnnotation } from "../lib/db/idb";
  import { applyAnnotations } from "../lib/text/annotations";
  import { getRoomWork, updateRoomWork } from "../lib/stores/workspace";

  export let room: Room;
  let tab: "text" | "comments" = "text";

  $: anns = getRoomWork(room.id).annotations;
  $: byPara = (i: number) => anns.filter((a) => a.paraIndex === i);

  let pop: { paraIndex: number; start: number; end: number; x: number; y: number } | null = null;

  function onMouseUp(paraIndex: number, e: MouseEvent, el: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { pop = null; return; }
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    if (end > start) pop = { paraIndex, start, end, x: e.clientX, y: e.clientY };
  }

  function addAnn(patch: Partial<TextAnnotation>) {
    if (!pop) return;
    const ann: TextAnnotation = { paraIndex: pop.paraIndex, start: pop.start, end: pop.end, ...patch };
    updateRoomWork(room.id, { annotations: [...anns, ann] });
    pop = null;
    window.getSelection()?.removeAllRanges();
  }
  function addComment() {
    const c = prompt("Comment:");
    if (c) addAnn({ comment: c });
  }
  function styleFor(a: TextAnnotation): string {
    const s: string[] = [];
    if (a.textColor) s.push(`color:${a.textColor}`);
    if (a.highlight) s.push(`background:${a.highlight}`);
    if (a.bold) s.push("font-weight:700");
    if (a.italic) s.push("font-style:italic");
    if (a.comment && !a.highlight) s.push("outline:1px solid #ffffff33; border-radius:3px");
    return s.join(";");
  }
</script>

<div class="tabs">
  <button class:active={tab === "text"} on:click={() => (tab = "text")}>Text</button>
  <button class:active={tab === "comments"} on:click={() => (tab = "comments")}>Comments</button>
</div>

{#if tab === "text"}
  {#each room.text as para, i}
    <p class="para" on:mouseup={(e) => onMouseUp(i, e, e.currentTarget)}>
      {#each applyAnnotations(para, byPara(i)) as seg}
        {#if seg.ann}<span style={styleFor(seg.ann)} title={seg.ann.comment ?? ""}>{seg.text}</span>
        {:else}{seg.text}{/if}
      {/each}
    </p>
  {/each}
{:else}
  <ul class="comments">
    {#each anns.filter((a) => a.comment) as a}
      <li><em>“{room.text[a.paraIndex].slice(a.start, a.end)}”</em> — {a.comment}</li>
    {/each}
  </ul>
{/if}

{#if pop}
  <div class="pop" style="left:{pop.x}px; top:{pop.y}px">
    <button on:click={() => addAnn({ bold: true })}><b>B</b></button>
    <button on:click={() => addAnn({ italic: true })}><i>I</i></button>
    <button on:click={() => addAnn({ highlight: "#e2a85755" })}>HL</button>
    <button on:click={() => addAnn({ textColor: "#ff6b6b" })}>Color</button>
    <button on:click={addComment}>💬</button>
  </div>
{/if}

<style>
  .tabs { display: flex; gap: 6px; margin-bottom: 8px; }
  .tabs button.active { color: var(--mza); }
  .para { line-height: 1.6; font-family: Georgia, serif; }
  .pop { position: fixed; transform: translate(-50%, -120%); display: flex; gap: 4px;
    background: #0a0e13; border: 1px solid var(--line); border-radius: 8px; padding: 6px; z-index: 50; }
  .pop button { background: #1c232d; color: var(--text); border: none; border-radius: 5px;
    padding: 4px 8px; cursor: pointer; }
  .comments { padding-left: 16px; }
</style>
```

- [ ] **Step 6: Add RoomText into the LeftDrawer in `App.svelte`**

```svelte
  <LeftDrawer>
    <CurrentRoom />
    <hr />
    {#if currentRoomObj}<RoomText room={currentRoomObj} />{/if}
    <hr />
    <RoomDirectory />
  </LeftDrawer>
```
Add import:
```ts
  import RoomText from "./components/RoomText.svelte";
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`. Open the left drawer; in Text, select a passage → popover appears → click HL (highlights) or 💬 (adds a comment; comment-only shows faint outline, hover shows tooltip). Switch to Comments tab to see the list. Reload — annotations persist.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: room text highlight and comment annotation system"
```

---

## Task 12: Image pins, tags + filtered directory, global notes, export/import UI

**Files:**
- Modify: `src/components/RoomImage.svelte` (add pin mode), `src/components/RoomDirectory.svelte` (tag filter), `src/App.svelte` (toolbar with export/import + global notes)
- Create: `src/components/GlobalNotes.svelte`
- Test: `src/lib/stores/tags.test.ts`

**Interfaces:**
- Produces:
  - `toggleTag(id, name)`, `setTagDef(name, color)` in `workspace.ts`.
  - Pins stored in `RoomWork.pins` with `{x,y,label,note?}` as fraction-of-image coordinates.
  - `GlobalNotes.svelte`: markdown editor bound to `globalNotes` store.
  - App toolbar: Export workspace, Import workspace (file input), Export content.
- Consumes: `tags`, `globalNotes` stores; `serializeWorkspace`/`parseWorkspace`/`downloadJson` (Task 6).

- [ ] **Step 1: Write failing test for tag helpers**

`src/lib/stores/tags.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import { initWorkspace, tags, toggleTag } from "./workspace";

describe("tags", () => {
  beforeEach(() => initWorkspace());
  it("adds then removes a tag on a room", () => {
    toggleTag("05", "clue");
    expect(get(tags).byRoom["05"]).toContain("clue");
    toggleTag("05", "clue");
    expect(get(tags).byRoom["05"] ?? []).not.toContain("clue");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/stores/tags.test.ts`
Expected: FAIL — `toggleTag` not exported.

- [ ] **Step 3: Add tag helpers to `workspace.ts`**

Append to `src/lib/stores/workspace.ts`:
```ts
export function toggleTag(roomId: string, name: string) {
  tags.update((t) => {
    const cur = t.byRoom[roomId] ?? [];
    const next = cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name];
    return { ...t, byRoom: { ...t.byRoom, [roomId]: next } };
  });
}
export function setTagDef(name: string, color: string) {
  tags.update((t) =>
    t.defs.some((d) => d.name === name)
      ? t
      : { ...t, defs: [...t.defs, { name, color }] }
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/stores/tags.test.ts`
Expected: PASS.

- [ ] **Step 5: Add pin mode to `RoomImage.svelte`**

In `src/components/RoomImage.svelte`, add to the toolbar a `pin` tool option (extend the tool union to include `"pin"`), and in the SVG layer add pin rendering + placement:
```svelte
  // in <script>: extend tool type
  let tool: "pen" | "highlighter" | "eraser" | "pin" = "pen";
  $: pins = getRoomWork(room.id).pins;
  function placePin(e: PointerEvent) {
    if (tool !== "pin") return;
    const r = svg.getBoundingClientRect();
    const label = String(pins.length + 1);
    const note = prompt("Pin note (optional):") ?? "";
    updateRoomWork(room.id, { pins: [...pins, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, label, note }] });
  }
```
Add `pin` to the tool buttons `{#each (["pen","highlighter","eraser","pin"] as const) ...}`, call `placePin` from `on:pointerdown` when `tool==="pin"` (guard the draw `down()` to ignore non-draw tools), and render pins after the strokes:
```svelte
    {#each pins as p}
      <g transform={`translate(${p.x * 100}%, ${p.y * 100}%)`}>
        <circle r="10" fill="#ff6b6b" />
        <text text-anchor="middle" dy="3" font-size="10" fill="#fff">{p.label}</text>
        <title>{p.note}</title>
      </g>
    {/each}
```
(Use `cx`/`cy` in image pixel space if percentage transforms misbehave; fractions are stored so pins stay correct across zoom.)

- [ ] **Step 6: Add tag filter to `RoomDirectory.svelte`**

In `src/components/RoomDirectory.svelte`, import `tags` and add an optional active-filter:
```svelte
  import { tags } from "../lib/stores/workspace";
  let filter: string | null = null;
  $: visible = filter ? $rooms.filter((r) => ($tags.byRoom[r.id] ?? []).includes(filter)) : $rooms;
```
Render a filter row of `$tags.defs` buttons (click toggles `filter`) and iterate `visible` instead of `$rooms` in both views.

- [ ] **Step 7: Implement `GlobalNotes.svelte`**

`src/components/GlobalNotes.svelte`:
```svelte
<script lang="ts">
  import { renderMarkdown } from "../lib/markdown/render";
  import { globalNotes } from "../lib/stores/workspace";
  let mode: "write" | "preview" = "write";
</script>
<div class="tabs">
  <button class:active={mode === "write"} on:click={() => (mode = "write")}>Write</button>
  <button class:active={mode === "preview"} on:click={() => (mode = "preview")}>Preview</button>
</div>
{#if mode === "write"}
  <textarea bind:value={$globalNotes} placeholder="Global theories, solution path, riddle log…"></textarea>
{:else}
  <div class="mdview">{@html renderMarkdown($globalNotes)}</div>
{/if}
<style>
  textarea { width: 100%; min-height: 200px; background: #0a0e13; color: var(--text);
    border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
  .tabs { display: flex; gap: 6px; margin-bottom: 6px; }
  .tabs button.active { color: var(--mza); }
</style>
```

- [ ] **Step 8: Add export/import toolbar to `App.svelte`**

Add a small top toolbar (fixed, top-right) with Export/Import:
```svelte
<script lang="ts">
  // add imports
  import { serializeWorkspace, parseWorkspace, downloadJson } from "./lib/db/exportImport";
  import { get } from "svelte/store";
  import { workspaceDoc, initWorkspace } from "./lib/stores/workspace";
  import { setWorkspace } from "./lib/db/idb";

  function exportWs() {
    downloadJson("maze-workspace.json", serializeWorkspace(get(workspaceDoc)));
  }
  async function importWs(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const doc = parseWorkspace(await file.text());
    await setWorkspace(doc);
    initWorkspace(doc);
  }
</script>
```
```svelte
  <div class="topbar">
    <button on:click={exportWs}>Export</button>
    <label class="imp">Import<input type="file" accept="application/json" on:change={importWs} hidden /></label>
  </div>
```
```svelte
<style>
  .topbar { position: fixed; top: 8px; right: 12px; z-index: 30; display: flex; gap: 8px; }
  .topbar button, .imp { background: #1c232d; color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; }
</style>
```
Place `GlobalNotes` inside the left drawer below the directory (or a dedicated section), importing it:
```ts
  import GlobalNotes from "./components/GlobalNotes.svelte";
```

- [ ] **Step 9: Verify in browser**

Run: `npm run dev`.
Expected: select pin tool, click image → numbered pin with hover note persists; tag a room (wire a quick tag button via console or directory) and the filter narrows the directory; global notes persist; Export downloads `maze-workspace.json`; editing then Import of that file restores state; reload keeps everything.

- [ ] **Step 10: Run full test suite + build**

Run: `npm test && npm run build`
Expected: all unit tests pass; production build succeeds.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: image pins, tags + filtered directory, global notes, export/import UI"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Tasks map to spec sections — seed/parsers+bootstrap (Task 2,4 ↔ spec §3), data model/storage (Task 3,6 ↔ §4), content/workspace split (Task 3 stores ↔ §3), core image+notes (Task 7,8 ↔ §5 core), drawers (Task 9 ↔ §5 drawers), graph (Task 10 ↔ §5 graph), text highlight/comments (Task 11 ↔ §5), pins/tags/global/export (Task 12 ↔ §4,§5 features).
- **Image path caveat:** the seed stores bare filenames; the room id → folder mapping lives in `RoomImage.svelte`. If a later content-pack feature stores full paths, revisit that one expression.
- **Cytoscape extension types:** `fcose`/`cola`/`dagre` ship loose types; the `as unknown as LayoutOptions` casts and the `.d.ts` shim (Task 10 Step 8) are intentional.
- **Annotations** assume non-overlapping ranges per paragraph; overlapping selections are split by start order (last-wins on the overlapping slice), acceptable for personal use.
