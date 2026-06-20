import { describe, it, expect } from "vitest";
import { doorsFrom } from "./content";

describe("doorsFrom", () => {
  it("returns forward + reverse-bidirectional neighbours, suppresses oneWay inbound", () => {
    const doors = [
      { from: "01", to: "02", oneWay: false }, // forward
      { from: "03", to: "01", oneWay: false }, // reverse bidirectional -> include 03
      { from: "01", to: "04", oneWay: true },  // forward oneWay -> include 04
      { from: "05", to: "01", oneWay: true },  // inbound oneWay -> suppressed
    ];
    expect(doorsFrom(doors, "01")).toEqual(["02", "03", "04"]);
  });

  it("dedupes a neighbour reachable via two doors and sorts ascending", () => {
    const doors = [
      { from: "01", to: "10", oneWay: false },
      { from: "10", to: "01", oneWay: false },
    ];
    expect(doorsFrom(doors, "01")).toEqual(["10"]);
  });
});
