import { create } from 'zustand';
import type { HttpErrorCode, HttpResult, Id } from '@shared/types';

export type OkResult = Extract<HttpResult, { ok: true }>;

export type ResponseState =
  | { status: 'loading'; startedAt: number; seq: number }
  | { status: 'done'; result: OkResult; warnings: string[]; seq: number }
  | { status: 'error'; code: HttpErrorCode; message: string; detail?: string; totalMs: number; seq: number };

/** Responses live only in memory, per request (R7). Never part of the profile. */
interface ResponseStore {
  responses: Record<Id, ResponseState>;
  set(id: Id, state: ResponseState): void;
  clear(): void;
}

export const useResponseStore = create<ResponseStore>()((set) => ({
  responses: {},
  set: (id, state) => set((s) => ({ responses: { ...s.responses, [id]: state } })),
  clear: () => set({ responses: {} }),
}));
