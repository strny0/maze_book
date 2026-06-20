import type { WorkspaceDoc, ContentDoc } from "./idb";

export function serializeWorkspace(doc: WorkspaceDoc): string { return JSON.stringify(doc, null, 2); }
export function parseWorkspace(text: string): WorkspaceDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d)) throw new Error("Invalid workspace file");
  return d as WorkspaceDoc;
}
export function serializeContent(doc: ContentDoc): string { return JSON.stringify(doc, null, 2); }
export function parseContent2(text: string): ContentDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d) || !("doors" in d)) throw new Error("Invalid content file");
  return d as ContentDoc;
}
export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
