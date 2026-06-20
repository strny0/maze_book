import type { Room } from "../types";

interface RawRoom { text: string[]; image: string; title?: string }
interface RawContent { prologue: RawRoom; rooms: Record<string, RawRoom> }

export function parseContent(json: unknown): Room[] {
  const data = json as RawContent;
  const rooms: Room[] = [];
  rooms.push({ id: "00", title: data.prologue.title, text: data.prologue.text, image: data.prologue.image });
  for (const [key, r] of Object.entries(data.rooms)) {
    rooms.push({ id: key, title: r.title, text: r.text, image: r.image });
  }
  rooms.sort((a, b) => a.id.localeCompare(b.id));
  return rooms;
}
