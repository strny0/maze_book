import { describe, it, expect } from "vitest";
import { parseContent } from "./parseContent";

const sample = {
  prologue: { text: ["p one"], image: "prologue.jpg", title: "PROLOGUE" },
  rooms: {
    "01": { text: ["r one", "r two"], image: "01.jpg" },
    "02": { text: ["x"], image: "02.jpg", title: "TWO" },
  },
};

describe("parseContent", () => {
  it("maps prologue to id 00", () => {
    const rooms = parseContent(sample);
    expect(rooms.find((r) => r.id === "00")?.title).toBe("PROLOGUE");
  });
  it("maps room keys to ids and preserves text arrays", () => {
    const rooms = parseContent(sample);
    expect(rooms.find((r) => r.id === "01")?.text).toEqual(["r one", "r two"]);
  });
  it("sorts rooms by id ascending", () => {
    const ids = parseContent(sample).map((r) => r.id);
    expect(ids).toEqual(["00", "01", "02"]);
  });
});
