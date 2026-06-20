# Parchment Theme + Room Image Canvas Redesign

**Date:** 2026-06-21  
**Branch:** companion-app  
**Source prototype:** `prototype-canvas/Canvas Drawer.dc.html`

## Overview

Replace the existing dark UI theme with the three warm parchment themes from the Claude Design prototype (Manuscript / Engraved / Foxed). Apply the prototype's design language (serif fonts, skeuomorphic beveled buttons, warm panel colors) to all existing components. Give the Room Image card a full canvas-style treatment matching the prototype exactly. Add a cog-button options dialog to the Notes card to house theme selection and export/import controls.

No layout changes. No new routes. Existing functionality preserved; Pin tool replaced by the prototype's sticky-note annotation system.

---

## 1. Theme System

### Store
`src/lib/stores/theme.ts`
- Writable store: `theme` — values `"manuscript" | "engraved" | "foxed"`, default `"manuscript"`
- Persisted to `localStorage` key `"maze-theme"`
- Exported helper `setTheme(v)` that updates store + localStorage

### CSS Variables
`src/styles/theme.css` — completely replaced. Three `data-theme` blocks:

```
:root, [data-theme="manuscript"] { ... }
[data-theme="engraved"]          { ... }
[data-theme="foxed"]             { ... }
```

Variable names kept identical to current dark theme so all components pick up changes without edits:
`--bg`, `--panel`, `--panel2`, `--line`, `--text`, `--dim`, `--mza`, `--mzam`, `--mzad`

New variables added:
- `--panel-shadow` — card drop shadow (differs per theme)
- `--btn-border-b` — beveled button lower border color
- `--ta-bg`, `--ta-border`, `--ta-text` — textarea-specific colors
- `--seg-bg`, `--seg-border`, `--seg-active-bg`, `--seg-active-text`, `--seg-idle` — segmented control
- `--mat-bg`, `--mat-border`, `--mat-shadow` — canvas mat
- `--view-bg`, `--view-border`, `--vignette` — inner canvas viewport
- `--popup-bg`, `--popup-border`, `--popup-text`, `--popup-label`, `--popup-shadow` — annotation popups
- `--marker` — annotation marker/dashed-box color
- `--ink`, `--ink-soft`, `--gold` — typography accent colors
- `--disp-font`, `--serif-font`, `--sc-font` — font family vars

### Font Imports
Added to `index.html` `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap" rel="stylesheet">
```

### Theme Initialization
`App.svelte` subscribes to `theme` store and writes `document.documentElement.dataset.theme = $theme` reactively.

---

## 2. Room Image Card

### Toolbar
Replaces the current text-button toolbar with icon buttons in the prototype's skeuomorphic style.

**Layout:** two flex groups, spacer between them.

Left group (tool selection, one active at a time):
| Icon | Tool | Key |
|------|------|-----|
| Cursor arrow SVG | Select / pan | `1` |
| Pencil SVG | Draw (pen) | `2` |
| Highlighter SVG | Highlight | `3` |
| Speech bubble SVG | Annotate | `4` |

Right group (always visible):
| Icon | Action | Key |
|------|--------|-----|
| Eye / eye-off SVG | Toggle ink visibility | `V` |
| Corners SVG | Fit / reset view | `F` |
| Trash SVG | Clear ink + annotations | `Shift-X X` |

**Active button style:** `background: var(--mza)`, `color: var(--mzad)`, `border-bottom: 2px solid var(--btn-border-b)`, `box-shadow: inset 0 2px 5px rgba(38,22,4,.42)`

**Idle button style:** `background: var(--panel2)`, `border-bottom: 4px solid var(--btn-border-b)`, `box-shadow: 0 3px 3px rgba(60,40,12,.16), inset 0 1px 0 rgba(255,252,240,.55)`

**Palette + brush size** (shown only when Draw or Highlight active):
- 8 colour swatches from prototype palette: `#9e3526 #b5781f #3f6b46 #2f5470 #5d3f86 #2c2417 #7a6647 #f4ecd5`
- Range input for brush size (pen: 1–20, highlighter: 10–40)
- Vertical divider between swatches and size controls

Toolbar background: `var(--panel)`, border-bottom: `1px solid var(--line)`, border-radius top corners only.

### Canvas Mat
The outer container (`.mat`) has `background: var(--mat-bg)`, `border: 1px solid var(--mat-border)`, `box-shadow: var(--mat-shadow)`, `border-radius: 10px`. Two tape strips via positioned `<div>` elements (not pseudo-elements, since we need theme-aware background):
- Top-left tape: `position: absolute; top: -8px; left: 40px; width: 60px; height: 22px; background: rgba(223,209,167,0.52); border: 1px solid rgba(140,120,82,0.5); border-radius: 2px; transform: rotate(-2deg)`
- Bottom-right tape: similar, `bottom: -8px; right: 60px; transform: rotate(1.5deg)`

### Canvas Viewport (`.view`)
`background: var(--view-bg)`, `border: 1px solid var(--view-border)`, overflow hidden, relative positioned.

Layers (bottom to top):
1. `<canvas class="bg-canvas">` — blurred edge fill using `drawBg()` technique from prototype (stretches outermost pixel rows/cols into letterbox areas)
2. `<div class="world">` — transform origin `0 0`, contains:
   - `<img>` room image
   - `<svg>` ink layer (committed strokes + live stroke path)
   - Annotation markers (point circles + box dashed rectangles)
3. Vignette overlay: absolutely positioned `<div>` with `box-shadow: var(--vignette)` (inset), `pointer-events: none`
4. Annotation popups (absolutely positioned, z-index above vignette)
5. Brush/eraser cursor circle

Pan+zoom uses the same world-transform approach as the prototype (`translate(x,y) scale(s)`), replacing the current `panX/panY/zoom` approach but keeping the same clamping logic.

### Annotation System
Replaces current Pin tool.

**Storage:** `roomWork[id].imageAnnotations` — new field added to `RoomWork` in `idb.ts`. The existing `annotations: TextAnnotation[]` field is for paragraph-level text markup (different system, not touched). New type:
```ts
interface ImageAnnotation {
  id: number;
  type: "point" | "box";
  x: number; y: number;    // fractional (0–1), top-left of point or box
  w?: number; h?: number;  // fractional, only for type "box"
  text: string;
}
```
Fractional coords (0–1) consistent with the existing ink stroke coordinate system. Popup positioning: `screenX = anno.x * worldWidth * scale + panX`.

**Interaction (Annotate tool active):**
- Left click (move < 8px) → point annotation at click coords
- Left drag (move ≥ 8px) → box annotation; dashed preview rectangle shown during drag
- Right click on marker → delete annotation immediately
- Hover marker → popup appears (150ms debounce on leave)
- Click marker → popup locked open
- Closing locked popup with empty text → annotation deleted

**Point marker:** `12px` filled circle, `background: var(--marker)`, `border-radius: 50%`, absolute positioned
**Box marker:** `border: 2px dashed var(--marker)`, absolute positioned, `pointer-events: auto` in Annotate/Select mode

**Annotation popup card:**
- `width: 230px`, absolute positioned (right of marker; flips left if near right edge)
- `background: var(--popup-bg)`, `border: 1px solid var(--popup-border)`, `box-shadow: var(--popup-shadow)`
- Tape strip at top (same style as mat tape but narrower, 80px wide)
- Header row: label ("Note" or "Point Note") in IM Fell English SC + Delete button + × close button
- `<textarea class="handnote">` in Caveat font, `background: var(--ta-bg)`, no border, `placeholder` in muted ink color
- `pointer-events: none` when popup is not hovered/locked (allows pan through popup area)

### Keyboard Shortcuts
`1/2/3/4` — tool select; `V` — toggle ink; `F` — fit; `Shift-X X` (double) — clear all. Active only when no input/textarea is focused.

---

## 3. Other Components

### `App.svelte`
- Remove Export/Import buttons from Room Image card header
- Notes card header: add `⚙` cog button (beveled, top-right of card header row)
- `<OptionsDialog>` rendered at app level, controlled by `showOptions` boolean
- Theme store subscribed, writes `document.documentElement.dataset.theme`
- Splitter hover tint updated from `#e2a85722` to `rgba(169,118,42,0.14)` (theme-neutral warm gold)

### `CurrentRoom.svelte`
- Big room number: EB Garamond, `font-size: 44px`, `color: var(--mza)`
- Room title: EB Garamond italic
- "Doors from here" sub-label: IM Fell English SC, `color: var(--mzam)`
- Prev/next + chip buttons: beveled style
- Explored count: `color: var(--dim)`

### `RoomDirectory.svelte`
- View toggle: segmented control using `--seg-*` variables (not `var(--bg)` background)
- Grid cells + list rows: `background: var(--panel2)`, beveled hover (`border-color: var(--mzam)`)
- Active room: `background: var(--seg-active-bg)`, `color: var(--seg-active-text)`
- `.label` class: IM Fell English SC

### `Notes.svelte`
- Write/Preview tabs: beveled tab buttons (active = `var(--mza)` tint)
- Textarea: `background: var(--ta-bg)`, `color: var(--ta-text)`, `border-color: var(--ta-border)`; Caveat or EB Garamond (user's own writing area — Caveat fits the "writing in the margins" feel)
- Markdown preview: EB Garamond body text

### `RoomText.svelte`
- Body text: EB Garamond, `font-size: 15px`
- Uses `var(--text)` color

### `OptionsDialog.svelte` (new)
- Modal overlay: `position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 200`
- Centered panel card: `width: 360px`, `background: var(--panel)`, `border: 1px solid var(--line)`, `box-shadow: var(--panel-shadow)`, `border-radius: 12px`, `padding: 20px 24px`
- **Theme section** heading in IM Fell English SC + three-button segmented control (Manuscript / Engraved / Foxed)
- **Data section** heading + Export button + Import label/input (same beveled style)
- Close on backdrop click or Escape key
- Props: `show` boolean, `on:close` event, `exportWs` and `importWs` callbacks

---

## 4. Files Changed / Created

| File | Action |
|------|--------|
| `index.html` | Add Google Fonts link |
| `src/styles/theme.css` | Replace entirely |
| `src/lib/stores/theme.ts` | Create |
| `src/lib/db/idb.ts` | Add `ImageAnnotation` type + `imageAnnotations` field to `RoomWork` |
| `src/App.svelte` | Theme init, cog button, OptionsDialog, remove Export/Import from image header |
| `src/components/OptionsDialog.svelte` | Create |
| `src/components/RoomImage.svelte` | Full restyle + annotation system |
| `src/components/CurrentRoom.svelte` | Typography + button restyle |
| `src/components/RoomDirectory.svelte` | Segmented control + cell restyle |
| `src/components/Notes.svelte` | Tab + textarea restyle |
| `src/components/RoomText.svelte` | Typography restyle |

Components not touched (graph/edge/drawer components): styling derives entirely from CSS variables — color/border changes flow through automatically.

---

## 5. Out of Scope

- `imageAnnotations` field added to `RoomWork` / `idb.ts`; existing `annotations: TextAnnotation[]` is untouched (reserved for future text-markup feature)
- No changes to graph components (RoomGraph, RoomNode, DirectedEdge, GraphQueryBar, RoomDrawer, BottomDrawer) beyond what CSS variables provide automatically
- No server-side changes
- No new routes or navigation
