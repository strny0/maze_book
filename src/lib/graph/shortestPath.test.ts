import { describe, it, expect } from "vitest";
import { shortestPath } from "./shortestPath";
import type { UserEdge } from "../types";

describe("shortestPath", () => {
  it("returns [start] when start === end", () => {
    expect(shortestPath([], "01", "01")).toEqual(["01"]);
  });

  it("returns direct one-hop path (aToB)", () => {
    const edges: UserEdge[] = [{ a: "01", b: "20", aToB: true, bToA: false }];
    expect(shortestPath(edges, "01", "20")).toEqual(["01", "20"]);
  });

  it("returns null when no path exists", () => {
    const edges: UserEdge[] = [{ a: "01", b: "20", aToB: true, bToA: false }];
    expect(shortestPath(edges, "20", "01")).toBeNull();
  });

  it("cannot traverse aToB=false forward", () => {
    const edges: UserEdge[] = [{ a: "01", b: "20", aToB: false, bToA: true }];
    expect(shortestPath(edges, "01", "20")).toBeNull();
  });

  it("traverses bToA direction (b→a)", () => {
    const edges: UserEdge[] = [{ a: "20", b: "01", aToB: false, bToA: true }];
    expect(shortestPath(edges, "20", "01")).toBeNull();
    expect(shortestPath(edges, "01", "20")).toEqual(["01", "20"]);
  });

  it("finds multi-hop path", () => {
    const edges: UserEdge[] = [
      { a: "01", b: "20", aToB: true, bToA: false },
      { a: "20", b: "37", aToB: true, bToA: false },
    ];
    expect(shortestPath(edges, "01", "37")).toEqual(["01", "20", "37"]);
  });

  it("returns shortest of two paths", () => {
    const edges: UserEdge[] = [
      { a: "01", b: "20", aToB: true, bToA: true },
      { a: "01", b: "37", aToB: true, bToA: true },
      { a: "20", b: "37", aToB: true, bToA: true },
    ];
    expect(shortestPath(edges, "01", "37")).toEqual(["01", "37"]);
  });
});
