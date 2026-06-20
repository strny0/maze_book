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
  it("defaults userEdges to [] when field is absent (legacy doc)", () => {
    const legacy = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "" });
    const parsed = parseWorkspace(legacy);
    expect(parsed.userEdges).toEqual([]);
  });

  it("migrates old { from, to, oneWay: true } userEdges", () => {
    const old = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ from: "01", to: "17", oneWay: true }] });
    expect(parseWorkspace(old).userEdges[0]).toEqual({ a: "01", b: "17", aToB: true, bToA: false });
  });

  it("migrates old { from, to, oneWay: false } userEdges", () => {
    const old = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ from: "01", to: "17", oneWay: false }] });
    expect(parseWorkspace(old).userEdges[0]).toEqual({ a: "01", b: "17", aToB: true, bToA: true });
  });

  it("migrates old { a, b, direction: 'both' } userEdges", () => {
    const old = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ a: "01", b: "17", direction: "both" }] });
    expect(parseWorkspace(old).userEdges[0]).toEqual({ a: "01", b: "17", aToB: true, bToA: true });
  });

  it("passes new { a, b, aToB, bToA } userEdges through unchanged", () => {
    const edge = { a: "01", b: "17", aToB: true, bToA: false };
    const doc = JSON.stringify({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [edge] });
    expect(parseWorkspace(doc).userEdges[0]).toEqual(edge);
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
