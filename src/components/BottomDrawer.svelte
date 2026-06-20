<script lang="ts">
  let locked = false;
  let hovering = false;
  $: open = locked || hovering;
</script>

<div class="edge" role="presentation"
  on:mouseenter={() => (hovering = true)} on:mouseleave={() => (hovering = false)}>
  <section class="panel" class:open>
    <button class="lock" on:click={() => (locked = !locked)} title={locked ? "unlock" : "lock open"}>
      {locked ? "🔒" : "🔓"}
    </button>
    <div class="body"><slot /></div>
  </section>
</div>

<style>
  .edge { position: fixed; left: 0; bottom: 0; width: 100%; height: 16px; z-index: 20; }
  .panel { position: fixed; left: 0; bottom: 0; width: 100%; height: 60vh; background: var(--panel);
    border-top: 1px solid var(--line); transform: translateY(100%);
    transition: transform .28s ease; padding: 14px; overflow-y: auto; }
  .panel.open { transform: translateY(0); }
  .lock { position: absolute; top: 8px; right: 12px; background: none; border: none;
    color: var(--mza); cursor: pointer; font-size: 16px; }
</style>
