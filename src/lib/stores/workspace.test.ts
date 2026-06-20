import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import { initWorkspace, explored, markExplored, updateRoomWork, getRoomWork, userEdges, addUserEdge } from "./workspace";

describe("workspace store", () => {
  beforeEach(() => initWorkspace());
  it("marks a room explored", () => {
    markExplored("05");
    expect(get(explored).has("05")).toBe(true);
  });
  it("patches room work immutably", () => {
    updateRoomWork("05", { notes: "hello" });
    expect(getRoomWork("05").notes).toBe("hello");
  });
  it("initialises userEdges to empty array by default", () => {
    initWorkspace();
    expect(get(userEdges)).toEqual([]);
  });
  it("initialises userEdges from doc", () => {
    initWorkspace({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [{ from: "01", to: "17", oneWay: true }] });
    expect(get(userEdges)).toEqual([{ from: "01", to: "17", oneWay: true }]);
  });
  it("addUserEdge appends an edge", () => {
    initWorkspace();
    addUserEdge({ from: "01", to: "17", oneWay: false });
    expect(get(userEdges)).toEqual([{ from: "01", to: "17", oneWay: false }]);
  });
});
