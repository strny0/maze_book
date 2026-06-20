<script lang="ts">
  let locked = false;
  let hovering = false;
  $: open = locked || hovering;
</script>

<div class="edge" role="presentation"
  on:mouseenter={() => (hovering = true)} on:mouseleave={() => (hovering = false)}>
  <aside class="panel" class:open class:locked>
    <button class="lock" on:click={() => (locked = !locked)} title={locked ? "unlock" : "lock open"}>
      {locked ? "🔒" : "🔓"}
    </button>
    <div class="body"><slot /></div>
  </aside>
</div>

<style>
  .edge { position: fixed; top: 0; left: 0; height: 100%; width: 14px; z-index: 20; }
  .panel { position: fixed; top: 0; left: 0; height: 100%; width: 360px; background: var(--panel);
    border-right: 1px solid var(--line); transform: translateX(-100%);
    transition: transform .28s ease; overflow-y: auto; padding: 14px; }
  .panel.open { transform: translateX(0); }
  .lock { position: absolute; top: 8px; right: 8px; background: none; border: none;
    color: var(--mza); cursor: pointer; font-size: 16px; }
</style>
