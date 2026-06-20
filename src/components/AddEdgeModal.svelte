<script lang="ts">
  import { rooms } from "../lib/stores/content";
  import { addUserEdge } from "../lib/stores/workspace";

  export let currentRoom: string;
  export let open = false;

  let from = "";
  let to = "";
  let oneWay = false;
  let error = "";

  $: if (open) {
    from = currentRoom;
    to = "";
    oneWay = false;
    error = "";
  }

  function submit() {
    const ids = new Set($rooms.map((r) => r.id));
    if (!ids.has(from)) { error = `Room "${from}" does not exist`; return; }
    if (!ids.has(to)) { error = `Room "${to}" does not exist`; return; }
    if (from === to) { error = "From and To must be different"; return; }
    addUserEdge({ from, to, oneWay });
    open = false;
  }

  function cancel() { open = false; }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") cancel();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if open}
  <div class="scrim" on:click={cancel} role="presentation">
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-label="Add Connection">
      <h3>Add Connection</h3>
      <div class="row">
        <label>From <input bind:value={from} maxlength="2" /></label>
        <label>To <input bind:value={to} maxlength="2" /></label>
      </div>
      <div class="dir">
        <label><input type="radio" bind:group={oneWay} value={false} /> ↔ Two-way</label>
        <label><input type="radio" bind:group={oneWay} value={true} /> → One-way</label>
      </div>
      {#if error}<p class="err">{error}</p>{/if}
      <div class="btns">
        <button on:click={cancel}>Cancel</button>
        <button class="primary" on:click={submit}>Add</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; background: #00000088;
    display: flex; align-items: center; justify-content: center; z-index: 100;
  }
  .modal {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 10px; padding: 20px 24px; min-width: 280px;
  }
  h3 { margin: 0 0 16px; font-size: 13px; color: var(--text); font-weight: 600; }
  .row { display: flex; gap: 16px; margin-bottom: 14px; }
  label { font-size: 11px; color: var(--dim); display: flex; flex-direction: column; gap: 4px; }
  input[type="text"], input:not([type]) {
    background: var(--panel2); border: 1px solid var(--line); border-radius: 6px;
    padding: 6px 8px; color: var(--text); width: 64px; font-size: 12px;
  }
  .dir { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
  .dir label { flex-direction: row; align-items: center; gap: 6px; cursor: pointer; color: var(--text); }
  .err { color: #e05050; font-size: 11px; margin: 0 0 10px; }
  .btns { display: flex; justify-content: flex-end; gap: 8px; }
  .btns button {
    background: var(--panel2); color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-family: inherit;
  }
  .btns button.primary { border-color: var(--mza); color: var(--mza); }
  .btns button:hover { border-color: var(--mza); }
</style>
