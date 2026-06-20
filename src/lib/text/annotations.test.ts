import { describe, it, expect } from "vitest";
import { applyAnnotations } from "./annotations";

describe("applyAnnotations", () => {
  it("returns the whole paragraph as one plain segment when no annotations", () => {
    expect(applyAnnotations("hello world", [])).toEqual([{ text: "hello world" }]);
  });
  it("splits a paragraph around one annotation", () => {
    const segs = applyAnnotations("hello world", [
      { paraIndex: 0, start: 0, end: 5, bold: true },
    ]);
    expect(segs[0]).toEqual({ text: "hello", ann: { paraIndex: 0, start: 0, end: 5, bold: true } });
    expect(segs[1]).toEqual({ text: " world" });
  });
  it("orders multiple annotations by start offset", () => {
    const segs = applyAnnotations("abcdef", [
      { paraIndex: 0, start: 4, end: 6, italic: true },
      { paraIndex: 0, start: 0, end: 2, bold: true },
    ]);
    expect(segs.map((s) => s.text)).toEqual(["ab", "cd", "ef"]);
  });
  it("clips a later annotation that overlaps an earlier one", () => {
    const ann1 = { paraIndex: 0, start: 0, end: 3, bold: true };
    const ann2 = { paraIndex: 0, start: 2, end: 5, italic: true };
    const segs = applyAnnotations("abcdef", [ann1, ann2]);
    expect(segs).toEqual([
      { text: "abc", ann: ann1 },
      { text: "de", ann: ann2 },
      { text: "f" },
    ]);
  });
});
