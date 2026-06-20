import type { TextAnnotation } from "../db/idb";

export interface Segment { text: string; ann?: TextAnnotation }

export function applyAnnotations(paragraph: string, anns: TextAnnotation[]): Segment[] {
  const sorted = [...anns].sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let cursor = 0;
  for (const a of sorted) {
    const start = Math.max(a.start, cursor);
    if (start > cursor) segs.push({ text: paragraph.slice(cursor, start) });
    if (a.end > start) { segs.push({ text: paragraph.slice(start, a.end), ann: a }); cursor = a.end; }
  }
  if (cursor < paragraph.length) segs.push({ text: paragraph.slice(cursor) });
  return segs;
}
