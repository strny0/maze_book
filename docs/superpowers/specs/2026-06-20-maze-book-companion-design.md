# The Maze — Book Companion App: Design

**Date:** 2026-06-20
**Status:** Approved design, pre-implementation

## 1. Purpose

A personal, lightweight web app to help solve the 1985 puzzle book *The Maze* by
Christopher Manson. It is a note-taking and map-building "powerhouse" over the
book's 45 rooms: image exploration with freehand ink, rich notes, text
annotations, image pins, tags, and an interactive graph map of room-to-room
doors.

Built for personal use first. A future (out-of-scope-now) goal is to share the
app publicly **without** the copyrighted book assets, so content must be a
pluggable, importable data layer rather than hardcoded.

## 2. Tech Stack

- **Vite + Svelte + TypeScript** → builds to static files, hosted locally or on a
  private GitHub Pages. Best DX-to-bundle ratio; reactive stores fit the
  many-interdependent-panels design.
- **Cytoscape.js** + layout extensions (`fcose` force-directed, `cola`
  interactive-physics, `dagre` hierarchical, plus built-in concentric / circle /
  breadthfirst) — the graph map. Engine does the heavy layout work; manual
  drag-nudges persist.
- **perfect-freehand** — pressure-style vector ink. Strokes stored as point
  arrays: crisp at any zoom, small storage, per-stroke erase.
- **marked** + a small HTML sanitizer — markdown notes, extended with
  `[[room NN]]` wiki-links.
- **idb** — thin IndexedDB wrapper for persistence.

Rationale: the existing `src/` React+Vite template is overkill and will be
removed; Svelte gives a real component model with far less weight.

## 3. Architecture — Three Layers

1. **Static seed data** (read-only, in `assets/` → served from `public/`):
   `content.json` (room text/titles/image refs), room images, and `maze.txt`
   (door adjacency list). A build/bootstrap step parses these into the content
   store. `maze.txt` is parsed **ignoring all `#` comment lines** — secret
   passages are NOT pre-loaded; the user discovers and adds them in-app.

2. **State layer** (Svelte stores): `currentRoom`, `explored`, `notes`, `ink`,
   `textAnnotations`, `pins`, `tags`, `graphPositions`, `globalNotes`. Every
   panel reactively derives from these.

3. **Persistence layer**: stores autosave (debounced) into IndexedDB. Export /
   Import serializes to/from `.json` files.

### Content vs Workspace separation (enables future sharing)

The data model splits into two **independent** layers from day one:

- **Content layer** = "the book": room id → `title`, `text[]`, `image`, plus the
  door list. Source is **pluggable** — either the bundled `assets/` seed OR an
  in-app imported content pack. The app reads content only through one interface;
  it never hardcodes content. This makes the future "users define their own
  rooms / upload images" feature a non-breaking addition (new authoring UI
  writing into the same content store), and lets the public build ship with an
  empty content layer while private `assets/` stay out of the shared build.
- **Workspace layer** = "my solving work": notes, ink, annotations, pins, tags,
  graph positions, explored set, global notes — all referencing rooms by id.

## 4. Data Model & Storage

Two IndexedDB stores, each effectively one autosaved app-state document,
independently exportable.

### content store
- `rooms`: `{ id, title, text: string[], image }`
- `doors`: `{ from, to, oneWay: boolean }`
- `meta`: pack name / version / provenance

Seed bootstrap: on first load, if `content` is empty, parse `assets/content.json`
+ `assets/maze.txt` (minus `#` lines) into it. Seed images referenced by path;
imported-pack images stored as blobs — same read interface either way.

Doors in `maze.txt` are mostly listed in both directions (e.g. `01 -> 20` and
`20 -> 01`); a door present in only one direction is modeled as `oneWay: true`.

### workspace store
- Per-room: `notes` (markdown string), `ink` (array of stroke point-arrays +
  color/tool), `textAnnotations`, `pins`
- Global: `explored` (set of room ids), `tags` (room id → tag list, plus tag
  definitions/colors), `graphPositions` (room id → x/y), `globalNotes`
  (markdown notebook independent of rooms)

### Text annotation anchoring
`{ roomId, paraIndex, start, end, textColor, highlight, bold, italic, comment }`
— offsets into a specific paragraph so annotations survive reloads.

### Export / Import
Two separate files — `maze-book-content.json` and `maze-workspace.json` — so the
book definition and the solving progress can be shared/versioned independently.

## 5. UI, Panels & Interactions

**Core, always-visible workspace = Room Image (exploration) + Notes.** These get
the real estate. Everything else is a hover-reveal drawer that overlays the core
and never resizes it.

### Core panels
- **Room Image:** vector ink (pen / highlighter / eraser), color palette,
  zoom/pan, hide-ink, reset; image pins layered on top.
- **Notes:** markdown write / preview, per room; `[[room NN]]` wiki-links jump
  between rooms.

### Left drawer (hideable)
Room info (current room number, clickable doors-from-here chips, prev/next,
explored count), Room Directory (grid/list toggle + tag filtering), and Room Text
with the highlight/comment system.
- Hidden by default → hover the **left edge** to slide out → **lock** icon pins
  it open. Locked = stays; unlocked = transient overlay. Smooth transition.

### Bottom drawer (hideable)
The Room Graph, full width.
- Hover the **bottom edge** to slide up → **lock** icon pins it. Overlays the
  core, does not resize it. Smooth transition.

### Room Text highlight & comments
- Two tabs at the top of the text area: **Text** (read view) and **Comments**.
- Select a contiguous passage → popover above the selection → choose text color,
  highlight color, bold, italic, and/or add a comment.
- Comment-only selection → faint boxed outline; hover → comment tooltip.
- Persisted as the anchored annotation ranges above.

### Graph interactions
- Layout dropdown (fcose / cola / dagre / concentric / circle) + re-flow button.
- Drag-to-nudge node positions (persisted to `graphPositions`).
- Click node → jump to that room. Fit-to-view, pan/zoom.
- Edge styles: door-out / one-way / secret(discovered). Node states: current /
  explored / tagged.

## 6. Build Phases

Each phase is independently verifiable.

1. **Skeleton + data layer** — remove old `src/`, scaffold Vite/Svelte/TS,
   content store + seed bootstrap (parse `content.json` + `maze.txt` minus `#`),
   IndexedDB persistence, export/import.
   *Verify: rooms load, refresh persists, export → import round-trips.*
2. **Core workspace** — Room Image (vector ink, zoom/pan, colors, eraser) +
   Notes (markdown write/preview).
   *Verify: draw on a room, switch rooms, ink/notes persist per room.*
3. **Hover-reveal drawers** — left drawer (room info + directory + text) and
   bottom drawer (graph placeholder); hover-reveal + lock + transitions.
   *Verify: drawers slide/lock, core never resizes.*
4. **Graph powerhouse** — Cytoscape, swappable layouts, persisted manual
   positions, node/edge states, click-to-jump.
   *Verify: layouts swap, drag persists, click navigates.*
5. **Annotation power features** — text highlight/comment system, image pins,
   tags + filtered directory, `[[room]]` wiki-links, global notebook.
   *Verify: each annotation type persists and renders.*

## 7. Out of Scope (now)

- In-app content authoring UI (room/image upload). Architecture supports it; not
  built yet.
- Auto-backup to disk (File System Access API). Manual export/import only.
- Multi-user / sync / accounts.
