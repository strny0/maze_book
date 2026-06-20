import { describe, it, expect } from "vitest";
import { serializeWorkspace, parseWorkspace, serializeContent, parseContent2 } from "./exportImport";

describe("export/import", () => {
  it("round-trips a workspace doc through JSON", () => {
    const doc = { rooms: { "01": { notes: "n", ink: [], annotations: [], pins: [] } },
      explored: ["01"], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "g", userEdges: [] };
    expect(parseWorkspace(serializeWorkspace(doc))).toEqual(doc);
  });
  it("throws on malformed json", () => {
    expect(() => parseWorkspace("{not json")).toThrow();
  });
  it("throws on shape-invalid workspace (valid json, missing rooms)", () => {
    expect(() => parseWorkspace('{"foo":1}')).toThrow();
  });

  it("round-trips a content doc through JSON", () => {
    const doc = {
      rooms: [{ id: "00", text: ["p"], image: "prologue.jpg" }],
      doors: [{ from: "00", to: "01", oneWay: false }],
      meta: { name: "The Maze (seed)", version: 1 },
    };
    expect(parseContent2(serializeContent(doc))).toEqual(doc);
  });
  it("parseContent2 throws on malformed json", () => {
    expect(() => parseContent2("{not json")).toThrow();
  });
  it("parseContent2 throws on shape-invalid content (missing doors)", () => {
    expect(() => parseContent2('{"rooms":[]}')).toThrow();
  });
});
