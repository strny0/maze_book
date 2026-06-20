import type { Room } from "../types";

interface RawRoom { text: string[]; image: string; title?: string }
interface RawContent { prologue: RawRoom; rooms: Record<string, RawRoom> }

function resolveImage(id: string, image: string): string {
  if (image.includes("/")) return image;              // already a path/URL (imported pack)
  if (id === "00") return `assets/images/${image}`;   // prologue/top-level
  return `assets/images/room/${image}`;               // rooms 01..45
}

export function parseContent(json: unknown): Room[] {
  const data = json as RawContent;
  const rooms: Room[] = [];
  rooms.push({ id: "00", title: data.prologue.title, text: data.prologue.text, image: resolveImage("00", data.prologue.image) });
  for (const [key, r] of Object.entries(data.rooms)) {
    rooms.push({ id: key, title: r.title, text: r.text, image: resolveImage(key, r.image) });
  }
  rooms.sort((a, b) => a.id.localeCompare(b.id));
  return rooms;
}
