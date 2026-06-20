import type { Door } from "../types";

export function parseMaze(src: string): Door[] {
  const pairs = new Set<string>();
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(\d+)\s*->\s*(\d+)$/.exec(line);
    if (!m) continue;
    pairs.add(`${m[1]}->${m[2]}`);
  }
  const doors: Door[] = [];
  const seen = new Set<string>();
  for (const key of pairs) {
    const [from, to] = key.split("->");
    const reverse = `${to}->${from}`;
    const canonical = from < to ? `${from}->${to}` : reverse;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const oneWay = !pairs.has(reverse);
    const [a, b] = canonical.split("->");
    doors.push({ from: a, to: b, oneWay });
  }
  return doors;
}
