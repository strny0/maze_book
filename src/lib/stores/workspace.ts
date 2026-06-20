import { writable, derived, get } from "svelte/store";
import { setWorkspace, type WorkspaceDoc, type RoomWork } from "../db/idb";

const EMPTY_WORK: RoomWork = Object.freeze({ notes: "", ink: [], annotations: [], pins: [] }) as RoomWork;

export const currentRoom = writable<string>("00");
export const explored = writable<Set<string>>(new Set());
export const roomWork = writable<Record<string, RoomWork>>({});
export const tags = writable<WorkspaceDoc["tags"]>({ defs: [], byRoom: {} });
export const positions = writable<Record<string, { x: number; y: number }>>({});
export const globalNotes = writable<string>("");

export function initWorkspace(doc?: WorkspaceDoc) {
  currentRoom.set("00");
  explored.set(new Set(doc?.explored ?? []));
  roomWork.set(doc?.rooms ?? {});
  tags.set(doc?.tags ?? { defs: [], byRoom: {} });
  positions.set(doc?.positions ?? {});
  globalNotes.set(doc?.globalNotes ?? "");
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

export const workspaceDoc = derived(
  [roomWork, explored, tags, positions, globalNotes],
  ([$rw, $ex, $tg, $pos, $gn]): WorkspaceDoc => ({
    rooms: $rw, explored: [...$ex], tags: $tg, positions: $pos, globalNotes: $gn,
  })
);

export function toggleTag(roomId: string, name: string) {
  tags.update((t) => {
    const cur = t.byRoom[roomId] ?? [];
    const next = cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name];
    return { ...t, byRoom: { ...t.byRoom, [roomId]: next } };
  });
}
export function setTagDef(name: string, color: string) {
  tags.update((t) =>
    t.defs.some((d) => d.name === name)
      ? t
      : { ...t, defs: [...t.defs, { name, color }] }
  );
}

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
