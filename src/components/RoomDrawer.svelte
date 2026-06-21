<script lang="ts">
  export let unplacedRooms: string[] = [];

  function onDragStart(e: DragEvent, roomId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData("text/plain", roomId);
    e.dataTransfer.effectAllowed = "copy";
  }

  function onWheel(e: WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.deltaY === 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).scrollLeft += e.deltaY;
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="drawer" on:wheel|nonpassive={onWheel}>
  {#if unplacedRooms.length === 0}
    <span class="empty">All rooms placed</span>
  {:else}
    {#each unplacedRooms as roomId (roomId)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="chip"
        draggable="true"
        title="Drag to place room {roomId}"
        on:dragstart={(e) => onDragStart(e, roomId)}
      >
        {roomId}
      </div>
    {/each}
  {/if}
</div>

<style>
  .drawer {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 12px; overflow-x: auto; overflow-y: hidden; flex: none; height: 58px;
    border-top: 1px solid var(--line); background: var(--panel);
    scrollbar-width: thin; scrollbar-color: var(--line) transparent;
  }
  .drawer::-webkit-scrollbar { height: 4px; }
  .drawer::-webkit-scrollbar-track { background: transparent; }
  .drawer::-webkit-scrollbar-thumb { background: var(--line); border-radius: 2px; }
  .drawer::-webkit-scrollbar-thumb:hover { background: var(--mza); }
  .chip {
    width: 40px; height: 40px; flex: none; border-radius: 6px;
    background: var(--panel2); border: 1px solid var(--line);
    border-bottom: 3px solid var(--btn-border-b);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: var(--text);
    font-family: var(--sc-font); cursor: grab;
  }
  .chip:active { cursor: grabbing; border-bottom-width: 1px; transform: translateY(1px); }
  .chip:hover { border-color: var(--mzam); color: var(--mza); }
  .empty { font-size: 11px; color: var(--dim); }
</style>
