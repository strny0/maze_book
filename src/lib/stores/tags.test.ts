import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { get } from "svelte/store";
import { initWorkspace, tags, toggleTag } from "./workspace";

describe("tags", () => {
  beforeEach(() => initWorkspace());
  it("adds then removes a tag on a room", () => {
    toggleTag("05", "clue");
    expect(get(tags).byRoom["05"]).toContain("clue");
    toggleTag("05", "clue");
    expect(get(tags).byRoom["05"] ?? []).not.toContain("clue");
  });
});
