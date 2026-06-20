import { getStroke } from "perfect-freehand";

export function strokeToPath(points: number[][], opts: { size?: number } = {}): string {
  if (points.length === 0) return "";
  const outline = getStroke(points, { size: opts.size ?? 6, thinning: 0.6, smoothing: 0.5 });
  if (outline.length === 0) return "";
  const d = outline.reduce(
    (acc, [x, y], i) => acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `),
    ""
  );
  return d + "Z";
}
