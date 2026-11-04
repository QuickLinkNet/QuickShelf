import { get, post } from './client';

export type MoveRecord = { id: number; from: string; to: string; at: number; undone: boolean };
export type MoveResult = { path: string; move_id: number };

/** Write operations. They only work when the API runs with READ_ONLY=0; every move can be undone. */
export const organize = {
  move: (from: string, to: string) => post<MoveResult>('/move', { from, to }),
  rename: (path: string, name: string) => post<MoveResult>('/rename', { path, name }),
  mkdir: (path: string) => post<{ path: string }>('/mkdir', { path }),
  undo: (id: number) => post<{ path: string }>('/moves/undo', { id }),
  history: (limit = 30) => get<{ items: MoveRecord[] }>('/moves', { limit }),
};
