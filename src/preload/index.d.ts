import type { FastClientApi } from '../shared/ipc';

declare global {
  interface Window {
    api: FastClientApi;
  }
}

export {};
