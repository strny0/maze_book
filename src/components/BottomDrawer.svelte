<script lang="ts">
  let locked = false;
  let hovering = false;
  $: open = locked || hovering;
</script>

<div class="dock" class:open
  on:mouseenter={() => (hovering = true)} on:mouseleave={() => (hovering = false)}>
  <section class="panel" class:open>
    <button class="lock" on:click={() => (locked = !locked)} title={locked ? "Unlock panel" : "Lock panel open"}>
      {locked ? "🔒" : "🔓"}
    </button>
    <div class="body"><slot /></div>
  </section>
  <button class="handle" class:open on:click={() => (locked = !locked)} title="Room graph">
    <span class="chev">{open ? "▼" : "▲"}</span>
    <span class="cap">ROOM&nbsp;GRAPH</span>
  </button>
</div>

<style>
  .dock { position: fixed; left: 0; bottom: 0; width: 100%; height: 64vh; z-index: 24;
    pointer-events: none; }
  .panel { position: absolute; left: 0; bottom: 0; width: 100%; height: 100%;
    background: var(--panel); border-top: 1px solid var(--line);
    box-shadow: 0 -6px 24px #0008; transform: translateY(101%);
    transition: transform .26s ease; overflow-y: auto; padding: 16px;
    pointer-events: auto; }
  .panel.open { transform: translateY(0); }
  .lock { position: absolute; top: 10px; right: 14px; background: none; border: none;
    color: var(--mza); cursor: pointer; font-size: 15px; }

  /* always-visible notch, centered on the bottom edge */
  .handle { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px; padding: 7px 18px;
    background: var(--panel); border: 1px solid var(--line); border-bottom: none;
    border-radius: 10px 10px 0 0; color: var(--mzam); cursor: pointer;
    pointer-events: auto; transition: bottom .26s ease, background .2s; }
  .handle:hover { background: #1c232d; }
  .handle.open { bottom: 64vh; }
  .chev { font-size: 12px; color: var(--mza); }
  .cap { font-size: 10px; letter-spacing: 2px; }
</style>
