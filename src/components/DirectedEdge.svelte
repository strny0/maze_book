<script lang="ts">
  import { BaseEdge, getBezierPath } from "@xyflow/svelte";

  export let id: string;
  export let sourceX: number;
  export let sourceY: number;
  export let targetX: number;
  export let targetY: number;
  export let sourcePosition: any = undefined;
  export let targetPosition: any = undefined;
  export let data: {
    aToB: boolean;
    bToA: boolean;
    isPath: boolean;
    onToggleAToB: () => void;
    onToggleBToA: () => void;
  };

  $: [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  let hovered = false;
  let hoverSrc = false; // hovering dot near source (controls bToA)
  let hoverTgt = false; // hovering dot near target (controls aToB)

  // Red if click would delete edge (last remaining direction being toggled)
  $: srcDotColor = hoverSrc
    ? (data.bToA && !data.aToB ? "#e05050" : (data.bToA ? "#e2a857" : "#e05050"))
    : (data.bToA ? "#e2a857" : "#4a5a6a");
  $: tgtDotColor = hoverTgt
    ? (data.aToB && !data.bToA ? "#e05050" : (data.aToB ? "#e2a857" : "#e05050"))
    : (data.aToB ? "#e2a857" : "#4a5a6a");

  $: edgeStyle = data.isPath
    ? "stroke:#ffffff;stroke-width:2.5px"
    : "stroke:#e2a857;stroke-width:1.5px";
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<g
  on:mouseenter={() => (hovered = true)}
  on:mouseleave={() => { hovered = false; hoverSrc = false; hoverTgt = false; }}
>
  <BaseEdge
    {id}
    path={edgePath}
    style={edgeStyle}
    markerStart={data.bToA ? "url(#arr-back)" : undefined}
    markerEnd={data.aToB ? "url(#arr-fwd)" : undefined}
  />

  {#if hovered}
    <!-- Dot near source — controls bToA -->
    <circle
      cx={sourceX} cy={sourceY} r="6"
      fill={srcDotColor} stroke="#0a0f14" stroke-width="1.5"
      style="cursor:pointer"
      on:mouseenter={() => (hoverSrc = true)}
      on:mouseleave={() => (hoverSrc = false)}
      on:click|stopPropagation={data.onToggleBToA}
    />
    <!-- Dot near target — controls aToB -->
    <circle
      cx={targetX} cy={targetY} r="6"
      fill={tgtDotColor} stroke="#0a0f14" stroke-width="1.5"
      style="cursor:pointer"
      on:mouseenter={() => (hoverTgt = true)}
      on:mouseleave={() => (hoverTgt = false)}
      on:click|stopPropagation={data.onToggleAToB}
    />
  {/if}
</g>
