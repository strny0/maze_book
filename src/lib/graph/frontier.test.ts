import { describe, it, expect } from "vitest";
import { computeFrontier } from "./frontier";
import type { Door, UserEdge } from "../types";

const doors: Door[] = [
  { from: "01", to: "20", oneWay: false },
  { from: "01", to: "21", oneWay: false },
  { from: "17", to: "45", oneWay: true },
];

describe("computeFrontier", () => {
  it("returns rooms reachable from explored via obvious doors", () => {
    const f = computeFrontier(new Set(["01"]), doors, []);
    expect(f.has("20")).toBe(true);
    expect(f.has("21")).toBe(true);
  });

  it("excludes already explored rooms", () => {
    const f = computeFrontier(new Set(["01", "20"]), doors, []);
    expect(f.has("20")).toBe(false);
    expect(f.has("21")).toBe(true);
  });

  it("includes reverse direction of two-way doors", () => {
    const f = computeFrontier(new Set(["20"]), doors, []);
    expect(f.has("01")).toBe(true);
  });

  it("excludes reverse of one-way doors", () => {
    const f = computeFrontier(new Set(["45"]), doors, []);
    expect(f.has("17")).toBe(false);
  });

  it("includes rooms reachable via user edges", () => {
    const ue: UserEdge[] = [{ from: "01", to: "17", oneWay: false }];
    const f = computeFrontier(new Set(["01"]), [], ue);
    expect(f.has("17")).toBe(true);
  });

  it("excludes reverse of one-way user edges", () => {
    const ue: UserEdge[] = [{ from: "01", to: "17", oneWay: true }];
    const f = computeFrontier(new Set(["17"]), [], ue);
    expect(f.has("01")).toBe(false);
  });

  it("returns empty set when explored is empty", () => {
    const f = computeFrontier(new Set(), doors, []);
    expect(f.size).toBe(0);
  });
});
