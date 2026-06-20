import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { get } from "svelte/store";

let storeMock: { [key: string]: string } = {};

beforeEach(() => {
  storeMock = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storeMock[key] ?? null,
    setItem: (key: string, value: string) => { storeMock[key] = value; },
    clear: () => { storeMock = {}; },
    removeItem: (key: string) => { delete storeMock[key]; },
    key: (index: number) => Object.keys(storeMock)[index] ?? null,
    length: 0,
  });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme store", () => {
  it("defaults to manuscript", async () => {
    const { theme } = await import("./theme");
    expect(get(theme)).toBe("manuscript");
  });

  it("setTheme updates store and localStorage", async () => {
    const { theme, setTheme } = await import("./theme");
    setTheme("engraved");
    expect(get(theme)).toBe("engraved");
    expect((globalThis as any).localStorage.getItem("maze-theme")).toBe("engraved");
  });
});
