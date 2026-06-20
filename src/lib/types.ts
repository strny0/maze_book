export interface Room { id: string; title?: string; text: string[]; image: string }
export interface Door { from: string; to: string; oneWay: boolean }
export interface UserEdge {
  a: string;
  b: string;
  aToB: boolean;  // can travel a→b
  bToA: boolean;  // can travel b→a
}
