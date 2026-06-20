import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { getContent, setContent, getWorkspace, setWorkspace } from "./idb";

describe("idb", () => {
  it("round-trips a content doc", async () => {
    await setContent({ rooms: [{ id: "00", text: ["a"], image: "p.jpg" }], doors: [], meta: { name: "seed", version: 1 } });
    const got = await getContent();
    expect(got?.rooms[0].id).toBe("00");
  });
  it("returns undefined for empty workspace", async () => {
    expect(await getWorkspace()).toBeUndefined();
  });
  it("round-trips a workspace doc", async () => {
    await setWorkspace({ rooms: {}, explored: ["01"], tags: { defs: [], byRoom: {} }, positions: {}, globalNotes: "hi" });
    expect((await getWorkspace())?.explored).toEqual(["01"]);
  });
});
