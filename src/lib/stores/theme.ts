import { writable } from "svelte/store";

export type ThemeVariant = "manuscript" | "engraved" | "foxed";

const STORAGE_KEY = "maze-theme";
const saved = (localStorage.getItem(STORAGE_KEY) as ThemeVariant) ?? "manuscript";

export const theme = writable<ThemeVariant>(saved);

export function setTheme(v: ThemeVariant) {
  theme.set(v);
  localStorage.setItem(STORAGE_KEY, v);
}
