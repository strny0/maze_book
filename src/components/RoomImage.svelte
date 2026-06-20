<script lang="ts">
  import type { Room } from "../lib/types";
  import { strokeToPath } from "../lib/ink/freehand";
  import { roomWork, updateRoomWork } from "../lib/stores/workspace";

  export let room: Room;

  type Stroke = { tool: "pen" | "highlighter"; color: string; points: number[][] };
  let tool: "pen" | "highlighter" | "eraser" | "pin" = "pen";
  let color = "#e2a857";
  const colors = ["#ff6b6b", "#e2a857", "#f3a45b", "#4ec3e0", "#5fd38d", "#ffffff"];
  const tools: Array<"pen" | "highlighter" | "eraser" | "pin"> = ["pen", "highlighter", "eraser", "pin"];
  let strokes: Stroke[] = [];
  let current: Stroke | null = null;
  let hideInk = false;
  let svg: SVGSVGElement;

  $: { current = null; strokes = ($roomWork[room.id]?.ink as Stroke[]) ?? []; }
  $: pins = $roomWork[room.id]?.pins ?? [];

  function persist() { updateRoomWork(room.id, { ink: strokes }); }
  function pt(e: PointerEvent): number[] {
    const r = svg.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5];
  }
  function placePin(e: PointerEvent) {
    const r = svg.getBoundingClientRect();
    const label = String(pins.length + 1);
    const note = prompt("Pin note (optional):") ?? "";
    updateRoomWork(room.id, { pins: [...pins, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, label, note }] });
  }
  function down(e: PointerEvent) {
    if (tool === "eraser") return;
    if (tool === "pin") { placePin(e); return; }
    svg.setPointerCapture(e.pointerId);
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
  {#each tools as t}
    <button class:active={tool === t} on:click={() => (tool = t)}>{t}</button>
  {/each}
  {#each colors as c}
    <button class="swatch" style="background:{c}" class:active={color === c} on:click={() => (color = c)} aria-label={c}></button>
  {/each}
  <button on:click={() => (hideInk = !hideInk)}>{hideInk ? "show ink" : "hide ink"}</button>
  <button on:click={reset}>reset</button>
</div>

<div class="canvas">
  <img src={room.image} alt={`Room ${room.id}`} draggable="false" />
  <svg bind:this={svg} on:pointerdown={down} on:pointermove={move} on:pointerup={up} on:pointerleave={up}>
    {#if !hideInk}
      {#each strokes as s, i}
        <path d={strokeToPath(s.points, { size: s.tool === "highlighter" ? 16 : 6 })}
          fill={s.color} opacity={s.tool === "highlighter" ? 0.35 : 1}
          on:click={() => eraseStroke(i)} />
      {/each}
    {/if}
  </svg>
  {#each pins as p}
    <div class="pin" style={`left:${p.x * 100}%;top:${p.y * 100}%`} title={p.note}>
      <span class="pin-label">{p.label}</span>
    </div>
  {/each}
</div>

<style>
  .canvas { position: relative; width: 100%; }
  .canvas img { width: 100%; display: block; user-select: none; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
  .toolbar { display: flex; gap: 6px; padding: 8px; flex-wrap: wrap; }
  .swatch { width: 22px; height: 22px; border-radius: 50%; border: 1px solid #0006; }
  button.active { outline: 2px solid var(--mza); }
  .pin { position: absolute; transform: translate(-50%, -50%); width: 22px; height: 22px;
    background: #ff6b6b; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; pointer-events: none; z-index: 10; }
  .pin-label { color: #fff; font-size: 10px; font-weight: 700; line-height: 1; }
</style>
