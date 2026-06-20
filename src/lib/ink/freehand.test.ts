import { describe, it, expect } from "vitest";
import { strokeToPath } from "./freehand";

describe("strokeToPath", () => {
  it("returns empty string for no points", () => {
    expect(strokeToPath([])).toBe("");
  });
  it("returns an SVG path starting with M for a stroke", () => {
    const d = strokeToPath([[0, 0], [10, 10], [20, 5]]);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("Z");
  });
});
