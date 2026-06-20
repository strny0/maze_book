<script lang="ts">
  let locked = false;
  let hovering = false;
  $: open = locked || hovering;
</script>

<!-- dock spans the panel's footprint; pointer-events:none so only the handle
     and (when open) the panel are hit targets, giving clean subtree hover -->
<div class="dock" class:open
  on:mouseenter={() => (hovering = true)} on:mouseleave={() => (hovering = false)}>
  <aside class="panel" class:open>
    <button class="lock" on:click={() => (locked = !locked)} title={locked ? "Unlock panel" : "Lock panel open"}>
      {locked ? "🔒" : "🔓"}
    </button>
    <div class="body"><slot /></div>
  </aside>
  <button class="handle" class:open on:click={() => (locked = !locked)} title="Room info & directory">
    <span class="grip"></span>
    <span class="cap">ROOM&nbsp;INFO</span>
    <span class="chev">{open ? "‹" : "›"}</span>
  </button>
</div>

<style>
  .dock { position: fixed; top: 0; left: 0; height: 100%; width: 372px; z-index: 25;
    pointer-events: none; }
  .panel { position: absolute; top: 0; left: 0; height: 100%; width: 360px;
    background: var(--bg); border-right: 1px solid var(--line);
    box-shadow: 6px 0 24px #0008; transform: translateX(-101%);
    transition: transform .26s ease; overflow-y: auto; padding: 16px 16px 28px;
    pointer-events: auto; }
  .panel.open { transform: translateX(0); }
  .lock { position: absolute; top: 10px; right: 10px; background: none; border: none;
    color: var(--mza); cursor: pointer; font-size: 15px; }

  /* always-visible notch */
  .handle { position: absolute; top: 50%; left: 0; transform: translateY(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    width: 26px; padding: 14px 0; background: var(--panel);
    border: 1px solid var(--line); border-left: none; border-radius: 0 10px 10px 0;
    color: var(--mzam); cursor: pointer; pointer-events: auto;
    transition: left .26s ease, background .2s; }
  .handle:hover { background: #1c232d; }
  .handle.open { left: 360px; }
  .grip { width: 4px; height: 26px; border-radius: 3px; background: var(--mza); opacity: .8; }
  .cap { writing-mode: vertical-rl; text-orientation: mixed; font-size: 10px;
    letter-spacing: 2px; color: var(--mzam); }
  .chev { font-size: 14px; line-height: 1; color: var(--mza); }
</style>
