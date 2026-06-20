export interface Room { id: string; title?: string; text: string[]; image: string }
export interface Door { from: string; to: string; oneWay: boolean }
export interface UserEdge { from: string; to: string; oneWay: boolean }
