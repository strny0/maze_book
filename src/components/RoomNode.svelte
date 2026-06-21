<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  export let data: {
    roomId: string;
    isCurrent: boolean;
    isExplored: boolean;
    isQueryHit: boolean;
    isDrawSource: boolean;
    onRemove: () => void;
  };

  let showMenu = false;

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    showMenu = true;
  }

  function dismissMenu() { showMenu = false; }
  function doRemove() { showMenu = false; data.onRemove(); }
</script>

<svelte:window on:click={dismissMenu} />

<Handle type="source" position={Position.Top} class="center-handle" />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="node"
  class:current={data.isCurrent}
  class:explored={data.isExplored && !data.isCurrent}
  class:unreachable={!data.isExplored && !data.isCurrent}
  class:query-hit={data.isQueryHit}
  class:draw-source={data.isDrawSource}
  on:contextmenu={onContextMenu}
>
  {data.roomId}
  {#if showMenu}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="menu" on:click|stopPropagation>
      {#if data.roomId !== "01"}
        <button on:click={doRemove}>Remove from canvas</button>
      {:else}
        <span class="no-remove">Room 01 cannot be removed</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .node {
    width: 40px; height: 40px; border-radius: 6px;
    background: var(--panel2); border: 1px solid var(--line);
    border-bottom: 3px solid var(--btn-border-b);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: var(--text);
    font-family: var(--sc-font);
    cursor: pointer; position: relative; user-select: none;
    box-sizing: border-box;
  }
  .node.current  { background: var(--mza); color: #15110a; border-color: var(--mza); border-bottom-color: var(--mzad); }
  .node.explored { border: 2px solid var(--mza); border-bottom-width: 3px; border-bottom-color: var(--mzad); }
  .node.unreachable { opacity: 0.55; border-style: dashed; }
  .node.query-hit { box-shadow: 0 0 0 3px var(--mza), 0 0 0 5px var(--panel2); }
  .node.draw-source { box-shadow: 0 0 0 3px var(--mzam); }

  .menu {
    position: absolute; top: 32px; left: 0; z-index: 200;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px; white-space: nowrap;
    box-shadow: 0 4px 16px #0008;
  }
  .menu button {
    display: block; width: 100%; background: none; border: none;
    color: var(--text); font-size: 11px; padding: 6px 10px;
    text-align: left; cursor: pointer; border-radius: 4px;
  }
  .menu button:hover { background: var(--panel2); color: #e05050; }
  .no-remove { display: block; padding: 6px 10px; font-size: 11px; color: var(--dim); }

  :global(.center-handle) {
    opacity: 0 !important; pointer-events: none !important;
    top: 50% !important; left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 1px !important; height: 1px !important;
  }
</style>
