import type { ElementDefinition } from "cytoscape";
import type { Room, Door, UserEdge } from "../types";

export function buildElements(
  rooms: Room[],
  doors: Door[],
  userEdges: UserEdge[],
  current: string,
  explored: Set<string>,
  frontier: Set<string>,
  positions: Record<string, { x: number; y: number }>,
  devMode: boolean
): ElementDefinition[] {
  const visibleIds: Set<string> = devMode
    ? new Set(rooms.map((r) => r.id))
    : new Set([...explored, ...frontier]);

  const nodes: ElementDefinition[] = rooms
    .filter((r) => visibleIds.has(r.id))
    .map((r) => {
      const cls: string[] = [];
      if (r.id === current) cls.push("current");
      else if (explored.has(r.id)) cls.push("explored");
      else cls.push("frontier");
      const el: ElementDefinition = { data: { id: r.id, label: r.id }, classes: cls.join(" ") };
      if (positions[r.id]) el.position = { ...positions[r.id] };
      return el;
    });

  const edgeEls: ElementDefinition[] = [];
  doors.forEach((d, i) => {
    if (!visibleIds.has(d.from) || !visibleIds.has(d.to)) return;
    edgeEls.push({
      data: { id: `d${i}`, source: d.from, target: d.to },
      classes: d.oneWay ? "oneway" : "",
    });
  });
  userEdges.forEach((e, i) => {
    if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) return;
    edgeEls.push({
      data: { id: `u${i}`, source: e.from, target: e.to },
      classes: ["user", e.oneWay ? "user-oneway" : ""].filter(Boolean).join(" "),
    });
  });

  return [...nodes, ...edgeEls];
}
