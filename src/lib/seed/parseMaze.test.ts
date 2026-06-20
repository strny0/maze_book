import { describe, it, expect } from "vitest";
import { parseMaze } from "./parseMaze";

describe("parseMaze", () => {
  it("ignores comment lines starting with #", () => {
    const doors = parseMaze("01 -> 20\n# 22 -> ?? secret\n20 -> 01");
    expect(doors.some((d) => d.to.includes("?"))).toBe(false);
  });
  it("marks a bidirectional pair as not one-way, emitted once", () => {
    const doors = parseMaze("01 -> 20\n20 -> 01");
    expect(doors).toEqual([{ from: "01", to: "20", oneWay: false }]);
  });
  it("marks a single-direction pair as one-way", () => {
    const doors = parseMaze("06 -> 40");
    expect(doors).toEqual([{ from: "06", to: "40", oneWay: true }]);
  });
  it("trims whitespace and ignores blank lines", () => {
    const doors = parseMaze("  01 -> 20  \n\n20 -> 01\n");
    expect(doors).toHaveLength(1);
  });
});
