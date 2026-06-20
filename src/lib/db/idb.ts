import { openDB, type IDBPDatabase } from "idb";
import type { Room, Door } from "../types";

export interface RoomWork {
  notes: string;
  ink: { tool: "pen" | "highlighter"; color: string; points: number[][] }[];
  annotations: TextAnnotation[];
  pins: Pin[];
}
export interface TextAnnotation {
  paraIndex: number; start: number; end: number;
  textColor?: string; highlight?: string; bold?: boolean; italic?: boolean; comment?: string;
}
export interface Pin { x: number; y: number; label: string; target?: string; note?: string }
export interface TagState { defs: { name: string; color: string }[]; byRoom: Record<string, string[]> }

export interface ContentDoc { rooms: Room[]; doors: Door[]; meta: { name: string; version: number } }
export interface WorkspaceDoc {
  rooms: Record<string, RoomWork>;
  explored: string[];
  tags: TagState;
  positions: Record<string, { x: number; y: number }>;
  globalNotes: string;
}

const DB_NAME = "maze-companion";
const STORE = "docs";
let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbp) dbp = openDB(DB_NAME, 1, { upgrade(d) { d.createObjectStore(STORE); } });
  return dbp;
}

export async function getContent() { return (await db()).get(STORE, "content") as Promise<ContentDoc | undefined>; }
export async function setContent(doc: ContentDoc) { await (await db()).put(STORE, doc, "content"); }
export async function getWorkspace() { return (await db()).get(STORE, "workspace") as Promise<WorkspaceDoc | undefined>; }
export async function setWorkspace(doc: WorkspaceDoc) { await (await db()).put(STORE, doc, "workspace"); }
