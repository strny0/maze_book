import type { UserEdge } from "../types";

export function shortestPath(
  edges: UserEdge[],
  from: string,
  to: string
): string[] | null {
  if (from === to) return [from];
  const prev = new Map<string, string>();
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const e of edges) {
      let next: string | null = null;
      if (e.a === cur && e.aToB && !visited.has(e.b)) next = e.b;
      else if (e.b === cur && e.bToA && !visited.has(e.a)) next = e.a;
      if (!next) continue;
      prev.set(next, cur);
      if (next === to) {
        const path: string[] = [];
        let n: string | undefined = to;
        while (n !== undefined) { path.unshift(n); n = prev.get(n); }
        return path;
      }
      visited.add(next);
      queue.push(next);
    }
  }
  return null;
}
