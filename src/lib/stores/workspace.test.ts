import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import { initWorkspace, explored, markExplored, updateRoomWork, getRoomWork } from "./workspace";

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
});
