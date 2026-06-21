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
  type Stroke = { tool: "pen" | "highlighter"; color: string; points: number[][]; size?: number };
  let current: Stroke | null = null;

  // ── Annotation state ────────────────────────────────────────────────────
  let hoverId: number | null = null;
  let lockedId: number | null = null;
  let annoStart: { x: number; y: number } | null = null;
  let previewBox: { x: number; y: number; w: number; h: number } | null = null;
  $: nextAnnoId = annos.length > 0 ? Math.max(...annos.map(a => a.id)) + 1 : 1;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let clearArmed = false;
  let clearArmTimer: ReturnType<typeof setTimeout> | null = null;

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
    const sz = s.size ?? (s.tool === "highlighter" ? 26 : 9);
    const pts = s.points.map(p => [p[0] * WORLD_W, p[1] * worldH, p[2]]);
    return strokeToPath(pts, { size: sz });
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
      current = { tool: t, color, points: [frac(e)], size: tool === "highlight" ? highlightSize : brushSize };
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
      ? { id: nextAnnoId, type: "point", x: start.x, y: start.y, text: "" }
      : { id: nextAnnoId, type: "box",
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
  function onAnnoInput(id: number, e: Event) {
    setAnnoText(id, (e.target as HTMLTextAreaElement).value);
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
    else if ((k === "x" || k === "X") && e.shiftKey) {
      // First Shift+X: arm the sequence
      if (clearArmed) {
        // Second Shift+X: fire
        if (clearArmTimer) { clearTimeout(clearArmTimer); clearArmTimer = null; }
        clearArmed = false;
        clearAll();
      } else {
        clearArmed = true;
        clearArmTimer = setTimeout(() => { clearArmed = false; clearArmTimer = null; }, 1500);
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", tryFit);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", tryFit);
      if (clearArmTimer) clearTimeout(clearArmTimer);
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
      <button class="tbtn danger" on:click={() => { if (window.confirm("Clear all ink and annotations for this room?")) clearAll(); }} title="Clear everything">
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
              on:input={e => onAnnoInput(a.id, e)}
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
