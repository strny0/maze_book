import type { Door, UserEdge } from "../types";

export function computeFrontier(
  explored: Set<string>,
  doors: Door[],
  userEdges: UserEdge[]
): Set<string> {
  const frontier = new Set<string>();
  for (const d of doors) {
    if (explored.has(d.from) && !explored.has(d.to)) frontier.add(d.to);
    if (!d.oneWay && explored.has(d.to) && !explored.has(d.from)) frontier.add(d.from);
  }
  for (const e of userEdges) {
    if (explored.has(e.from) && !explored.has(e.to)) frontier.add(e.to);
    if (!e.oneWay && explored.has(e.to) && !explored.has(e.from)) frontier.add(e.from);
  }
  return frontier;
}
