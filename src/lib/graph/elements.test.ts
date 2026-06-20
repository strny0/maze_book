import { describe, it, expect } from "vitest";
import { buildElements } from "./elements";

const rooms = [{ id: "00", text: [], image: "p.jpg" }, { id: "01", text: [], image: "01.jpg" }];
const doors = [{ from: "00", to: "01", oneWay: false }];

describe("buildElements", () => {
  it("creates a node per room and an edge per door", () => {
    const els = buildElements(rooms, doors, "00", new Set(), {});
    expect(els.filter((e) => !("source" in (e.data as any)))).toHaveLength(2);
    expect(els.filter((e) => "source" in (e.data as any))).toHaveLength(1);
  });
  it("tags the current node with the current class", () => {
    const els = buildElements(rooms, doors, "00", new Set(), {});
    const node = els.find((e) => (e.data as any).id === "00");
    expect(node?.classes).toContain("current");
  });
  it("applies saved positions", () => {
    const els = buildElements(rooms, doors, "00", new Set(), { "01": { x: 5, y: 9 } });
    expect(els.find((e) => (e.data as any).id === "01")?.position).toEqual({ x: 5, y: 9 });
  });
  it("tags explored nodes with the explored class", () => {
    const els = buildElements(rooms, doors, "00", new Set(["01"]), {});
    expect((els.find((e) => (e.data as any).id === "01") as any)?.classes).toContain("explored");
  });
  it("tags one-way doors with the oneway class", () => {
    const doorOW = [{ from: "00", to: "01", oneWay: true }];
    const els = buildElements(rooms, doorOW, "00", new Set(), {});
    expect((els.find((e) => "source" in (e.data as any)) as any)?.classes).toContain("oneway");
  });
});
