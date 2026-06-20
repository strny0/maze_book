import { describe, it, expect } from "vitest";
import { buildElements } from "./elements";
import type { Door, UserEdge } from "../types";

const rooms = [
  { id: "01", text: [], image: "01.jpg" },
  { id: "20", text: [], image: "20.jpg" },
  { id: "21", text: [], image: "21.jpg" },
];
const doors: Door[] = [
  { from: "01", to: "20", oneWay: false },
  { from: "01", to: "21", oneWay: true },
];
const noUserEdges: UserEdge[] = [];

function nodes(els: ReturnType<typeof buildElements>) {
  return els.filter(e => !("source" in (e.data as any)));
}
function edges(els: ReturnType<typeof buildElements>) {
  return els.filter(e => "source" in (e.data as any));
}
function nodeById(els: ReturnType<typeof buildElements>, id: string) {
  return nodes(els).find(e => (e.data as any).id === id);
}

describe("buildElements", () => {
  it("only renders explored and frontier nodes in normal mode", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20", "21"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodes(els)).toHaveLength(3);
  });

  it("renders no nodes when nothing explored", () => {
    const els = buildElements(rooms, doors, noUserEdges, "01", new Set(), new Set(), {}, false);
    expect(nodes(els)).toHaveLength(0);
  });

  it("tags current node with current class", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodeById(els, "01")?.classes).toContain("current");
  });

  it("tags explored non-current nodes with explored class", () => {
    const explored = new Set(["01", "20"]);
    const frontier = new Set(["21"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodeById(els, "20")?.classes).toContain("explored");
  });

  it("tags frontier nodes with frontier class", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(nodeById(els, "20")?.classes).toContain("frontier");
  });

  it("applies saved positions", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, { "20": { x: 5, y: 9 } }, false);
    expect(nodeById(els, "20")?.position).toEqual({ x: 5, y: 9 });
  });

  it("only renders edges where both endpoints are visible", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]); // 21 not in frontier
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    expect(edges(els)).toHaveLength(1);
    expect((edges(els)[0].data as any).target).toBe("20");
  });

  it("tags one-way obvious edges with oneway class", () => {
    const explored = new Set(["01"]);
    const frontier = new Set(["20", "21"]);
    const els = buildElements(rooms, doors, noUserEdges, "01", explored, frontier, {}, false);
    const oneway = edges(els).find(e => (e.data as any).target === "21");
    expect(oneway?.classes).toContain("oneway");
  });

  it("renders user edges with user class", () => {
    const ue: UserEdge[] = [{ from: "01", to: "20", oneWay: false }];
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, ue, "01", explored, frontier, {}, false);
    const userEdge = edges(els).find(e => (e.data as any).id.startsWith("u"));
    expect(userEdge?.classes).toContain("user");
    expect(userEdge?.classes).not.toContain("user-oneway");
  });

  it("renders one-way user edges with user-oneway class", () => {
    const ue: UserEdge[] = [{ from: "01", to: "20", oneWay: true }];
    const explored = new Set(["01"]);
    const frontier = new Set(["20"]);
    const els = buildElements(rooms, doors, ue, "01", explored, frontier, {}, false);
    const userEdge = edges(els).find(e => (e.data as any).id.startsWith("u"));
    expect(userEdge?.classes).toContain("user-oneway");
  });

  it("devMode renders all rooms regardless of explored/frontier", () => {
    const els = buildElements(rooms, doors, noUserEdges, "01", new Set(), new Set(), {}, true);
    expect(nodes(els)).toHaveLength(3);
  });
});
