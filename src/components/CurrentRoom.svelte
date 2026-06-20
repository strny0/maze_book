<script lang="ts">
  import { rooms, doors, doorsFrom, roomById } from "../lib/stores/content";
  import { currentRoom, explored, markExplored, tags, toggleTag, setTagDef } from "../lib/stores/workspace";

  const TAG_PALETTE = ["#ff6b6b", "#e2a857", "#4ec3e0", "#5fd38d", "#b98cff"];
  let newTag = "";

  $: ids = $rooms.map((r) => r.id);
  $: room = $roomById.get($currentRoom);
  $: outs = doorsFrom($doors, $currentRoom);
  $: idx = ids.indexOf($currentRoom);
  $: roomTags = $tags.byRoom[$currentRoom] ?? [];

  function go(id: string) { currentRoom.set(id); markExplored(id); }
  function prev() { if (idx > 0) go(ids[idx - 1]); }
  function next() { if (idx < ids.length - 1) go(ids[idx + 1]); }

  function addTag() {
    const name = newTag.trim();
    if (!name) return;
    const color = TAG_PALETTE[$tags.defs.length % TAG_PALETTE.length];
    setTagDef(name, color);
    toggleTag($currentRoom, name);
    newTag = "";
  }
</script>

<div class="cur">
  <div class="big">{$currentRoom}</div>
  <div class="meta">
    <div class="title">{room?.title ?? `Room ${$currentRoom}`}</div>
    <div class="count">{$explored.size} / {ids.length} explored</div>
  </div>
</div>
<div class="doors">
  {#each outs as d}<button class="chip" on:click={() => go(d)}>{d}</button>{/each}
</div>
<div class="nav">
  <button on:click={prev} disabled={idx <= 0}>‹ prev</button>
  <button on:click={next} disabled={idx >= ids.length - 1}>next ›</button>
</div>

{#if roomTags.length > 0}
  <div class="doors">
    {#each roomTags as tag}
      {@const def = $tags.defs.find((d) => d.name === tag)}
      <button class="chip tag-chip" style={def ? `border-color:${def.color}` : ""}
        on:click={() => toggleTag($currentRoom, tag)}>× {tag}</button>
    {/each}
  </div>
{/if}
<div class="tag-add">
  <input bind:value={newTag} placeholder="add tag…" on:keydown={(e) => e.key === "Enter" && addTag()} />
  <button on:click={addTag}>add</button>
</div>

<style>
  .cur { display: flex; gap: 12px; align-items: center; }
  .big { font-size: 48px; font-weight: 700; color: var(--mza); }
  .doors { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { background: #1c232d; color: var(--mzam); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; }
  .tag-chip { border-width: 2px; }
  .nav { display: flex; gap: 8px; }
  .tag-add { display: flex; gap: 6px; margin-top: 4px; }
  .tag-add input { background: #1c232d; color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 8px; flex: 1; min-width: 0; }
  .tag-add button { background: #1c232d; color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; }
</style>
