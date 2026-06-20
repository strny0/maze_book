import { describe, it, expect, vi } from "vitest";
import "fake-indexeddb/auto";
import { bootstrapContent } from "./bootstrap";

const json = { prologue: { text: ["p"], image: "prologue.jpg", title: "PROLOGUE" },
  rooms: { "01": { text: ["a"], image: "01.jpg" } } };

describe("bootstrapContent", () => {
  it("seeds content store when empty", async () => {
    const doc = await bootstrapContent(async () => "01 -> 00\n00 -> 01", async () => json);
    expect(doc.rooms.map((r) => r.id)).toContain("01");
    expect(doc.doors).toEqual([{ from: "00", to: "01", oneWay: false }]);
  });

  it("returns existing doc without re-seeding when store is populated", async () => {
    const first = await bootstrapContent(async () => "01 -> 00\n00 -> 01", async () => json);
    const stub = vi.fn().mockResolvedValue("different data");
    const second = await bootstrapContent(stub, stub);
    expect(second).toEqual(first);
    expect(stub).not.toHaveBeenCalled();
  });
});
