<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { theme, setTheme, type ThemeVariant } from "../lib/stores/theme";

  export let show = false;
  export let exportWs: () => void;
  export let importWs: (e: Event) => void;

  const dispatch = createEventDispatcher();
  function close() { dispatch("close"); }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  const variants: { value: ThemeVariant; label: string }[] = [
    { value: "manuscript", label: "Manuscript" },
    { value: "engraved",   label: "Engraved"   },
    { value: "foxed",      label: "Foxed"       },
  ];
</script>

<svelte:window on:keydown={onKeydown} />

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="overlay" on:click={onBackdrop}>
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="section-head">Theme</div>
      <div class="seg">
        {#each variants as v}
          <button
            class="seg-btn"
            class:active={$theme === v.value}
            on:click={() => setTheme(v.value)}
          >{v.label}</button>
        {/each}
      </div>

      <div class="section-head">Data</div>
      <div class="actions">
        <button class="act-btn" on:click={exportWs}>Export workspace</button>
        <label class="act-btn">
          Import workspace
          <input type="file" accept="application/json" on:change={importWs} hidden />
        </label>
      </div>

      <button class="close-btn" on:click={close} aria-label="Close">×</button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center;
  }
  .dialog {
    position: relative;
    width: 360px; padding: 24px;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; box-shadow: var(--panel-shadow);
  }
  .section-head {
    font-family: var(--sc-font); font-size: 11px; letter-spacing: .1em;
    color: var(--mzam); text-transform: uppercase;
    margin: 0 0 10px;
  }
  .section-head + .section-head, .seg + .section-head, .actions + .section-head {
    margin-top: 20px;
  }
  .seg {
    display: inline-flex; border: 1px solid var(--seg-border);
    border-radius: 8px; overflow: hidden; background: var(--seg-bg);
    margin-bottom: 4px;
  }
  .seg-btn {
    font-family: var(--sc-font); font-size: 13px; letter-spacing: .04em;
    padding: 6px 16px; cursor: pointer;
    background: none; color: var(--seg-idle); border: none;
    transition: background .1s, color .1s;
  }
  .seg-btn.active {
    background: var(--seg-active-bg); color: var(--seg-active-text);
  }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .act-btn {
    background: var(--panel2); color: var(--text);
    border: 1px solid var(--line); border-bottom: 3px solid var(--btn-border-b);
    border-radius: 7px; padding: 6px 14px; cursor: pointer; font-size: 13px;
    box-shadow: 0 2px 3px rgba(60,40,12,.12), inset 0 1px 0 rgba(255,252,240,.4);
  }
  .act-btn:hover { border-color: var(--mzam); }
  .close-btn {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: var(--dim);
    font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px;
  }
  .close-btn:hover { color: var(--text); }
</style>
