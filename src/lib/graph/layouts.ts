import type { Core, LayoutOptions } from "cytoscape";

export const LAYOUT_NAMES = ["fcose", "cola", "dagre", "concentric", "circle"] as const;
export type LayoutName = (typeof LAYOUT_NAMES)[number];

export function layoutOptions(name: LayoutName): LayoutOptions {
  switch (name) {
    case "fcose": return { name: "fcose", animate: true, randomize: true } as unknown as LayoutOptions;
    case "cola": return { name: "cola", animate: true } as unknown as LayoutOptions;
    case "dagre": return { name: "dagre", rankDir: "TB" } as unknown as LayoutOptions;
    case "concentric": return { name: "concentric" } as LayoutOptions;
    case "circle": return { name: "circle" } as LayoutOptions;
  }
}

export function runLayout(cy: Core, name: LayoutName) {
  cy.layout(layoutOptions(name)).run();
}
