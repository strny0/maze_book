<script lang="ts">
  import type { Room } from "../lib/types";
  import { strokeToPath } from "../lib/ink/freehand";
  import { roomWork, updateRoomWork } from "../lib/stores/workspace";

  export let room: Room;

  type Stroke = { tool: "pen" | "highlighter"; color: string; points: number[][] };

  // Interaction (matches the prototype):
  //   Draw on + left-drag → ink   |  left-drag with Draw off → pan
  //   middle-drag → pan           |  right-drag → erase strokes you pass over
  //   scroll → zoom               |  Pin mode + click → drop a pin
  // Committed strokes come from the store (read-only); the in-progress stroke
  // is kept entirely separate so reactive re-renders can never wipe it.
  const VBW = 1000, VBH = 803; // ~image aspect (1976/1586)

  let draw = true;
  let highlighter = false;
  let pinMode = false;
  let hideInk = false;
  let color = "#ff5d5d";
  const colors = ["#ff5d5d", "#4ec3e0", "#5fd38d", "#5b8cff", "#c879ff", "#ffffff"];

  let zoom = 1, panX = 0, panY = 0;
  let stage: HTMLDivElement;
  let current: Stroke | null = null;
  let panning = false, erasing = false;
  let panFrom = { x: 0, y: 0, px: 0, py: 0 };

  $: committed = ($roomWork[room.id]?.ink as Stroke[]) ?? [];
  $: pins = $roomWork[room.id]?.pins ?? [];

  // reset the in-progress stroke ONLY when the room actually changes
  let lastRoom = room.id;
  $: if (room.id !== lastRoom) { lastRoom = room.id; current = null; resetView(); }

  function frac(e: PointerEvent): number[] {
    const r = stage.getBoundingClientRect();
    return [(e.clientX - r.left - panX) / (r.width * zoom),
            (e.clientY - r.top - panY) / (r.height * zoom), e.pressure || 0.5];
  }
  function path(s: Stroke): string {
    const pts = s.points.map((p) => [p[0] * VBW, p[1] * VBH, p[2]]);
    return strokeToPath(pts, { size: s.tool === "highlighter" ? 26 : 9 });
  }
  function clampPan() {
    panX = Math.min(0, Math.max(stage.clientWidth * (1 - zoom), panX));
    panY = Math.min(0, Math.max(stage.clientHeight * (1 - zoom), panY));
  }

  function down(e: PointerEvent) {
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    if (e.button === 2) { erasing = true; erase(e); return; }
    if (e.button === 1 || (e.button === 0 && !draw && !pinMode)) {
      panning = true;
      panFrom = { x: e.clientX, y: e.clientY, px: panX, py: panY };
      return;
    }
    if (e.button !== 0) return;
    if (pinMode) { placePin(e); return; }
    current = { tool: highlighter ? "highlighter" : "pen", color, points: [frac(e)] };
  }
  function move(e: PointerEvent) {
    if (erasing) { erase(e); return; }
    if (panning) {
      panX = panFrom.px + (e.clientX - panFrom.x);
      panY = panFrom.py + (e.clientY - panFrom.y);
      clampPan();
      return;
    }
    if (!current) return;
    current.points.push(frac(e));
    current = current; // trigger re-render of the in-progress path
  }
  function up() {
    panning = false;
    erasing = false;
    if (current) {
      updateRoomWork(room.id, { ink: [...committed, current] });
      current = null;
    }
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const next = Math.min(6, Math.max(1, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    panX = cx - ((cx - panX) / zoom) * next;
    panY = cy - ((cy - panY) / zoom) * next;
    zoom = next;
    clampPan();
  }
  function placePin(e: PointerEvent) {
    const [x, y] = frac(e);
    const note = prompt("Pin note (optional):") ?? "";
    updateRoomWork(room.id, { pins: [...pins, { x, y, label: String(pins.length + 1), note }] });
  }
  function erase(e: PointerEvent) {
    const [fx, fy] = frac(e);
    const keep = committed.filter((s) =>
      !s.points.some((p) => (p[0] - fx) ** 2 + (p[1] - fy) ** 2 < 0.0009)); // ~3% radius
    if (keep.length !== committed.length) updateRoomWork(room.id, { ink: keep });
  }
  function resetView() { zoom = 1; panX = 0; panY = 0; }
  function clearInk() { updateRoomWork(room.id, { ink: [] }); }
</script>

<div class="wrap">
  <div class="toolbar">
    <button class="tgl" class:on={draw && !pinMode} on:click={() => { draw = true; pinMode = false; }}>Draw</button>
    <button class="tgl" class:on={highlighter} on:click={() => (highlighter = !highlighter)} title="Highlighter">HL</button>
    <button class="tgl" class:on={!draw && !pinMode} on:click={() => { draw = false; pinMode = false; }} title="Pan / move">Move</button>
    <button class="tgl" class:on={pinMode} on:click={() => (pinMode = !pinMode)} title="Drop pins">Pin</button>
    <span class="sep"></span>
    <button on:click={() => (hideInk = !hideInk)}>{hideInk ? "Show" : "Hide"} ink</button>
    <button on:click={resetView} title="Reset zoom & pan">Reset</button>
    <button on:click={clearInk} title="Clear all ink">Clear</button>
  </div>
  <div class="swatches">
    {#each colors as c}
      <button class="swatch" class:active={color === c} style="background:{c}"
        on:click={() => (color = c)} aria-label={c}></button>
    {/each}
  </div>

  <div class="imgbox">
    <div class="stage" bind:this={stage}
      class:drawing={draw && !pinMode} class:pinning={pinMode}
      on:pointerdown={down} on:pointermove={move} on:pointerup={up} on:pointercancel={up}
      on:wheel={wheel} on:contextmenu|preventDefault>
      <div class="content" style="transform: translate({panX}px,{panY}px) scale({zoom});">
        <img src={room.image} alt={`Room ${room.id}`} draggable="false" />
        <svg viewBox="0 0 {VBW} {VBH}" preserveAspectRatio="none">
          {#if !hideInk}
            {#each committed as s}
              <path d={path(s)} fill={s.color} opacity={s.tool === "highlighter" ? 0.4 : 1} />
            {/each}
            {#if current}
              <path d={path(current)} fill={current.color} opacity={current.tool === "highlighter" ? 0.4 : 1} />
            {/if}
          {/if}
        </svg>
        {#each pins as p}
          <div class="pin" style="left:{p.x * 100}%;top:{p.y * 100}%" title={p.note}>
            <span>{p.label}</span>
          </div>
        {/each}
      </div>
      <div class="hint">draw · mid: pan · right: erase · scroll: zoom · Plate {room.id}</div>
    </div>
  </div>
</div>

<style>
  .wrap { display: flex; flex-direction: column; gap: 8px; height: 100%; min-height: 0; }
  .imgbox { flex: 1; min-height: 0; min-width: 0; position: relative; }
  .toolbar, .swatches { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .toolbar button, .swatches .swatch {
    background: var(--panel2); color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
  .toolbar button:hover { border-color: var(--mza); }
  .tgl.on { background: var(--mza); color: var(--mzad); border-color: var(--mza); font-weight: 600; }
  .sep { flex: 1; }
  .swatch { width: 22px; height: 22px; padding: 0; border-radius: 50%; }
  .swatch.active { outline: 2px solid #fff; outline-offset: 1px; }

  /* absolute + inset:0 + margin:auto + aspect-ratio + both max constraints =
     largest aspect-correct box that fits the container, centered, never stretched */
  .stage { position: absolute; inset: 0; margin: auto;
    aspect-ratio: 1976 / 1586; max-width: 100%; max-height: 100%;
    overflow: hidden; border-radius: 8px; background: #05070a;
    border: 1px solid var(--line); touch-action: none; user-select: none; }
  .stage.drawing { cursor: crosshair; }
  .stage.pinning { cursor: copy; }
  .stage:not(.drawing):not(.pinning) { cursor: grab; }
  .content { position: absolute; inset: 0; transform-origin: 0 0; }
  .content img { width: 100%; height: 100%; display: block; -webkit-user-drag: none; }
  .content svg { position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; overflow: visible; }
  .pin { position: absolute; transform: translate(-50%, -50%); width: 20px; height: 20px;
    background: #ff5d5d; border: 1px solid #0008; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; pointer-events: none; }
  .pin span { color: #fff; font-size: 10px; font-weight: 700; line-height: 1; }
  .hint { position: absolute; left: 8px; bottom: 6px; font-size: 10px; color: #ffffff66;
    pointer-events: none; text-shadow: 0 1px 2px #000; }
</style>
