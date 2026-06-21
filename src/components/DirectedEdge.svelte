<script lang="ts">
  import { BaseEdge, getBezierPath, Position } from "@xyflow/svelte";

  export let id: string;
  export let sourceX: number;
  export let sourceY: number;
  export let targetX: number;
  export let targetY: number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let sourcePosition: any = undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let targetPosition: any = undefined;
  export let data: {
    aToB: boolean;
    bToA: boolean;
    isPath: boolean;
    onToggleAToB: () => void;
    onToggleBToA: () => void;
  };

  function edgeDir(fromX: number, fromY: number, toX: number, toY: number): Position {
    const dx = toX - fromX;
    const dy = toY - fromY;
    return Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? Position.Right : Position.Left)
      : (dy >= 0 ? Position.Bottom : Position.Top);
  }

  // Pull path endpoints back to the node boundary so arrow tips sit just outside nodes.
  // NODE_RADIUS matches the 40px node size (half = 20px); GAP adds a small breathing room.
  const NODE_RADIUS = 20;
  const GAP = 3;

  let edgePath = "";
  $: {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const off = (NODE_RADIUS + GAP) / len;
    [edgePath] = getBezierPath({
      sourceX: sourceX + dx * off, sourceY: sourceY + dy * off,
      targetX: targetX - dx * off, targetY: targetY - dy * off,
      sourcePosition: edgeDir(sourceX, sourceY, targetX, targetY),
      targetPosition: edgeDir(targetX, targetY, sourceX, sourceY),
    });
  }

  // Dots sit just outside the node boundary for click-to-toggle interaction
  const DOT_OFFSET = 26;
  let srcDotX = sourceX, srcDotY = sourceY;
  let tgtDotX = targetX, tgtDotY = targetY;
  $: {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    srcDotX = sourceX + (dx / len) * DOT_OFFSET;
    srcDotY = sourceY + (dy / len) * DOT_OFFSET;
    tgtDotX = targetX - (dx / len) * DOT_OFFSET;
    tgtDotY = targetY - (dy / len) * DOT_OFFSET;
  }

  let hovered = false;
  let hoverSrc = false;
  let hoverTgt = false;

  $: srcDotColor = hoverSrc
    ? (data.bToA && !data.aToB ? "#e05050" : (data.bToA ? "#e2a857" : "#e05050"))
    : (data.bToA ? "#e2a857" : "#4a5a6a");
  $: tgtDotColor = hoverTgt
    ? (data.aToB && !data.bToA ? "#e05050" : (data.aToB ? "#e2a857" : "#e05050"))
    : (data.aToB ? "#e2a857" : "#4a5a6a");

  $: edgeStyle = data.isPath
    ? "stroke:#ffffff;stroke-width:2.5px"
    : "stroke:#e2a857;stroke-width:1.5px";

  $: arrowFill = data.isPath ? "#ffffff" : "#e2a857";
</script>

<!--
  Markers live inside the edge SVG (via SvelteFlow's edges <svg>) so url(#id) resolves correctly.
  arr-fwd: right-pointing triangle, refX=8 puts tip at path endpoint (marker-end).
  arr-back: left-pointing triangle, refX=0 puts tip at path startpoint (marker-start, orient=auto).
  markerUnits=userSpaceOnUse gives predictable pixel sizes regardless of stroke-width.
-->
<defs>
  <marker id="arr-fwd-{id}" markerWidth="8" markerHeight="8" refX="8" refY="4"
    orient="auto" markerUnits="userSpaceOnUse">
    <path d="M0,0 L8,4 L0,8 Z" fill={arrowFill} />
  </marker>
  <marker id="arr-back-{id}" markerWidth="8" markerHeight="8" refX="0" refY="4"
    orient="auto" markerUnits="userSpaceOnUse">
    <path d="M8,0 L0,4 L8,8 Z" fill={arrowFill} />
  </marker>
</defs>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<g
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => { hovered = false; hoverSrc = false; hoverTgt = false; }}
>
  <BaseEdge
    {id}
    path={edgePath}
    style={edgeStyle}
    markerStart={data.bToA ? `url(#arr-back-${id})` : undefined}
    markerEnd={data.aToB ? `url(#arr-fwd-${id})` : undefined}
  />

  {#if hovered}
    <!-- Dot near source — controls bToA -->
    <circle
      cx={srcDotX} cy={srcDotY} r="6"
      fill={srcDotColor} stroke="#0a0f14" stroke-width="1.5"
      style="cursor:pointer;pointer-events:all"
      on:mouseenter={() => (hoverSrc = true)}
      on:mouseleave={() => (hoverSrc = false)}
      on:click|stopPropagation={data.onToggleBToA}
    />
    <!-- Dot near target — controls aToB -->
    <circle
      cx={tgtDotX} cy={tgtDotY} r="6"
      fill={tgtDotColor} stroke="#0a0f14" stroke-width="1.5"
      style="cursor:pointer;pointer-events:all"
      on:mouseenter={() => (hoverTgt = true)}
      on:mouseleave={() => (hoverTgt = false)}
      on:click|stopPropagation={data.onToggleAToB}
    />
  {/if}
</g>
