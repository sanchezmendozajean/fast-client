import type { FastClientApi } from '../../src/shared/ipc';

// Code passed to page.evaluate() runs in the renderer, where the preload exposes window.api.
declare global {
  var window: { api: FastClientApi; document: { documentElement: { dataset: Record<string, string | undefined> } } };
}

export {};
