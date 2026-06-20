import { writable, derived, get } from "svelte/store";
import { setWorkspace, type WorkspaceDoc, type RoomWork } from "../db/idb";
import type { UserEdge } from "../types";

const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], pins: [] }) as RoomWork;

export const currentRoom = writable<string>("01");
export const explored = writable<Set<string>>(new Set());
export const roomWork = writable<Record<string, RoomWork>>({});
export const tags = writable<WorkspaceDoc["tags"]>({ defs: [], byRoom: {} });
export const positions = writable<Record<string, { x: number; y: number }>>({});
export const globalNotes = writable<string>("");
export const userEdges = writable<UserEdge[]>([]);

export function initWorkspace(doc?: WorkspaceDoc) {
  currentRoom.set("01");
  explored.set(new Set(doc?.explored ?? []));
  roomWork.set(doc?.rooms ?? {});
  tags.set(doc?.tags ?? { defs: [], byRoom: {} });
  positions.set(doc?.positions ?? {});
  globalNotes.set(doc?.globalNotes ?? "");
  userEdges.set(doc?.userEdges ?? []);
}

export function getRoomWork(id: string): RoomWork {
  return get(roomWork)[id] ?? EMPTY_WORK;
}
export function updateRoomWork(id: string, patch: Partial<RoomWork>) {
  roomWork.update((m) => ({ ...m, [id]: { ...EMPTY_WORK, ...m[id], ...patch } }));
}
export function markExplored(id: string) {
  explored.update((s) => new Set(s).add(id));
}
export function addUserEdge(edge: UserEdge) {
  userEdges.update((es) => [...es, edge]);
}

export const workspaceDoc = derived(
  [roomWork, explored, tags, positions, globalNotes, userEdges],
  ([$rw, $ex, $tg, $pos, $gn, $ue]): WorkspaceDoc => ({
    rooms: $rw, explored: [...$ex], tags: $tg, positions: $pos, globalNotes: $gn, userEdges: $ue,
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
