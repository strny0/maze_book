import { writable, derived, get } from "svelte/store";
import { setWorkspace, type WorkspaceDoc, type RoomWork } from "../db/idb";
import type { UserEdge } from "../types";

const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], pins: [] }) as RoomWork;

export const currentRoom = writable<string>("01");
export const roomWork = writable<Record<string, RoomWork>>({});
export const tags = writable<WorkspaceDoc["tags"]>({ defs: [], byRoom: {} });
export const positions = writable<Record<string, { x: number; y: number }>>({ "01": { x: 100, y: 200 } });
export const globalNotes = writable<string>("");
export const userEdges = writable<UserEdge[]>([]);

// BFS from "01" through userEdges — rooms reachable from the starting room
export const explored = derived(
  [userEdges, positions],
  ([$userEdges, $positions]) => {
    const onCanvas = new Set(Object.keys($positions));
    if (!onCanvas.has("01")) return new Set<string>();
    const visited = new Set<string>(["01"]);
    const queue = ["01"];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const e of $userEdges) {
        if (e.a === cur && e.aToB && !visited.has(e.b)) { visited.add(e.b); queue.push(e.b); }
        if (e.b === cur && e.bToA && !visited.has(e.a)) { visited.add(e.a); queue.push(e.a); }
      }
    }
    return visited;
  }
);

export function initWorkspace(doc?: WorkspaceDoc) {
  currentRoom.set("01");
  roomWork.set(doc?.rooms ?? {});
  tags.set(doc?.tags ?? { defs: [], byRoom: {} });
  // Always ensure "01" is on canvas
  positions.set({ "01": { x: 100, y: 200 }, ...(doc?.positions ?? {}) });
  globalNotes.set(doc?.globalNotes ?? "");
  userEdges.set(doc?.userEdges ?? []);
}

export function getRoomWork(id: string): RoomWork {
  return get(roomWork)[id] ?? EMPTY_WORK;
}
export function updateRoomWork(id: string, patch: Partial<RoomWork>) {
  roomWork.update((m) => ({ ...m, [id]: { ...EMPTY_WORK, ...m[id], ...patch } }));
}
export function addUserEdge(edge: UserEdge) {
  userEdges.update((es) => [...es, edge]);
}
export function removeUserEdgesForNode(id: string) {
  userEdges.update((es) => es.filter((e) => e.a !== id && e.b !== id));
}

export const workspaceDoc = derived(
  [roomWork, tags, positions, globalNotes, userEdges],
  ([$rw, $tg, $pos, $gn, $ue]): WorkspaceDoc => ({
    rooms: $rw, explored: [], tags: $tg, positions: $pos, globalNotes: $gn, userEdges: $ue,
  })
);

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
export function startAutosave() {
  if (started) return;
  started = true;
  workspaceDoc.subscribe((doc) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void setWorkspace(doc), 400);
  });
}

export function toggleTag(roomId: string, tagName: string) {
  tags.update((t) => {
    const current = t.byRoom[roomId] ?? [];
    const next = current.includes(tagName)
      ? current.filter((x) => x !== tagName)
      : [...current, tagName];
    return { ...t, byRoom: { ...t.byRoom, [roomId]: next } };
  });
}

export function setTagDef(name: string, color: string) {
  tags.update((t) => {
    const existing = t.defs.findIndex((d) => d.name === name);
    const defs =
      existing >= 0
        ? t.defs.map((d, i) => (i === existing ? { name, color } : d))
        : [...t.defs, { name, color }];
    return { ...t, defs };
  });
}
