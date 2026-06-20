# Parchment Theme + Room Image Canvas Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark UI with three warm parchment themes (Manuscript/Engraved/Foxed), give the Room Image card a full prototype-canvas look (mat, blurred-edge bg, vignette, tape, icon toolbar, sticky-note annotations), and apply the same design language to every other component.

**Architecture:** CSS custom properties on `[data-theme]` drive all color/shadow changes; a single Svelte store writes the attribute to `<html>`. RoomImage.svelte gains a world-transform pan/zoom system (like the prototype), an edge-fill bg canvas, and an ImageAnnotation system replacing Pin. All other components are restyled in place — no layout changes.

**Tech Stack:** Svelte 4, TypeScript, Vite/Vitest, Playwright (no config file exists — create one in Task 1). Google Fonts (EB Garamond, IM Fell English, IM Fell English SC, Caveat).

## Global Constraints

- Svelte 4 syntax (no `$props()` rune — use `export let`)
- `npm run dev` → Vite dev server at `http://localhost:5173`
- `npm run test` → Vitest (jsdom)
- `npm run check` → svelte-check TypeScript
- No new routes, no layout restructuring
- Ink stroke data format (`{ tool, color, points: number[][] }` fractional 0-1) must not change — existing saved data must still render correctly
- Pin tool removed entirely; `pins` field in RoomWork left in place but never written to

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `index.html` | Modify | Swap Space Grotesk for parchment fonts |
| `src/styles/theme.css` | Replace | All CSS custom properties for 3 themes + global base styles |
| `src/lib/stores/theme.ts` | Create | Writable theme store with localStorage persistence |
| `src/lib/db/idb.ts` | Modify | Add `ImageAnnotation` interface + `imageAnnotations` field to `RoomWork` |
| `src/lib/stores/workspace.ts` | Modify | Add `imageAnnotations: []` to `EMPTY_WORK` |
| `src/components/OptionsDialog.svelte` | Create | Modal: theme picker + export/import |
| `src/App.svelte` | Modify | Theme init, cog button on Notes card, OptionsDialog, remove old Export/Import |
| `src/components/RoomImage.svelte` | Replace | Icon toolbar, world-transform canvas, bg fill, vignette, tape, annotations |
| `src/components/CurrentRoom.svelte` | Modify | Typography + beveled buttons |
| `src/components/RoomDirectory.svelte` | Modify | Segmented control + beveled cells |
| `src/components/Notes.svelte` | Modify | Tabs, textarea, Caveat font |
| `src/components/RoomText.svelte` | Modify | EB Garamond body text |

---

## Task 1: Theme CSS variables + Google Fonts

**Files:**
- Replace: `src/styles/theme.css`
- Modify: `index.html`
- Create: `playwright.config.ts`

**Interfaces:**
- Produces: CSS custom properties available to all components — `--bg`, `--panel`, `--panel2`, `--line`, `--text`, `--dim`, `--mza`, `--mzam`, `--mzad`, `--panel-shadow`, `--btn-border-b`, `--ta-bg`, `--ta-border`, `--ta-text`, `--seg-bg`, `--seg-border`, `--seg-active-bg`, `--seg-active-text`, `--seg-idle`, `--mat-bg`, `--mat-border`, `--mat-shadow`, `--view-bg`, `--view-border`, `--vignette`, `--popup-bg`, `--popup-border`, `--popup-text`, `--popup-label`, `--popup-shadow`, `--marker`, `--serif-font`, `--disp-font`, `--sc-font`

- [ ] **Step 1: Replace `src/styles/theme.css`**

```css
/* ── Font families ──────────────────────────────────────── */
:root {
  --serif-font: 'EB Garamond', Georgia, serif;
  --disp-font:  'IM Fell English', Georgia, serif;
  --sc-font:    'IM Fell English SC', Georgia, serif;
}

/* ── Manuscript (default) ───────────────────────────────── */
:root,
[data-theme="manuscript"] {
  --bg:             #e4d8b8;
  --panel:          #f4ecd4;
  --panel2:         #ece0c0;
  --line:           #c7b288;
  --text:           #2d2416;
  --dim:            #6f5d3f;
  --mza:            #a9762a;
  --mzam:           #8a7547;
  --mzad:           #f6efda;
  --panel-shadow:   0 1px 0 #fbf6e6 inset, 0 8px 22px rgba(74,55,22,.13);
  --btn-border-b:   #cdb88d;
  --ta-bg:          #fcf6e4;
  --ta-border:      #cbb78c;
  --ta-text:        #2d2416;
  --seg-bg:         #e8dcbb;
  --seg-border:     #c4b083;
  --seg-active-bg:  #2d2416;
  --seg-active-text:#f3ead2;
  --seg-idle:       #6f5d3f;
  --mat-bg:         #e8dcbb;
  --mat-border:     #bda878;
  --mat-shadow:     0 14px 34px rgba(70,52,20,.18);
  --view-bg:        #e6d9b9;
  --view-border:    #a9966a;
  --vignette:       inset 0 0 70px 8px rgba(54,40,16,.24);
  --popup-bg:       #f7f0db;
  --popup-border:   #c3ad7c;
  --popup-text:     #2d2416;
  --popup-label:    #9a7b3e;
  --popup-shadow:   0 14px 30px rgba(50,34,12,.26);
  --marker:         #9e3526;
}

/* ── Engraved ───────────────────────────────────────────── */
[data-theme="engraved"] {
  --bg:             #d8c8a0;
  --panel:          #241d12;
  --panel2:         #3a2f1d;
  --line:           #0e0a04;
  --text:           #e6d8b1;
  --dim:            #b3a079;
  --mza:            #cda23f;
  --mzam:           #b3a079;
  --mzad:           #221b10;
  --panel-shadow:   0 3px 0 rgba(0,0,0,.22), 0 12px 28px rgba(40,28,8,.30);
  --btn-border-b:   #140f08;
  --ta-bg:          #f8f0d6;
  --ta-border:      #b6a16f;
  --ta-text:        #221b10;
  --seg-bg:         #241d12;
  --seg-border:     #0e0a04;
  --seg-active-bg:  #cda23f;
  --seg-active-text:#221b10;
  --seg-idle:       #cdbd96;
  --mat-bg:         #e6d9b6;
  --mat-border:     #221b10;
  --mat-shadow:     0 0 0 3px #e6d9b6, 0 0 0 5px #221b10, 0 16px 36px rgba(40,28,8,.25);
  --view-bg:        #e3d4ac;
  --view-border:    #221b10;
  --vignette:       inset 0 0 80px 10px rgba(40,28,8,.32);
  --popup-bg:       #f1e7cb;
  --popup-border:   #221b10;
  --popup-text:     #221b10;
  --popup-label:    #8a6a28;
  --popup-shadow:   0 14px 30px rgba(30,20,6,.34);
  --marker:         #9e3526;
}

/* ── Foxed ──────────────────────────────────────────────── */
[data-theme="foxed"] {
  --bg:             #cdb98c;
  --panel:          #ecdcb4;
  --panel2:         #e4d2a6;
  --line:           #b39a60;
  --text:           #3a2c18;
  --dim:            #6b5736;
  --mza:            #8f6a22;
  --mzam:           #826a3c;
  --mzad:           #f3e7c4;
  --panel-shadow:   0 1px 0 #f6eccf inset, 0 8px 22px rgba(80,58,22,.18);
  --btn-border-b:   #bfa56d;
  --ta-bg:          #f6ecd0;
  --ta-border:      #b89f66;
  --ta-text:        #3a2c18;
  --seg-bg:         #e2d09f;
  --seg-border:     #b39a60;
  --seg-active-bg:  #3a2c18;
  --seg-active-text:#efe1bd;
  --seg-idle:       #6b5736;
  --mat-bg:         #e2d09f;
  --mat-border:     #9c7a32;
  --mat-shadow:     0 0 0 2px rgba(143,106,34,.35), 0 16px 34px rgba(80,56,18,.24);
  --view-bg:        #ddca97;
  --view-border:    #9c7a32;
  --vignette:       inset 0 0 90px 14px rgba(70,48,14,.38);
  --popup-bg:       #f0e3bf;
  --popup-border:   #a98c4e;
  --popup-text:     #3a2c18;
  --popup-label:    #8a6a28;
  --popup-shadow:   0 14px 30px rgba(60,40,12,.30);
  --marker:         #97402a;
}

/* ── Base styles ────────────────────────────────────────── */
* { box-sizing: border-box; }

html, body {
  margin: 0; height: 100%;
  background: var(--bg); color: var(--text);
  font-family: var(--serif-font);
  -webkit-font-smoothing: antialiased;
}

/* Shared card vocabulary */
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: var(--panel-shadow);
}

/* Label: IM Fell English SC small-caps style */
.label {
  font-family: var(--sc-font);
  font-size: 13px;
  letter-spacing: .04em;
  color: var(--mzam);
  margin-bottom: 8px;
}

button { font-family: inherit; }

/* Tidy scrollbars */
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: var(--panel2); border-radius: 6px; border: 2px solid var(--bg); }
*::-webkit-scrollbar-track { background: transparent; }
```

- [ ] **Step 2: Update `index.html` — swap fonts**

Replace the existing Google Fonts link (Space Grotesk) with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:5173",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Create `tests/` dir and smoke test**

Create `tests/theme.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("manuscript theme: parchment background", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
  );
  expect(bg).toBe("#e4d8b8");
});
```

- [ ] **Step 5: Start dev server and run test**

```bash
npm run dev &
npx playwright test tests/theme.spec.ts
```

Expected: 1 passed. Page background is warm parchment, no dark UI.

- [ ] **Step 6: Commit**

```bash
git add src/styles/theme.css index.html playwright.config.ts tests/theme.spec.ts
git commit -m "feat: parchment theme CSS variables + fonts + playwright setup"
```

---

## Task 2: Theme store

**Files:**
- Create: `src/lib/stores/theme.ts`

**Interfaces:**
- Produces:
  - `theme: Writable<"manuscript" | "engraved" | "foxed">` — exported writable store
  - `setTheme(v: "manuscript" | "engraved" | "foxed"): void` — updates store + localStorage

- [ ] **Step 1: Create `src/lib/stores/theme.ts`**

```ts
import { writable } from "svelte/store";

export type ThemeVariant = "manuscript" | "engraved" | "foxed";

const STORAGE_KEY = "maze-theme";
const saved = (localStorage.getItem(STORAGE_KEY) as ThemeVariant) ?? "manuscript";

export const theme = writable<ThemeVariant>(saved);

export function setTheme(v: ThemeVariant) {
  theme.set(v);
  localStorage.setItem(STORAGE_KEY, v);
}
```

- [ ] **Step 2: Write unit test**

Create `src/lib/stores/theme.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";

// localStorage is provided by jsdom
beforeEach(() => localStorage.clear());

describe("theme store", () => {
  it("defaults to manuscript", async () => {
    // re-import fresh module after clearing storage
    const { theme } = await import("./theme?v=" + Math.random());
    expect(get(theme)).toBe("manuscript");
  });

  it("setTheme updates store and localStorage", async () => {
    const { theme, setTheme } = await import("./theme?v=" + Math.random());
    setTheme("engraved");
    expect(get(theme)).toBe("engraved");
    expect(localStorage.getItem("maze-theme")).toBe("engraved");
  });
});
```

- [ ] **Step 3: Run unit tests**

```bash
npm run test -- theme.test
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/theme.ts src/lib/stores/theme.test.ts
git commit -m "feat: theme store with localStorage persistence"
```

---

## Task 3: ImageAnnotation type

**Files:**
- Modify: `src/lib/db/idb.ts`
- Modify: `src/lib/stores/workspace.ts`

**Interfaces:**
- Produces:
  - `interface ImageAnnotation { id: number; type: "point" | "box"; x: number; y: number; w?: number; h?: number; text: string }` — exported from `idb.ts`
  - `RoomWork.imageAnnotations: ImageAnnotation[]` — new field on the existing interface
  - `EMPTY_WORK.imageAnnotations: []` — zero-value in workspace store

- [ ] **Step 1: Add `ImageAnnotation` to `src/lib/db/idb.ts`**

Add after the existing `export interface TextAnnotation { ... }` block:

```ts
export interface ImageAnnotation {
  id: number;
  type: "point" | "box";
  x: number;   // fractional 0-1 (left edge or point)
  y: number;   // fractional 0-1 (top edge or point)
  w?: number;  // fractional 0-1, only for "box"
  h?: number;  // fractional 0-1, only for "box"
  text: string;
}
```

Add `imageAnnotations: ImageAnnotation[];` to `export interface RoomWork`:

```ts
export interface RoomWork {
  notes: string;
  ink: { tool: "pen" | "highlighter"; color: string; points: number[][] }[];
  annotations: TextAnnotation[];
  imageAnnotations: ImageAnnotation[];
  pins: Pin[];
}
```

- [ ] **Step 2: Update `EMPTY_WORK` in `src/lib/stores/workspace.ts`**

Change line 5 from:

```ts
const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], pins: [] }) as RoomWork;
```

To:

```ts
const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], imageAnnotations: [], pins: [] }) as RoomWork;
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/idb.ts src/lib/stores/workspace.ts
git commit -m "feat: ImageAnnotation type + imageAnnotations field on RoomWork"
```

---

## Task 4: OptionsDialog component

**Files:**
- Create: `src/components/OptionsDialog.svelte`

**Interfaces:**
- Consumes:
  - `theme: Writable<ThemeVariant>` from `"../lib/stores/theme"`
  - `setTheme(v: ThemeVariant): void` from `"../lib/stores/theme"`
- Produces (props):
  - `show: boolean`
  - `on:close` — dispatched when user dismisses
  - `exportWs: () => void`
  - `importWs: (e: Event) => void`

- [ ] **Step 1: Create `src/components/OptionsDialog.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { theme, setTheme, type ThemeVariant } from "../lib/stores/theme";

  export let show = false;
  export let exportWs: () => void;
  export let importWs: (e: Event) => void;

  const dispatch = createEventDispatcher();
  function close() { dispatch("close"); }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  const variants: { value: ThemeVariant; label: string }[] = [
    { value: "manuscript", label: "Manuscript" },
    { value: "engraved",   label: "Engraved"   },
    { value: "foxed",      label: "Foxed"       },
  ];
</script>

<svelte:window on:keydown={onKeydown} />

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="overlay" on:click={onBackdrop}>
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="section-head">Theme</div>
      <div class="seg">
        {#each variants as v}
          <button
            class="seg-btn"
            class:active={$theme === v.value}
            on:click={() => setTheme(v.value)}
          >{v.label}</button>
        {/each}
      </div>

      <div class="section-head">Data</div>
      <div class="actions">
        <button class="act-btn" on:click={exportWs}>Export workspace</button>
        <label class="act-btn">
          Import workspace
          <input type="file" accept="application/json" on:change={importWs} hidden />
        </label>
      </div>

      <button class="close-btn" on:click={close} aria-label="Close">×</button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center;
  }
  .dialog {
    position: relative;
    width: 360px; padding: 24px;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; box-shadow: var(--panel-shadow);
  }
  .section-head {
    font-family: var(--sc-font); font-size: 11px; letter-spacing: .1em;
    color: var(--mzam); text-transform: uppercase;
    margin: 0 0 10px;
  }
  .section-head + .section-head, .seg + .section-head, .actions + .section-head {
    margin-top: 20px;
  }
  .seg {
    display: inline-flex; border: 1px solid var(--seg-border);
    border-radius: 8px; overflow: hidden; background: var(--seg-bg);
    margin-bottom: 4px;
  }
  .seg-btn {
    font-family: var(--sc-font); font-size: 13px; letter-spacing: .04em;
    padding: 6px 16px; cursor: pointer;
    background: none; color: var(--seg-idle); border: none;
    transition: background .1s, color .1s;
  }
  .seg-btn.active {
    background: var(--seg-active-bg); color: var(--seg-active-text);
  }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .act-btn {
    background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; padding: 6px 14px; cursor: pointer; font-size: 13px;
    box-shadow: 0 2px 3px rgba(60,40,12,.12), inset 0 1px 0 rgba(255,252,240,.4);
  }
  .act-btn:hover { border-color: var(--mzam); }
  .close-btn {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: var(--dim);
    font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px;
  }
  .close-btn:hover { color: var(--text); }
</style>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/OptionsDialog.svelte
git commit -m "feat: OptionsDialog with theme picker and export/import"
```

---

## Task 5: App.svelte — theme init + cog button + OptionsDialog

**Files:**
- Modify: `src/App.svelte`

**Interfaces:**
- Consumes:
  - `theme` from `"./lib/stores/theme"`
  - `OptionsDialog` from `"./components/OptionsDialog.svelte"`

- [ ] **Step 1: Update `src/App.svelte` script block**

Replace the existing `<script lang="ts">` block content with:

```ts
import { onMount } from "svelte";
import { get } from "svelte/store";
import { Splitpanes, Pane } from "svelte-splitpanes";
import { bootstrapContent } from "./lib/db/bootstrap";
import { getWorkspace, setWorkspace } from "./lib/db/idb";
import { loadContent } from "./lib/stores/content";
import { initWorkspace, startAutosave, currentRoom, workspaceDoc } from "./lib/stores/workspace";
import { rooms, roomById } from "./lib/stores/content";
import { serializeWorkspace, parseWorkspace, downloadJson } from "./lib/db/exportImport";
import { theme } from "./lib/stores/theme";
import RoomImage from "./components/RoomImage.svelte";
import Notes from "./components/Notes.svelte";
import CurrentRoom from "./components/CurrentRoom.svelte";
import RoomDirectory from "./components/RoomDirectory.svelte";
import RoomText from "./components/RoomText.svelte";
import OptionsDialog from "./components/OptionsDialog.svelte";

let ready = false;
let showOptions = false;
$: currentRoomObj = $roomById.get($currentRoom);

// Write theme to <html data-theme="..."> whenever it changes
$: document.documentElement.dataset.theme = $theme;

function loadSplit(key: string, defaults: number[]): number[] {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : defaults;
  } catch { return defaults; }
}
type PaneSizeEvent = { size: number }[];
const mainSizes = loadSplit("split-main", [23, 77]);
const rightSizes = loadSplit("split-right", [62, 38]);
function onMainResized(e: CustomEvent<PaneSizeEvent>) {
  localStorage.setItem("split-main", JSON.stringify(e.detail.map(p => p.size)));
}
function onRightResized(e: CustomEvent<PaneSizeEvent>) {
  localStorage.setItem("split-right", JSON.stringify(e.detail.map(p => p.size)));
}

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

function exportWs() {
  downloadJson("maze-workspace.json", serializeWorkspace(get(workspaceDoc)));
}
async function importWs(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const doc = parseWorkspace(await file.text());
    await setWorkspace(doc);
    initWorkspace(doc);
  } catch (err) {
    alert("Import failed: " + (err instanceof Error ? err.message : String(err)));
  } finally {
    input.value = "";
  }
}
```

- [ ] **Step 2: Update `App.svelte` template**

Replace the `{#if ready}` block with:

```svelte
{#if ready}
  <div class="shell">
    <Splitpanes theme="maze" style="height:100%" on:resized={onMainResized}>
      <!-- LEFT COLUMN -->
      <Pane size={mainSizes[0]} minSize={14}>
        <div class="leftcol">
          <div class="pcard none"><div class="label">Current Room</div>
            <div class="pbody"><CurrentRoom /></div></div>
          <div class="pcard grow"><div class="label">Room Text</div>
            <div class="pbody scroll">{#if currentRoomObj}<RoomText room={currentRoomObj} />{/if}</div></div>
          <div class="pcard grow dir-card">
            <div class="pbody fill"><RoomDirectory /></div></div>
        </div>
      </Pane>

      <!-- RIGHT SIDE: image + notes -->
      <Pane size={mainSizes[1]}>
        <Splitpanes theme="maze" on:resized={onRightResized}>
          <Pane size={rightSizes[0]} minSize={25}>
            <div class="pcard img-card">
              <div class="pbody fill">{#if currentRoomObj}<RoomImage room={currentRoomObj} />{/if}</div>
            </div>
          </Pane>
          <Pane size={rightSizes[1]} minSize={20}>
            <div class="pcard">
              <div class="notes-hd">
                <div class="label">Notes</div>
                <button class="cog" on:click={() => (showOptions = true)} title="Options">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              </div>
              <div class="pbody fill"><Notes roomId={$currentRoom} /></div>
            </div>
          </Pane>
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </div>

  <OptionsDialog
    show={showOptions}
    {exportWs}
    {importWs}
    on:close={() => (showOptions = false)}
  />
{:else}
  <p class="loading">Loading…</p>
{/if}
```

- [ ] **Step 3: Update `App.svelte` styles**

Replace the entire `<style>` block with:

```svelte
<style>
  .shell { height: 100vh; padding: 8px; }
  .loading { padding: 24px; color: var(--dim); font-family: var(--serif-font); }

  .leftcol { height: 100%; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
  .leftcol .pcard.none { flex: none; height: auto; }
  .leftcol .pcard.grow { flex: 1; min-height: 0; }
  .pcard.none .pbody { flex: none; }

  .pcard { height: 100%; display: flex; flex-direction: column; min-height: 0;
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    padding: 12px 14px; overflow: hidden; box-shadow: var(--panel-shadow); }
  .img-card { padding: 0; }
  .pbody { flex: 1; min-height: 0; }
  .pbody.scroll { overflow: auto; }
  .pbody.fill { display: flex; flex-direction: column; overflow: hidden; }
  .pbody.fill :global(textarea) { flex: 1; min-height: 0; resize: none; }
  .pbody.fill :global(.mdview) { flex: 1; min-height: 0; overflow: auto; }

  .notes-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .notes-hd .label { margin-bottom: 0; }
  .cog {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
    background: var(--panel2); color: var(--dim);
    border: 1px solid var(--line); border-bottom: 2px solid var(--btn-border-b);
    box-shadow: 0 2px 3px rgba(60,40,12,.10);
    transition: color .12s, border-color .12s;
  }
  .cog:hover { color: var(--text); border-color: var(--mzam); }

  .pcard.dir-card { padding: 0; }

  /* Splitter handles */
  :global(.splitpanes.maze) { --sp: 8px; }
  :global(.splitpanes__splitter) { background: transparent; position: relative; transition: background .15s; }
  :global(.splitpanes--vertical > .splitpanes__splitter) { width: 8px; min-width: 8px; cursor: col-resize; }
  :global(.splitpanes--horizontal > .splitpanes__splitter) { height: 8px; min-height: 8px; cursor: row-resize; }
  :global(.splitpanes__splitter::after) { content: ""; position: absolute; border-radius: 3px;
    background: var(--line); transition: background .15s; }
  :global(.splitpanes--vertical > .splitpanes__splitter::after) {
    top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2px; height: 34px; }
  :global(.splitpanes--horizontal > .splitpanes__splitter::after) {
    left: 50%; top: 50%; transform: translate(-50%, -50%); height: 2px; width: 34px; }
  :global(.splitpanes__splitter:hover::after) { background: var(--mza); }
  :global(.splitpanes__splitter:hover) { background: rgba(169,118,42,.14); }
</style>
```

- [ ] **Step 4: TypeScript check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 5: Visual verification**

Start dev server (`npm run dev`). Verify:
- App background is warm parchment (no black/dark UI)
- Notes card has a `⚙` cog button in top-right of its header
- Clicking cog opens the options dialog
- Dialog shows Manuscript/Engraved/Foxed buttons
- Switching themes changes the color scheme immediately
- Escape / backdrop click closes dialog
- Room Image card has no Export/Import buttons

- [ ] **Step 6: Playwright test**

Add to `tests/theme.spec.ts`:

```ts
test("cog button opens options dialog", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  await page.click(".cog");
  await expect(page.locator(".dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".dialog")).not.toBeVisible();
});

test("switching to Engraved darkens panels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  await page.click(".cog");
  await page.click("text=Engraved");
  const panelColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--panel").trim()
  );
  expect(panelColor).toBe("#241d12");
  await page.keyboard.press("Escape");
});
```

```bash
npx playwright test tests/theme.spec.ts
```

Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add src/App.svelte
git commit -m "feat: theme init, cog button, OptionsDialog integration in App"
```

---

## Task 6: RoomImage — icon toolbar + palette + keyboard shortcuts

**Files:**
- Modify: `src/components/RoomImage.svelte`

**Interfaces:**
- Consumes: existing `room: Room` prop, `roomWork` / `updateRoomWork` from workspace
- Produces: `tool` state (`"select" | "draw" | "highlight" | "annotate"`), `hideInk`, `color`, `brushSize`, `highlightSize` — all `let` variables internal to the component

- [ ] **Step 1: Replace the script tool state and imports in `RoomImage.svelte`**

The entire file will be rewritten across Tasks 6, 7, 8. Start by replacing `src/components/RoomImage.svelte` with this full new file (toolbar + stub canvas — annotations come in Task 8):

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import type { Room } from "../lib/types";
  import { strokeToPath } from "../lib/ink/freehand";
  import { roomWork, updateRoomWork } from "../lib/stores/workspace";
  import type { ImageAnnotation } from "../lib/db/idb";

  export let room: Room;

  // ── Tool state ──────────────────────────────────────────────────────────
  type Tool = "select" | "draw" | "highlight" | "annotate";
  let tool: Tool = "select";
  let hideInk = false;
  const palette = ["#9e3526","#b5781f","#3f6b46","#2f5470","#5d3f86","#2c2417","#7a6647","#f4ecd5"];
  let color = palette[0];
  let brushSize = 5;
  let highlightSize = 22;

  // ── World / view state ──────────────────────────────────────────────────
  const WORLD_W = 1000;
  let worldH = 803;
  let viewX = 0, viewY = 0, scale = 1, fitScale = 1;

  // ── DOM refs ────────────────────────────────────────────────────────────
  let viewEl: HTMLDivElement;
  let bgCanvas: HTMLCanvasElement;
  let imgEl: HTMLImageElement;

  // ── Stroke types ────────────────────────────────────────────────────────
  type Stroke = { tool: "pen" | "highlighter"; color: string; points: number[][] };
  let current: Stroke | null = null;

  // ── Annotation state ────────────────────────────────────────────────────
  let hoverId: number | null = null;
  let lockedId: number | null = null;
  let annoStart: { x: number; y: number } | null = null;
  let previewBox: { x: number; y: number; w: number; h: number } | null = null;
  let nextAnnoId = 1;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Drag state ──────────────────────────────────────────────────────────
  type DragMode = "none" | "pan" | "draw" | "erase" | "anno";
  let dragMode: DragMode = "none";
  let dragFrom = { x: 0, y: 0, vx: 0, vy: 0 };

  // ── Store subscriptions ─────────────────────────────────────────────────
  $: committed = ($roomWork[room.id]?.ink as Stroke[]) ?? [];
  $: annos = ($roomWork[room.id]?.imageAnnotations as ImageAnnotation[]) ?? [];

  let lastRoom = room.id;
  $: if (room.id !== lastRoom) {
    lastRoom = room.id;
    current = null;
    lockedId = null;
    hoverId = null;
    tryFit();
  }

  // Redraw bg canvas whenever view changes
  $: { viewX; viewY; scale; if (bgCanvas && imgEl?.complete) drawBg(); }

  // ── Image load ──────────────────────────────────────────────────────────
  function onImgLoad() {
    if (imgEl.naturalWidth) {
      worldH = Math.round(WORLD_W * imgEl.naturalHeight / imgEl.naturalWidth);
    }
    tryFit();
    drawBg();
  }

  // ── Fit / clamp ─────────────────────────────────────────────────────────
  function tryFit() {
    if (!viewEl) return;
    const cw = viewEl.clientWidth, ch = viewEl.clientHeight;
    if (!cw) { requestAnimationFrame(tryFit); return; }
    fitScale = Math.min(cw / WORLD_W, ch / worldH);
    scale = fitScale;
    viewX = (cw - WORLD_W * scale) / 2;
    viewY = (ch - worldH * scale) / 2;
    drawBg();
  }

  function clampView() {
    if (!viewEl) return;
    const cw = viewEl.clientWidth, ch = viewEl.clientHeight;
    const sw = WORLD_W * scale, sh = worldH * scale;
    viewX = sw <= cw ? (cw - sw) / 2 : Math.min(0, Math.max(cw - sw, viewX));
    viewY = sh <= ch ? (ch - sh) / 2 : Math.min(0, Math.max(ch - sh, viewY));
  }

  // ── Background canvas (edge-fill) ───────────────────────────────────────
  function drawBg() {
    const cv = bgCanvas, img = imgEl, vEl = viewEl;
    if (!cv || !img || !vEl || !img.naturalWidth) return;
    const cw = vEl.clientWidth, ch = vEl.clientHeight;
    if (!cw || !ch) return;
    if (cv.width !== cw) cv.width = cw;
    if (cv.height !== ch) cv.height = ch;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cw, ch);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const dx = viewX, dy = viewY, dw = WORLD_W * scale, dh = worldH * scale;
    const leftW  = Math.max(0, dx);
    const topH   = Math.max(0, dy);
    const rightX = dx + dw;
    const botY   = dy + dh;
    const rightW = Math.max(0, cw - rightX);
    const botH   = Math.max(0, ch - botY);
    ctx.imageSmoothingEnabled = true;
    if (topH  > 0) ctx.drawImage(img, 0,    0,    iw, 1,  dx, 0,    dw, topH);
    if (botH  > 0) ctx.drawImage(img, 0,    ih-1, iw, 1,  dx, botY, dw, botH);
    if (leftW > 0) ctx.drawImage(img, 0,    0,    1,  ih, 0,  dy,   leftW, dh);
    if (rightW> 0) ctx.drawImage(img, iw-1, 0,    1,  ih, rightX, dy, rightW, dh);
    if (leftW > 0 && topH  > 0) ctx.drawImage(img, 0,    0,    1, 1, 0,      0,    leftW,  topH);
    if (rightW> 0 && topH  > 0) ctx.drawImage(img, iw-1, 0,    1, 1, rightX, 0,    rightW, topH);
    if (leftW > 0 && botH  > 0) ctx.drawImage(img, 0,    ih-1, 1, 1, 0,      botY, leftW,  botH);
    if (rightW> 0 && botH  > 0) ctx.drawImage(img, iw-1, ih-1, 1, 1, rightX, botY, rightW, botH);
  }

  // ── Coordinate helpers ──────────────────────────────────────────────────
  function toFrac(e: PointerEvent): { x: number; y: number } {
    const r = viewEl.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { x: (sx - viewX) / (WORLD_W * scale), y: (sy - viewY) / (worldH * scale) };
  }
  function frac(e: PointerEvent): number[] {
    const { x, y } = toFrac(e);
    return [x, y, e.pressure || 0.5];
  }
  function path(s: Stroke): string {
    const pts = s.points.map(p => [p[0] * WORLD_W, p[1] * worldH, p[2]]);
    return strokeToPath(pts, { size: s.tool === "highlighter" ? 26 : 9 });
  }

  // ── Pointer events ──────────────────────────────────────────────────────
  function onDown(e: PointerEvent) {
    e.preventDefault();
    viewEl.setPointerCapture(e.pointerId);
    const isPaint = tool === "draw" || tool === "highlight";
    if (e.button === 1 || (e.button === 0 && tool === "select")) {
      dragMode = "pan";
      dragFrom = { x: e.clientX, y: e.clientY, vx: viewX, vy: viewY };
      return;
    }
    if (e.button === 2) {
      if (isPaint) { dragMode = "erase"; eraseAt(toFrac(e)); }
      else if (tool === "annotate") { eraseAnnoAt(toFrac(e)); }
      return;
    }
    if (e.button !== 0) return;
    if (isPaint) {
      const t = tool === "highlight" ? "highlighter" : "pen";
      current = { tool: t, color, points: [frac(e)] };
      dragMode = "draw";
    } else if (tool === "annotate") {
      if (lockedId != null) { closePopup(lockedId); return; }
      annoStart = toFrac(e);
      dragMode = "anno";
    }
  }

  function onMove(e: PointerEvent) {
    if (dragMode === "pan") {
      viewX = dragFrom.vx + (e.clientX - dragFrom.x);
      viewY = dragFrom.vy + (e.clientY - dragFrom.y);
      clampView();
      drawBg();
    } else if (dragMode === "draw" && current) {
      current.points.push(frac(e));
      current = current;
    } else if (dragMode === "erase") {
      eraseAt(toFrac(e));
    } else if (dragMode === "anno" && annoStart) {
      const pos = toFrac(e);
      const px = Math.abs(pos.x - annoStart.x) * WORLD_W;
      const py = Math.abs(pos.y - annoStart.y) * worldH;
      if (px > 8 || py > 8) {
        previewBox = {
          x: Math.min(annoStart.x, pos.x),
          y: Math.min(annoStart.y, pos.y),
          w: Math.abs(pos.x - annoStart.x),
          h: Math.abs(pos.y - annoStart.y),
        };
      }
    }
  }

  function onUp(e: PointerEvent) {
    const mode = dragMode;
    dragMode = "none";
    if (mode === "draw" && current) {
      updateRoomWork(room.id, { ink: [...committed, current] });
      current = null;
    } else if (mode === "anno" && annoStart) {
      commitAnno(annoStart, toFrac(e));
      annoStart = null;
      previewBox = null;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const r = viewEl.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const wx = (sx - viewX) / scale, wy = (sy - viewY) / scale;
    const ns = Math.max(fitScale, Math.min(fitScale * 8, scale * Math.exp(-e.deltaY * 0.0015)));
    viewX = sx - wx * ns;
    viewY = sy - wy * ns;
    scale = ns;
    clampView();
    drawBg();
  }

  // ── Ink operations ──────────────────────────────────────────────────────
  function eraseAt(pos: { x: number; y: number }) {
    const R2 = 0.0009;
    const keep = committed.filter(s =>
      !s.points.some(p => (p[0]-pos.x)**2 + (p[1]-pos.y)**2 < R2)
    );
    if (keep.length !== committed.length) updateRoomWork(room.id, { ink: keep });
  }

  function clearAll() {
    updateRoomWork(room.id, { ink: [], imageAnnotations: [] });
    lockedId = null; hoverId = null;
  }

  // ── Annotation operations ───────────────────────────────────────────────
  function commitAnno(start: { x: number; y: number }, end: { x: number; y: number }) {
    const dx = Math.abs(end.x - start.x) * WORLD_W;
    const dy = Math.abs(end.y - start.y) * worldH;
    const a: ImageAnnotation = dx < 8 && dy < 8
      ? { id: nextAnnoId++, type: "point", x: start.x, y: start.y, text: "" }
      : { id: nextAnnoId++, type: "box",
          x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
          w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y), text: "" };
    lockedId = a.id;
    hoverId = null;
    updateRoomWork(room.id, { imageAnnotations: [...annos, a] });
  }

  function eraseAnnoAt(pos: { x: number; y: number }) {
    for (let i = annos.length - 1; i >= 0; i--) {
      const a = annos[i];
      let hit = false;
      if (a.type === "box") {
        hit = pos.x >= a.x && pos.x <= a.x + (a.w ?? 0)
           && pos.y >= a.y && pos.y <= a.y + (a.h ?? 0);
      } else {
        const R = 14 / (WORLD_W * scale);
        hit = (pos.x - a.x) ** 2 + (pos.y - a.y) ** 2 < R * R;
      }
      if (hit) { deleteAnno(a.id); return; }
    }
  }

  function deleteAnno(id: number) {
    updateRoomWork(room.id, { imageAnnotations: annos.filter(a => a.id !== id) });
    if (lockedId === id) lockedId = null;
    if (hoverId === id) hoverId = null;
  }

  function setAnnoText(id: number, text: string) {
    updateRoomWork(room.id, { imageAnnotations: annos.map(a => a.id === id ? { ...a, text } : a) });
  }

  function markerEnter(id: number) {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    hoverId = id;
  }
  function markerLeave(id: number) {
    hoverTimer = setTimeout(() => { if (hoverId === id) hoverId = null; hoverTimer = null; }, 150);
  }
  function popupEnter() { if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; } }
  function popupLeave(id: number) { markerLeave(id); }

  function toggleLock(id: number) {
    if (lockedId === id) { closePopup(id); } else { lockedId = id; hoverId = null; }
  }
  function closePopup(id: number) {
    lockedId = null;
    const a = annos.find(x => x.id === id);
    if (a && !a.text.trim()) deleteAnno(id);
  }

  function popupPos(a: ImageAnnotation): { left: number; top: number } {
    const ax = (a.type === "box" ? a.x + (a.w ?? 0) : a.x) * WORLD_W * scale + viewX;
    const ay = a.y * worldH * scale + viewY;
    const PW = 230;
    let left = ax + 12;
    if (viewEl && left + PW > viewEl.clientWidth - 8) left = ax - PW - 12;
    return { left: Math.max(8, left), top: Math.max(8, ay - 6) };
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    const ae = document.activeElement;
    if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if      (k === "1") { tool = "select"; if (lockedId != null) closePopup(lockedId); }
    else if (k === "2") { tool = "draw";   if (lockedId != null) closePopup(lockedId); }
    else if (k === "3") { tool = "highlight"; if (lockedId != null) closePopup(lockedId); }
    else if (k === "4") { tool = "annotate"; }
    else if (k === "v" || k === "V") { hideInk = !hideInk; }
    else if (k === "f" || k === "F") { tryFit(); }
  }

  onMount(() => {
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", tryFit);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", tryFit);
    };
  });
</script>

<!-- ── Markup ─────────────────────────────────────────────────────────── -->
<div class="wrap">

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="tbtn-group">
      <button class="tbtn" class:active={tool === "select"} on:click={() => { tool = "select"; }} title="Select / pan (1)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 2 L4 19 L9 14.5 L12 21 L14.6 20 L11.5 14 L18 14 Z"/>
        </svg>
      </button>
      <button class="tbtn" class:active={tool === "draw"} on:click={() => { tool = "draw"; }} title="Ink pen (2)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
      </button>
      <button class="tbtn" class:active={tool === "highlight"} on:click={() => { tool = "highlight"; }} title="Highlighter (3)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 14.5 14 5.5l4.5 4.5-9 9H6.5L5 17.5z"/>
          <path d="M12.5 7 17 11.5"/>
          <path d="M4 21h16"/>
        </svg>
      </button>
      <button class="tbtn" class:active={tool === "annotate"} on:click={() => { tool = "annotate"; }} title="Annotate (4)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>

    {#if tool === "draw" || tool === "highlight"}
      <div class="palette-group">
        <div class="swatches">
          {#each palette as c}
            <button
              class="swatch"
              class:active={color === c}
              style="background:{c}"
              on:click={() => (color = c)}
              aria-label={c}
            ></button>
          {/each}
        </div>
        <div class="divider"></div>
        <div class="size-row">
          <span class="size-label">Size</span>
          {#if tool === "draw"}
            <input type="range" min="1" max="20" step="1" bind:value={brushSize} class="range" />
            <span class="size-num">{brushSize}</span>
          {:else}
            <input type="range" min="10" max="40" step="1" bind:value={highlightSize} class="range" />
            <span class="size-num">{highlightSize}</span>
          {/if}
        </div>
      </div>
    {/if}

    <div class="tbtn-group right">
      <button class="tbtn" on:click={() => (hideInk = !hideInk)} title="Toggle ink (V)">
        {#if !hideInk}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        {:else}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3l18 18"/>
            <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.4 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.2-.9"/>
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
          </svg>
        {/if}
      </button>
      <button class="tbtn" on:click={tryFit} title="Fit to view (F)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </button>
      <button class="tbtn danger" on:click={clearAll} title="Clear everything">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Canvas mat -->
  <div class="mat">
    <div class="tape tape-tl"></div>
    <div class="tape tape-br"></div>

    <!-- Viewport / pan-zoom container -->
    <div
      class="view"
      bind:this={viewEl}
      on:pointerdown={onDown}
      on:pointermove={onMove}
      on:pointerup={onUp}
      on:pointercancel={onUp}
      on:wheel|preventDefault={onWheel}
      on:contextmenu|preventDefault
      style="cursor:{tool === 'select' ? 'grab' : tool === 'annotate' ? 'cell' : 'crosshair'}"
    >
      <!-- Blurred edge-fill background -->
      <canvas class="bg-canvas" bind:this={bgCanvas}
        style="position:absolute;inset:0;width:100%;height:100%;filter:blur(9px);transform:scale(1.06);pointer-events:none;"
      ></canvas>

      <!-- World: transformed content layer -->
      <div class="world" style="transform: translate({viewX}px,{viewY}px) scale({scale}); width:{WORLD_W}px; height:{worldH}px;">
        <img bind:this={imgEl} src={room.image} alt="Room {room.id}" draggable="false"
          on:load={onImgLoad}
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;"
        />

        <!-- Ink SVG layer -->
        {#if !hideInk}
          <svg viewBox="0 0 {WORLD_W} {worldH}" preserveAspectRatio="none"
            style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;">
            {#each committed as s}
              <path d={path(s)} fill={s.color} opacity={s.tool === "highlighter" ? 0.4 : 1} />
            {/each}
            {#if current}
              <path d={path(current)} fill={current.color} opacity={current.tool === "highlighter" ? 0.4 : 1} />
            {/if}
          </svg>
        {/if}

        <!-- Annotation markers -->
        {#each annos as a}
          {#if a.type === "point"}
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <div
              class="marker-pt"
              style="left:{a.x * WORLD_W}px; top:{a.y * worldH}px; background:var(--marker);"
              on:pointerenter={() => markerEnter(a.id)}
              on:pointerleave={() => markerLeave(a.id)}
              on:click={() => toggleLock(a.id)}
            ></div>
          {:else}
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <div
              class="marker-box"
              style="left:{a.x * WORLD_W}px; top:{a.y * worldH}px; width:{(a.w ?? 0) * WORLD_W}px; height:{(a.h ?? 0) * worldH}px; border-color:var(--marker); {(hoverId === a.id || lockedId === a.id) ? 'background:rgba(158,53,38,.12)' : ''}"
              on:pointerenter={() => markerEnter(a.id)}
              on:pointerleave={() => markerLeave(a.id)}
              on:click={() => toggleLock(a.id)}
            ></div>
          {/if}
        {/each}

        <!-- Preview box during drag -->
        {#if previewBox}
          <div class="preview-box" style="left:{previewBox.x * WORLD_W}px; top:{previewBox.y * worldH}px; width:{previewBox.w * WORLD_W}px; height:{previewBox.h * worldH}px;"></div>
        {/if}
      </div>

      <!-- Vignette overlay -->
      <div class="vignette" style="pointer-events:none;"></div>

      <!-- Annotation popups (positioned relative to view) -->
      {#each annos as a}
        {#if hoverId === a.id || lockedId === a.id}
          {@const pos = popupPos(a)}
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="popup"
            style="left:{pos.left}px; top:{pos.top}px;"
            on:pointerenter={popupEnter}
            on:pointerleave={() => popupLeave(a.id)}
          >
            <div class="popup-tape"></div>
            <div class="popup-head">
              <span class="popup-label">{a.type === "point" ? "Point Note" : "Note"}</span>
              {#if lockedId === a.id}
                <div class="popup-actions">
                  <button class="pop-del" on:click={() => deleteAnno(a.id)}>Delete</button>
                  <button class="pop-close" on:click={() => closePopup(a.id)}>×</button>
                </div>
              {/if}
            </div>
            <textarea
              class="popup-ta"
              placeholder="Write a note…"
              value={a.text}
              readonly={lockedId !== a.id}
              on:input={e => setAnnoText(a.id, (e.target as HTMLTextAreaElement).value)}
              on:click={() => { if (lockedId !== a.id) toggleLock(a.id); }}
            ></textarea>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .wrap { display: flex; flex-direction: column; height: 100%; min-height: 0; border-radius: 10px; overflow: hidden; }

  /* ── Toolbar ──────────────────────────────────────────────────────────── */
  .toolbar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 8px 10px; flex: none;
    background: var(--panel); border-bottom: 1px solid var(--line);
  }
  .tbtn-group { display: flex; gap: 5px; }
  .tbtn-group.right { margin-left: auto; }

  .tbtn {
    position: relative; display: flex; align-items: center; justify-content: center;
    width: 38px; height: 34px; border-radius: 9px; cursor: pointer; padding: 0;
    background: var(--panel2); color: var(--dim);
    border: 1px solid var(--line); border-bottom: 4px solid var(--btn-border-b);
    box-shadow: 0 3px 3px rgba(60,40,12,.14), inset 0 1px 0 rgba(255,252,240,.45);
    background-image: linear-gradient(155deg, rgba(255,252,242,.4), rgba(0,0,0,.06));
    transition: color .1s, border-color .1s;
  }
  .tbtn:hover { color: var(--text); border-color: var(--mzam); }
  .tbtn.active {
    background: var(--mza); color: var(--mzad);
    border: 1px solid var(--mza); border-bottom: 2px solid rgba(0,0,0,.2);
    box-shadow: inset 0 2px 5px rgba(38,22,4,.38), 0 1px 0 rgba(255,250,235,.18);
    background-image: none;
  }
  .tbtn.danger { color: var(--marker); }
  .tbtn:not(.active):active { border-bottom-width: 2px !important; box-shadow: inset 0 2px 4px rgba(40,24,6,.32) !important; }

  .palette-group { display: flex; align-items: center; gap: 10px; }
  .swatches { display: flex; gap: 5px; }
  .swatch {
    width: 18px; height: 18px; border-radius: 4px; cursor: pointer; padding: 0; flex: none;
    border: 1px solid rgba(0,0,0,.2);
    outline: 2px solid transparent; outline-offset: 2px;
    transition: outline-color .1s;
  }
  .swatch.active { outline-color: var(--mza); }
  .divider { width: 1px; height: 22px; background: var(--line); }
  .size-row { display: flex; align-items: center; gap: 6px; }
  .size-label { font-size: 11px; color: var(--dim); }
  .size-num { font-size: 11px; color: var(--dim); min-width: 18px; }
  .range { accent-color: var(--mza); width: 80px; cursor: pointer; }

  /* ── Canvas mat ──────────────────────────────────────────────────────── */
  .mat {
    flex: 1; min-height: 0; position: relative;
    background: var(--mat-bg); border-top: 1px solid var(--mat-border);
    box-shadow: var(--mat-shadow);
    padding: 12px;
  }
  .tape {
    position: absolute; width: 56px; height: 20px; z-index: 10;
    background: rgba(223,209,167,0.52); border: 1px solid rgba(140,120,82,0.5);
    border-radius: 2px;
  }
  .tape-tl { top: -9px; left: 44px; transform: rotate(-2deg); }
  .tape-br { bottom: -9px; right: 60px; transform: rotate(1.5deg); }

  /* ── Viewport ─────────────────────────────────────────────────────────── */
  .view {
    position: relative; width: 100%; height: 100%;
    background: var(--view-bg); border: 1px solid var(--view-border);
    border-radius: 6px; overflow: hidden; touch-action: none; user-select: none;
  }

  /* ── World ────────────────────────────────────────────────────────────── */
  .world { position: absolute; left: 0; top: 0; transform-origin: 0 0; }

  /* ── Vignette ─────────────────────────────────────────────────────────── */
  .vignette {
    position: absolute; inset: 0; border-radius: 6px;
    box-shadow: var(--vignette);
  }

  /* ── Annotation markers ─────────────────────────────────────────────────*/
  .marker-pt {
    position: absolute; width: 12px; height: 12px; border-radius: 50%;
    transform: translate(-50%, -50%); cursor: pointer; pointer-events: auto;
    border: 1.5px solid rgba(255,255,255,.35);
    box-shadow: 0 1px 4px rgba(0,0,0,.28);
  }
  .marker-box {
    position: absolute; border: 2px dashed; border-radius: 3px; cursor: pointer;
    pointer-events: auto; transition: background .1s;
  }
  .preview-box {
    position: absolute; border: 2px dashed var(--marker); border-radius: 3px;
    background: rgba(158,53,38,.1); pointer-events: none;
  }

  /* ── Annotation popups ──────────────────────────────────────────────────*/
  .popup {
    position: absolute; width: 230px; z-index: 40;
    background: var(--popup-bg); border: 1px solid var(--popup-border);
    border-radius: 6px; box-shadow: var(--popup-shadow);
    overflow: hidden;
  }
  .popup-tape {
    position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
    width: 70px; height: 18px;
    background: rgba(223,209,167,0.52); border: 1px solid rgba(140,120,82,0.5);
    border-radius: 2px;
  }
  .popup-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 10px 4px;
  }
  .popup-label {
    font-family: var(--sc-font); font-size: 11px; letter-spacing: .06em;
    color: var(--popup-label);
  }
  .popup-actions { display: flex; align-items: center; gap: 4px; }
  .pop-del {
    font-size: 11px; color: var(--marker); background: none; border: none;
    cursor: pointer; padding: 0 4px; font-family: var(--sc-font);
  }
  .pop-close {
    font-size: 16px; color: var(--dim); background: none; border: none;
    cursor: pointer; padding: 0 2px; line-height: 1;
  }
  .popup-ta {
    display: block; width: 100%; min-height: 80px;
    background: var(--ta-bg); color: var(--ta-text);
    border: none; border-top: 1px solid var(--ta-border);
    padding: 8px 10px; resize: vertical; outline: none;
    font-family: 'Caveat', cursive; font-size: 15px; line-height: 1.5;
  }
  .popup-ta::placeholder { color: var(--popup-label); opacity: .85; }
</style>
```

- [ ] **Step 2: TypeScript check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Visual verification**

Start dev server. Verify:
- Toolbar shows icon buttons (cursor, pen, highlighter, speech bubble, eye, corners, trash)
- All buttons have beveled parchment style (thick bottom border, warm bg)
- Active tool button shows amber/gold fill
- Clicking pen/highlighter shows palette swatches + size slider
- Canvas area shows warm parchment mat with tape strips at top-left and bottom-right
- Room image is visible, centered, with blurred edge fill in letterbox areas
- Vignette shadow visible at canvas edges
- Pan works (drag), zoom works (scroll), fit works (F key)
- Right-drag on ink erases strokes
- Existing ink draws correctly with new coordinate system

- [ ] **Step 4: Playwright tests**

Create `tests/room-image.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("room image toolbar has 7 icon buttons", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".toolbar");
  const btns = page.locator(".tbtn");
  expect(await btns.count()).toBe(7);
});

test("palette shows when draw tool active", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".toolbar");
  await expect(page.locator(".palette-group")).not.toBeVisible();
  await page.locator(".tbtn").nth(1).click(); // draw tool
  await expect(page.locator(".palette-group")).toBeVisible();
});

test("annotate mode: click creates point annotation popup", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".view");
  await page.locator(".tbtn").nth(3).click(); // annotate tool
  const view = page.locator(".view");
  const box = await view.boundingBox();
  if (!box) throw new Error("no view box");
  await view.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator(".popup")).toBeVisible();
});
```

```bash
npx playwright test tests/room-image.spec.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoomImage.svelte tests/room-image.spec.ts
git commit -m "feat: RoomImage full restyle — icon toolbar, canvas mat, world transform, annotation system"
```

---

## Task 7: CurrentRoom.svelte restyle

**Files:**
- Modify: `src/components/CurrentRoom.svelte`

- [ ] **Step 1: Replace `<style>` block in `src/components/CurrentRoom.svelte`**

```svelte
<style>
  .nav { display: flex; gap: 8px; margin-bottom: 12px; }
  .nav button {
    flex: 1; background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; padding: 5px 10px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    box-shadow: 0 2px 3px rgba(60,40,12,.1), inset 0 1px 0 rgba(255,252,240,.4);
  }
  .nav button:hover:not(:disabled) { border-color: var(--mzam); }
  .nav button:disabled { opacity: .35; cursor: default; }

  .cur { display: flex; gap: 12px; align-items: center; margin-bottom: 4px; }
  .big { font-family: var(--disp-font); font-size: 44px; color: var(--mza); line-height: 1; }
  .title { font-family: var(--serif-font); font-size: 15px; font-style: italic; }
  .count { font-size: 12px; color: var(--dim); margin-top: 3px; font-family: var(--sc-font); letter-spacing:.03em; }

  .sub {
    font-family: var(--sc-font); font-size: 11px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--mzam);
    margin: 12px 0 6px;
  }
  .doors { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    background: var(--panel2); color: var(--mzam);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; padding: 4px 12px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    box-shadow: 0 2px 2px rgba(60,40,12,.09), inset 0 1px 0 rgba(255,252,240,.35);
  }
  .chip:hover { border-color: var(--mza); color: var(--text); }
</style>
```

- [ ] **Step 2: Visual verification**

In the running dev server:
- Room number shows in large IM Fell English display font, gold color
- Room title is EB Garamond italic
- Prev/Next and door chip buttons have warm beveled style
- "Doors from here" label is IM Fell English SC small caps

- [ ] **Step 3: Commit**

```bash
git add src/components/CurrentRoom.svelte
git commit -m "feat: CurrentRoom beveled buttons + serif typography"
```

---

## Task 8: RoomDirectory.svelte restyle

**Files:**
- Modify: `src/components/RoomDirectory.svelte`

- [ ] **Step 1: Replace `<style>` block in `src/components/RoomDirectory.svelte`**

```svelte
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
```

- [ ] **Step 2: Visual verification**

- Grid/List/Graph toggle uses warm segmented control (parchment bg, dark active state)
- Grid cells and list rows have beveled warm style
- Explored rooms have gold border
- Active room has dark filled style

- [ ] **Step 3: Commit**

```bash
git add src/components/RoomDirectory.svelte
git commit -m "feat: RoomDirectory segmented control + beveled warm cells"
```

---

## Task 9: Notes.svelte restyle

**Files:**
- Modify: `src/components/Notes.svelte`

- [ ] **Step 1: Replace `<style>` block in `src/components/Notes.svelte`**

```svelte
<style>
  .tabs { display: flex; gap: 0; margin-bottom: 10px; background: var(--seg-bg); border: 1px solid var(--seg-border); border-radius: 7px; overflow: hidden; width: fit-content; }
  button {
    background: none; color: var(--seg-idle); border: none;
    padding: 5px 14px; cursor: pointer; font-size: 13px;
    font-family: var(--sc-font); letter-spacing: .03em;
    transition: background .1s, color .1s;
  }
  button.active {
    background: var(--seg-active-bg); color: var(--seg-active-text);
  }
  textarea {
    width: 100%; min-height: 180px;
    background: var(--ta-bg); color: var(--ta-text);
    border: 1px solid var(--ta-border); border-radius: 7px;
    padding: 12px; resize: vertical; outline: none;
    font-family: 'Caveat', cursive; font-size: 16px; line-height: 1.55;
  }
  textarea::placeholder { color: var(--dim); opacity: .75; font-style: italic; }
  .mdview {
    padding: 4px 6px;
    font-family: var(--serif-font); font-size: 15px; line-height: 1.65; color: var(--text);
  }
  .mdview :global(p) { margin: 0 0 10px; }
  .mdview :global(h1), .mdview :global(h2), .mdview :global(h3) {
    font-family: var(--disp-font); color: var(--mza); margin: 12px 0 6px;
  }
  .mdview :global(a[data-room]) { color: var(--mza); cursor: pointer; text-decoration: underline dotted; }
</style>
```

- [ ] **Step 2: Visual verification**

- Write/Preview tabs use warm segmented control style
- Textarea has parchment background and Caveat handwriting font
- Markdown preview uses EB Garamond body text with IM Fell English headings

- [ ] **Step 3: Commit**

```bash
git add src/components/Notes.svelte
git commit -m "feat: Notes Caveat textarea + warm segmented tabs"
```

---

## Task 10: RoomText.svelte restyle

**Files:**
- Modify: `src/components/RoomText.svelte`

- [ ] **Step 1: Replace `<style>` block in `src/components/RoomText.svelte`**

```svelte
<style>
  .text { font-family: var(--serif-font); font-size: 15px; line-height: 1.68; color: var(--text); }
  .text p { margin: 0 0 12px; }
  .text p:last-child { margin-bottom: 0; }
</style>
```

(Remove the now-invalid `var(--serif)` reference — it's replaced by `var(--serif-font)`.)

- [ ] **Step 2: Check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Visual verification**

Room text shows in EB Garamond at readable size on warm panel background.

- [ ] **Step 4: Final playwright sweep**

```bash
npx playwright test
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```bash
git add src/components/RoomText.svelte
git commit -m "feat: RoomText EB Garamond body text"
```

---

## Self-Review Checklist

### Spec coverage

| Spec section | Covered by task |
|---|---|
| Theme CSS variables (3 themes) | Task 1 |
| Font imports (EB Garamond, IM Fell English, IM Fell English SC, Caveat) | Task 1 |
| Theme store + localStorage | Task 2 |
| `[data-theme]` on `<html>` | Task 5 |
| `ImageAnnotation` type + `imageAnnotations` field | Task 3 |
| OptionsDialog (theme picker + export/import) | Task 4 |
| App cog button + dialog integration + remove old Export/Import | Task 5 |
| RoomImage icon toolbar (4 tools + 3 right buttons) | Task 6 |
| Color palette (8 prototype colors) | Task 6 |
| Brush size range | Task 6 |
| Canvas mat + tape strips | Task 6 |
| Blurred edge-fill bg canvas | Task 6 |
| World transform pan/zoom | Task 6 |
| Vignette overlay | Task 6 |
| Annotation: point + box creation | Task 6 |
| Annotation: popups (tape, label, delete, textarea) | Task 6 |
| Annotation: hover/lock/close/auto-delete empty | Task 6 |
| Keyboard shortcuts (1/2/3/4, V, F) | Task 6 |
| Keyboard: right-click erase ink / erase annotation | Task 6 |
| `CurrentRoom` typography + beveled buttons | Task 7 |
| `RoomDirectory` segmented control + cells | Task 8 |
| `Notes` Caveat textarea + warm tabs | Task 9 |
| `RoomText` EB Garamond | Task 10 |
| Splitter warm tint | Task 5 |
| Panel box-shadow via `--panel-shadow` | Task 1 (variable) + Task 5 (pcard style) |

### Known type-split to verify
`RoomText.svelte` previously used `var(--serif)` (old variable name). Task 10 changes it to `var(--serif-font)`. If any other component still references `var(--serif)`, it will silently fall back to Georgia — run `grep -r "var(--serif)" src/` after Task 10 to confirm zero hits.
