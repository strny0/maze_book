import { writable, derived } from "svelte/store";
import type { Room, Door } from "../types";

export const rooms = writable<Room[]>([]);
export const doors = writable<Door[]>([]);
export const roomById = derived(rooms, ($r) => new Map($r.map((x) => [x.id, x])));

export function loadContent(r: Room[], d: Door[]) { rooms.set(r); doors.set(d); }

export function doorsFrom(allDoors: Door[], id: string): string[] {
  const out = new Set<string>();
  for (const d of allDoors) {
    if (d.from === id) out.add(d.to);
    if (d.to === id && !d.oneWay) out.add(d.from);
  }
  return [...out].sort();
}
