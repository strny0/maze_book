<script lang="ts">
  import type { Room } from "../lib/types";
  import type { TextAnnotation } from "../lib/db/idb";
  import { applyAnnotations } from "../lib/text/annotations";
  import { getRoomWork, updateRoomWork } from "../lib/stores/workspace";

  export let room: Room;
  let tab: "text" | "comments" = "text";

  $: anns = getRoomWork(room.id).annotations;
  $: byPara = (i: number) => anns.filter((a) => a.paraIndex === i);

  let pop: { paraIndex: number; start: number; end: number; x: number; y: number } | null = null;

  function onMouseUp(paraIndex: number, e: MouseEvent, el: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { pop = null; return; }
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    if (end > start) pop = { paraIndex, start, end, x: e.clientX, y: e.clientY };
  }

  function addAnn(patch: Partial<TextAnnotation>) {
    if (!pop) return;
    const ann: TextAnnotation = { paraIndex: pop.paraIndex, start: pop.start, end: pop.end, ...patch };
    updateRoomWork(room.id, { annotations: [...anns, ann] });
    pop = null;
    window.getSelection()?.removeAllRanges();
  }
  function addComment() {
    const c = prompt("Comment:");
    if (c) addAnn({ comment: c });
  }
  function styleFor(a: TextAnnotation): string {
    const s: string[] = [];
    if (a.textColor) s.push(`color:${a.textColor}`);
    if (a.highlight) s.push(`background:${a.highlight}`);
    if (a.bold) s.push("font-weight:700");
    if (a.italic) s.push("font-style:italic");
    if (a.comment && !a.highlight) s.push("outline:1px solid #ffffff33; border-radius:3px");
    return s.join(";");
  }
</script>

<div class="tabs">
  <button class:active={tab === "text"} on:click={() => (tab = "text")}>Text</button>
  <button class:active={tab === "comments"} on:click={() => (tab = "comments")}>Comments</button>
</div>

{#if tab === "text"}
  {#each room.text as para, i}
    <p class="para" on:mouseup={(e) => onMouseUp(i, e, e.currentTarget)}>
      {#each applyAnnotations(para, byPara(i)) as seg}
        {#if seg.ann}<span style={styleFor(seg.ann)} title={seg.ann.comment ?? ""}>{seg.text}</span>
        {:else}{seg.text}{/if}
      {/each}
    </p>
  {/each}
{:else}
  <ul class="comments">
    {#each anns.filter((a) => a.comment) as a}
      <li><em>"{room.text[a.paraIndex].slice(a.start, a.end)}"</em> — {a.comment}</li>
    {/each}
  </ul>
{/if}

{#if pop}
  <div class="pop" style="left:{pop.x}px; top:{pop.y}px">
    <button on:click={() => addAnn({ bold: true })}><b>B</b></button>
    <button on:click={() => addAnn({ italic: true })}><i>I</i></button>
    <button on:click={() => addAnn({ highlight: "#e2a85755" })}>HL</button>
    <button on:click={() => addAnn({ textColor: "#ff6b6b" })}>Color</button>
    <button on:click={addComment}>💬</button>
  </div>
{/if}

<style>
  .tabs { display: flex; gap: 6px; margin-bottom: 8px; }
  .tabs button.active { color: var(--mza); }
  .para { line-height: 1.6; font-family: Georgia, serif; }
  .pop { position: fixed; transform: translate(-50%, -120%); display: flex; gap: 4px;
    background: #0a0e13; border: 1px solid var(--line); border-radius: 8px; padding: 6px; z-index: 50; }
  .pop button { background: #1c232d; color: var(--text); border: none; border-radius: 5px;
    padding: 4px 8px; cursor: pointer; }
  .comments { padding-left: 16px; }
</style>
