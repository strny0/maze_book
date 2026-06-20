import { parseMaze } from "../seed/parseMaze";
import { parseContent } from "../seed/parseContent";
import { getContent, setContent, type ContentDoc } from "./idb";

export async function bootstrapContent(
  fetchText: (url: string) => Promise<string>,
  fetchJson: (url: string) => Promise<unknown>
): Promise<ContentDoc> {
  const existing = await getContent();
  if (existing) return existing;
  const [mazeSrc, contentJson] = await Promise.all([
    fetchText("assets/maze.txt"),
    fetchJson("assets/content.json"),
  ]);
  const doc: ContentDoc = {
    rooms: parseContent(contentJson),
    doors: parseMaze(mazeSrc),
    meta: { name: "The Maze (seed)", version: 1 },
  };
  await setContent(doc);
  return doc;
}
