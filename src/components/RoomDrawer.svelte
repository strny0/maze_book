<script lang="ts">
  export let unplacedRooms: string[] = [];

  function onDragStart(e: DragEvent, roomId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData("text/plain", roomId);
    e.dataTransfer.effectAllowed = "copy";
  }
</script>

<div class="drawer">
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
    padding: 8px 12px; overflow-x: auto; flex: none; height: 48px;
    border-top: 1px solid var(--line); background: var(--panel);
    scrollbar-width: thin;
  }
  .chip {
    width: 28px; height: 28px; flex: none; border-radius: 6px;
    background: #3a4756; border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 600; color: #cbd3dd;
    cursor: grab;
  }
  .chip:active { cursor: grabbing; }
  .chip:hover { border-color: var(--mza); }
  .empty { font-size: 11px; color: var(--dim); }
</style>
