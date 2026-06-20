<script lang="ts">
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
    width: 28px; height: 28px; border-radius: 6px;
    background: #3a4756; border: 1px solid #4a5a6a;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 600; color: #cbd3dd;
    cursor: pointer; position: relative; user-select: none;
    box-sizing: border-box;
  }
  .node.current  { background: #e2a857; color: #15110a; border-color: #e2a857; }
  .node.explored { border: 2px solid #e2a857; }
  .node.unreachable { opacity: 0.6; border-style: dashed; }
  .node.query-hit { box-shadow: 0 0 0 3px #e2a857, 0 0 0 5px #3a4756; }
  .node.draw-source { box-shadow: 0 0 0 3px #e2a857aa; }

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
</style>
