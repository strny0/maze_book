import { describe, it, expect } from "vitest";
import { serializeWorkspace, parseWorkspace } from "./exportImport";

describe("export/import", () => {
  it("round-trips a workspace doc through JSON", () => {
    const doc = { rooms: { "01": { notes: "n", ink: [], annotations: [], pins: [] } },
      explored: ["01"], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "g" };
    expect(parseWorkspace(serializeWorkspace(doc))).toEqual(doc);
  });
  it("throws on malformed json", () => {
    expect(() => parseWorkspace("{not json")).toThrow();
  });
});
