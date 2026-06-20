import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import {
  initWorkspace, explored, updateRoomWork, getRoomWork,
  userEdges, addUserEdge, positions,
} from "./workspace";
import type { UserEdge } from "../types";

describe("workspace store", () => {
  beforeEach(() => initWorkspace());

  it("patches room work immutably", () => {
    updateRoomWork("05", { notes: "hello" });
    expect(getRoomWork("05").notes).toBe("hello");
  });

  it("initialises userEdges to empty array by default", () => {
    expect(get(userEdges)).toEqual([]);
  });

  it("initialises userEdges from doc", () => {
    const edge: UserEdge = { a: "01", b: "17", aToB: true, bToA: false };
    initWorkspace({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [edge] });
    expect(get(userEdges)).toEqual([edge]);
  });

  it("addUserEdge appends an edge", () => {
    const edge: UserEdge = { a: "01", b: "17", aToB: true, bToA: false };
    addUserEdge(edge);
    expect(get(userEdges)).toEqual([edge]);
  });

  it("always places room 01 on canvas", () => {
    initWorkspace({ rooms: {}, explored: [], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "", userEdges: [] });
    expect(get(positions)["01"]).toBeDefined();
  });
});

describe("explored (derived BFS)", () => {
  beforeEach(() => initWorkspace());

  it("always includes room 01", () => {
    expect(get(explored).has("01")).toBe(true);
  });

  it("includes rooms reachable via aToB edges", () => {
    addUserEdge({ a: "01", b: "20", aToB: true, bToA: false });
    expect(get(explored).has("20")).toBe(true);
  });

  it("includes rooms reachable via bToA edges in reverse", () => {
    addUserEdge({ a: "20", b: "01", aToB: false, bToA: true });
    expect(get(explored).has("20")).toBe(true);
  });

  it("does not follow aToB=false forward", () => {
    addUserEdge({ a: "01", b: "20", aToB: false, bToA: true });
    expect(get(explored).has("20")).toBe(false);
  });

  it("does not include rooms unreachable from 01", () => {
    addUserEdge({ a: "20", b: "30", aToB: true, bToA: false });
    expect(get(explored).has("30")).toBe(false);
  });

  it("traverses multi-hop paths", () => {
    addUserEdge({ a: "01", b: "20", aToB: true, bToA: false });
    addUserEdge({ a: "20", b: "37", aToB: true, bToA: false });
    expect(get(explored).has("37")).toBe(true);
  });
});
