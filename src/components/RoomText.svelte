<script lang="ts">
  import type { Room } from "../lib/types";
  export let room: Room;
</script>

<div class="text">
  {#each room.text as para}<p>{para}</p>{/each}
</div>

<style>
  .text { font-family: var(--serif-font); font-size: 15px; line-height: 1.68; color: var(--text); }
  .text p { margin: 0 0 12px; }
  .text p:last-child { margin-bottom: 0; }
</style>
