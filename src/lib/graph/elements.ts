import type { ElementDefinition } from "cytoscape";
import type { Room, Door } from "../types";

export function buildElements(
  rooms: Room[], doors: Door[], current: string,
  explored: Set<string>, positions: Record<string, { x: number; y: number }>
): ElementDefinition[] {
  const nodes: ElementDefinition[] = rooms.map((r) => {
    const cls: string[] = [];
    if (r.id === current) cls.push("current");
    if (explored.has(r.id)) cls.push("explored");
    const el: ElementDefinition = { data: { id: r.id, label: r.id }, classes: cls.join(" ") };
    if (positions[r.id]) el.position = { ...positions[r.id] };
    return el;
  });
  const edges: ElementDefinition[] = doors.map((d, i) => ({
    data: { id: `e${i}`, source: d.from, target: d.to },
    classes: d.oneWay ? "oneway" : "",
  }));
  return [...nodes, ...edges];
}
