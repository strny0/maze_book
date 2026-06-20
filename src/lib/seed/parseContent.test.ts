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
  it("resolves prologue image to assets/images/<file>", () => {
    const rooms = parseContent(sample);
    expect(rooms.find((r) => r.id === "00")?.image).toBe("assets/images/prologue.jpg");
  });
  it("resolves room image to assets/images/room/<file>", () => {
    const rooms = parseContent(sample);
    expect(rooms.find((r) => r.id === "01")?.image).toBe("assets/images/room/01.jpg");
  });
  it("leaves image unchanged when it already contains a slash", () => {
    const withUrl = {
      prologue: { text: ["p"], image: "prologue.jpg", title: "PROLOGUE" },
      rooms: {
        "03": { text: ["x"], image: "https://x/y.png" },
      },
    };
    const rooms = parseContent(withUrl);
    expect(rooms.find((r) => r.id === "03")?.image).toBe("https://x/y.png");
  });
});
