# The Maze Companion — Manual QA Checklist

Branch: `companion-app` · 40 unit tests passing · build + type-check clean · **UI not yet browser-verified** (that's this document).

---

## How to build & run

All commands run from the repo root (`C:\Users\jakub.strnad\source\personal\maze_book`).

### Dev server (use this for QA)
```
npm install        # only if you haven't already
npm run dev
```
Open the printed URL (default **http://localhost:5173**).

### Test the production build too (optional)
```
npm run build      # outputs to dist/
npm run preview    # serves the built app, prints a URL
```

### Other commands
```
npm test           # run the 40 unit tests once
npm run check      # svelte-check (type/a11y). Expect 0 errors, ~6 a11y warnings (known/intentional)
```

### ⚠️ Before your FIRST run — clear old data
Image paths are now resolved in the content layer. If you ran an earlier dev build, the old seed is cached in IndexedDB with bare filenames and images will 404.
- Open **DevTools (F12) → Application → IndexedDB → `maze-companion` → right-click → Delete database**, then reload.
- A brand-new browser/profile has no IndexedDB, so it just seeds correctly on first load.

To re-test a clean slate at any time, delete that database and reload.

---

## Checklist

Legend: ⬜ = to verify · expected behavior in *italics*.

### 1. First load & persistence
- ⬜ App loads; you briefly see "Loading…" then the room view. *46 rooms seeded (prologue "00" + 01–45).*
- ⬜ Room "00" (prologue) image and text are present.
- ⬜ Reload the page → app still loads instantly with your state. *Content now comes from IndexedDB, no network refetch error in console.*
- ⬜ Console is free of errors (a few Vite/dev notices are fine).

### 2. Room Image + ink (center card) — fixed size, zoom/pan/draw
The image now sits in a **fixed-size stage** (max ~440px wide, centered). Interaction model (shown in the hint line at the bottom of the stage): `draw · mid: pan · right: erase · scroll: zoom`.
- ⬜ The image displays at a fixed, reasonable size (not filling the whole panel).
- ⬜ **Draw** toggle is gold/on by default → left-drag on the image leaves an ink stroke that follows the cursor.
- ⬜ **HL** toggle → strokes become thicker and semi-transparent (highlighter).
- ⬜ Color swatches change the active color.
- ⬜ **Scroll wheel** over the image → zooms in/out toward the cursor.
- ⬜ **Middle-mouse drag** → pans the zoomed image. Also: turn **Draw** off → left-drag pans.
- ⬜ **Right-click** on a stroke → erases that stroke.
- ⬜ Strokes stay aligned to the image when you zoom/pan (stored as image fractions).
- ⬜ **Pin** toggle → click drops a numbered pin (prompts for a note); pin tool doesn't draw.
- ⬜ **Hide ink** toggles strokes off/on without deleting them.
- ⬜ **Reset** resets zoom & pan to the default view. **Clear** removes all ink for the room.
- ⬜ Draw in room A, navigate to room B, come back → room A's ink is intact (per-room).
- ⬜ Reload → ink and pins persist.

### 3. Notes + wiki-links (core, right)
- ⬜ **Write** tab: type markdown, e.g. `# Heading`, `**bold**`, `- list`, and `see [[room 05]]`.
- ⬜ **Preview** tab: markdown renders (heading, bold, list).
- ⬜ The `[[room 05]]` link renders as a clickable link; clicking it navigates to room 05.
- ⬜ `[[room 5]]` (single digit) also works → links to room 05.
- ⬜ Notes are per-room and survive navigation + reload.
- ⬜ A `<script>` typed into notes does NOT execute (sanitized).

### 4. Left drawer — visible handle, hover/lock, Current Room, Directory
- ⬜ A **visible vertical handle/notch** ("ROOM INFO ›") sits on the left edge at all times.
- ⬜ Hover the handle → the left panel slides out; the handle moves to the panel's edge.
- ⬜ Move the cursor onto the panel body → **it stays open** (does not snap shut).
- ⬜ Move the cursor fully off the panel → it slides closed.
- ⬜ **Click the handle** (or the lock icon inside) → panel stays pinned; click again to unlock.
- ⬜ The panel shows stacked **cards**: Current Room, Room Text, Room Directory, Global Notes.
- ⬜ When open/locked, the drawer **overlays** the image+notes — it does NOT resize or shift them.
- ⬜ **Current Room**: shows the big room number, title, and `N / 46 explored` count.
- ⬜ **Door chips**: click a chip → navigates to that room AND the explored count rises.
- ⬜ **prev / next** buttons move between rooms (disabled at the ends).
- ⬜ **Room Directory** grid: 5-wide grid of room ids; current room highlighted; explored rooms marked.
- ⬜ **Grid / List** toggle works; list view also marks explored rooms and shows door ids.
- ⬜ Clicking any directory cell navigates there.

### 5. Room Text annotations (left drawer)
- ⬜ In the **Text** tab, the room's prose is shown.
- ⬜ Select a passage with the mouse → a small popover appears above the selection.
- ⬜ **B / I** → bold / italic the selection. **HL** → highlight. **Color** → colors the text.
- ⬜ **💬** → prompts for a comment; a comment-only selection shows a faint outline.
- ⬜ Hover an annotated/commented span → the comment shows as a tooltip.
- ⬜ Click elsewhere (not a popover button) → the popover dismisses.
- ⬜ **Comments** tab → lists each comment with the quoted text.
- ⬜ Annotations persist across reload.

### 6. Bottom drawer — Room Graph (Cytoscape)
- ⬜ A **visible handle/notch** ("▲ ROOM GRAPH") sits centered on the bottom edge at all times.
- ⬜ Hover the handle → the graph drawer slides up; stays open while hovering it; click handle/lock pins it.
- ⬜ Graph shows ~46 nodes and the door edges.
- ⬜ The **current** room node is gold; explored nodes have a gold border.
- ⬜ Navigate (via chips/directory) → the gold "current" node updates live, and newly-explored nodes get the explored border **without** closing/reopening the drawer.
- ⬜ **One-way** doors render with a blue arrow; two-way doors are plain lines.
- ⬜ Click a node → navigates to that room.
- ⬜ **Layout** dropdown: try each — `fcose`, `cola`, `dagre`, `concentric`, `circle`. *Each re-arranges the graph.* **Confirm `cola` works** (it relies on a bundled dependency; flag if it throws in the console).
- ⬜ **Re-flow** re-runs the current layout; **Fit** fits the graph to view.
- ⬜ Drag a node, then reload → its position is remembered. *(Note: a fresh layout runs on each open and may re-arrange — this is intended for now; the saved position is still stored.)*

### 7. Image pins
- ⬜ Select the **pin** tool in the image toolbar.
- ⬜ Click on the image → prompts for an optional note → a numbered pin appears at that spot.
- ⬜ Hover the pin → its note shows as a tooltip.
- ⬜ With the pin tool active, clicking does NOT draw an ink stroke.
- ⬜ Switch back to pen → drawing works again.
- ⬜ Pins persist across reload and stay at the right spot if the image is resized (stored as fractions).

### 8. Tags + filtered directory
- ⬜ In **Current Room**, type a tag name (e.g. `clue`) and add it → a tag chip appears.
- ⬜ Add the same room to another tag (e.g. `dead-end`).
- ⬜ Navigate to other rooms and tag a couple of them.
- ⬜ In the **Room Directory**, a tag-filter row appears → click a tag → directory narrows to rooms with that tag.
- ⬜ Click the active tag / "all" → filter clears.
- ⬜ Click a current-room tag chip → removes that tag.
- ⬜ Typing an already-applied tag name + add does NOT remove it (add is add-only).
- ⬜ Tags persist across reload.

### 9. Global notes
- ⬜ Open the Global Notes editor (left drawer, below the directory).
- ⬜ Write markdown → Preview renders it.
- ⬜ Global notes persist across reload and are independent of the current room.

### 10. Export / Import (top-right toolbar)
- ⬜ Do some work (notes, ink, a tag, a pin).
- ⬜ **Export** → downloads `maze-workspace.json`.
- ⬜ Change something (e.g. edit a note).
- ⬜ **Import** → pick the exported file → your earlier state is restored, and **the currently-viewed room's panel updates immediately** (notes/ink/annotations refresh without needing to navigate away).
- ⬜ Import a deliberately-broken file (e.g. rename a `.txt` to `.json`) → you get an "Import failed: …" alert, app doesn't crash.
- ⬜ Importing the same file twice in a row works (input resets).

### 11. Known / expected (NOT bugs)
- `npm run check` shows ~6 a11y warnings on click handlers (eraser path, notes/text/popover, drawer edges) — intentional for this personal tool.
- The graph runs a layout each time it mounts, which can override a manually-dragged node's position visually (the position is still saved). A future "manual mode" would skip this.
- Build emits one ~867 kB JS chunk (Cytoscape + layout extensions) and a chunk-size warning — non-fatal.
- Pin numbers are positional; there's no delete-pin UI yet.

---

## Result

- Date tested: ____________
- Browser: ____________
- Blocking issues found: ____________
- Notes: ____________
