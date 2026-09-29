import { create } from 'zustand';
import { defaultSettings } from '@shared/defaults';
import type { AppSettings, RecentEntry, ToastKind, ToastMessage } from '@shared/types';
import type { MenuEntry } from '../components/common/Menu';

export interface Toast extends ToastMessage {
  id: number;
}

/** Renderer-only toasts may carry a callback instead of a serialisable command. */
export interface LocalToast extends ToastMessage {
  onAction?: () => void;
}

export interface ToastEntry extends LocalToast {
  id: number;
}

export type DialogTone = 'question' | 'danger';

export interface DialogButton<V extends string = string> {
  value: V;
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export interface DialogRequest<V extends string = string> {
  tone: DialogTone;
  title: string;
  text: string;
  detail?: string;
  buttons: DialogButton<V>[];
  /** Value returned by Esc. */
  cancelValue: V;
  /** Value triggered by Enter (never the destructive one). */
  primaryValue: V;
}

interface OpenDialog extends DialogRequest {
  resolve: (value: string) => void;
}

export type MenuName = 'file' | 'settings';

export const TOAST_DURATIONS: Record<ToastKind, number | null> = {
  success: 3000,
  info: 4000,
  warning: 6000,
  error: null,
};

const MAX_TOASTS = 4;

interface UiState {
  settings: AppSettings;
  recents: RecentEntry[];
  profilesDir: string;
  appVersion: string;
  /** Resolved theme currently applied to <html data-theme>. */
  effectiveTheme: 'dark' | 'light';

  toasts: ToastEntry[];
  dialog: OpenDialog | null;
  preferencesOpen: boolean;
  openMenu: MenuName | null;
  sidebarCollapsed: boolean;
  search: string;
  /** Incremented to ask the URL input to take focus. */
  urlFocusNonce: number;
  searchFocusNonce: number;
  /** Zoom badge under the title bar (doc 05): shown for 1 s after a zoom change. */
  zoomBadge: { value: number; nonce: number } | null;
  contextMenu: { x: number; y: number; entries: MenuEntry[] } | null;
  /** Per-request view state that is not persisted (active sub-tab, response view…). */
  views: Record<string, string>;

  setSettings(s: AppSettings): void;
  setRecents(r: RecentEntry[]): void;
  setMeta(m: { profilesDir: string; appVersion: string }): void;
  setEffectiveTheme(t: 'dark' | 'light'): void;

  pushToast(t: LocalToast): number;
  dismissToast(id: number): void;
  clearToasts(): void;
  ask<V extends string>(req: DialogRequest<V>): Promise<V>;
  closeDialog(value: string): void;
  setPreferencesOpen(open: boolean): void;
  setOpenMenu(m: MenuName | null): void;
  setSidebarCollapsed(c: boolean): void;
  toggleSidebar(): void;
  setSearch(q: string): void;
  requestUrlFocus(): void;
  requestSearchFocus(): void;
  showZoomBadge(value: number): void;
  showContextMenu(x: number, y: number, entries: MenuEntry[]): void;
  closeContextMenu(): void;
  setView(key: string, value: string): void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>()((set, get) => ({
  settings: defaultSettings(),
  recents: [],
  profilesDir: '',
  appVersion: '0.0.0',
  effectiveTheme: 'dark',

  toasts: [],
  dialog: null,
  preferencesOpen: false,
  openMenu: null,
  sidebarCollapsed: false,
  search: '',
  urlFocusNonce: 0,
  searchFocusNonce: 0,
  zoomBadge: null,
  contextMenu: null,
  views: {},

  setSettings: (settings) => set({ settings }),
  setRecents: (recents) => set({ recents }),
  setMeta: (m) => set(m),
  setEffectiveTheme: (effectiveTheme) => set({ effectiveTheme }),

  pushToast(t) {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-MAX_TOASTS) }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),

  ask<V extends string>(req: DialogRequest<V>): Promise<V> {
    const prev = get().dialog;
    if (prev) prev.resolve(prev.cancelValue);
    return new Promise<V>((resolve) => {
      set({ dialog: { ...req, resolve: (v: string) => resolve(v as V) }, openMenu: null });
    });
  },
  closeDialog(value) {
    const d = get().dialog;
    set({ dialog: null });
    d?.resolve(value);
  },

  setPreferencesOpen: (preferencesOpen) => set({ preferencesOpen, openMenu: null }),
  setOpenMenu: (openMenu) => set({ openMenu }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSearch: (search) => set({ search }),
  requestUrlFocus: () => set((s) => ({ urlFocusNonce: s.urlFocusNonce + 1 })),
  requestSearchFocus: () => set((s) => ({ searchFocusNonce: s.searchFocusNonce + 1, sidebarCollapsed: false })),
  showZoomBadge: (value) => set((s) => ({ zoomBadge: { value, nonce: (s.zoomBadge?.nonce ?? 0) + 1 } })),
  showContextMenu: (x, y, entries) => set({ contextMenu: { x, y, entries }, openMenu: null }),
  closeContextMenu: () => set({ contextMenu: null }),
  setView: (key, value) => set((s) => ({ views: { ...s.views, [key]: value } })),
}));

/** Read a view value with a default. */
export function useView<V extends string>(key: string, fallback: V): [V, (v: V) => void] {
  const value = useUiStore((s) => (s.views[key] as V | undefined) ?? fallback);
  const setView = useUiStore((s) => s.setView);
  return [value, (v: V) => setView(key, v)];
}
