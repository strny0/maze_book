import type { WorkspaceDoc, ContentDoc } from "./idb";

export function serializeWorkspace(doc: WorkspaceDoc): string { return JSON.stringify(doc, null, 2); }
export function parseWorkspace(text: string): WorkspaceDoc {
  const d = JSON.parse(text);
  if (!d || typeof d !== "object" || !("rooms" in d)) throw new Error("Invalid workspace file");
  const rawEdges: any[] = d.userEdges ?? [];
  const userEdges = rawEdges.map((e) => {
    if ("from" in e) {
      // migrate { from, to, oneWay } → new shape
      return { a: e.from, b: e.to, aToB: true, bToA: !e.oneWay };
    }
    if ("direction" in e) {
      // migrate { a, b, direction } → new shape
      return {
        a: e.a, b: e.b,
        aToB: e.direction === "aToB" || e.direction === "both",
        bToA: e.direction === "bToA" || e.direction === "both",
      };
    }
    return e; // already new shape
  });
  return { ...d, userEdges } as WorkspaceDoc;
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
