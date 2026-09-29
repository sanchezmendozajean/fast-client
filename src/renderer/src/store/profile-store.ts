import { create } from 'zustand';
import {
  cloneCollection,
  cloneRequest,
  newCollection,
  newRequest,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
} from '@shared/defaults';
import type {
  Collection,
  Id,
  KeyValue,
  Profile,
  ProfileSession,
  RequestDef,
  SaveReason,
  SplitOrientation,
} from '@shared/types';
import { t } from '../i18n/es';
import { useUiStore } from './ui-store';

export type Selection = { kind: 'collection' | 'request'; id: Id };

export interface RequestLocation {
  collection: Collection;
  request: RequestDef;
  index: number;
}

export function findRequest(profile: Profile | null, id: Id | null): RequestLocation | null {
  if (!profile || !id) return null;
  for (const collection of profile.collections) {
    const index = collection.requests.findIndex((r) => r.id === id);
    if (index >= 0) return { collection, request: collection.requests[index]!, index };
  }
  return null;
}

const now = (): string => new Date().toISOString();

function mapCollection(p: Profile, id: Id, fn: (c: Collection) => Collection): Profile {
  return { ...p, collections: p.collections.map((c) => (c.id === id ? fn(c) : c)) };
}

function mapRequest(p: Profile, id: Id, fn: (r: RequestDef) => RequestDef): Profile {
  return {
    ...p,
    collections: p.collections.map((c) =>
      c.requests.some((r) => r.id === id) ? { ...c, requests: c.requests.map((r) => (r.id === id ? fn(r) : r)) } : c,
    ),
  };
}

function withoutTabs(p: Profile, ids: readonly Id[]): Profile {
  const drop = new Set(ids);
  const openTabs = p.workspace.openTabs.filter((t) => !drop.has(t));
  let active = p.workspace.activeTabId;
  if (active !== null && drop.has(active)) {
    const oldIdx = p.workspace.openTabs.indexOf(active);
    const right = p.workspace.openTabs.slice(oldIdx + 1).find((t) => !drop.has(t));
    const left = p.workspace.openTabs.slice(0, oldIdx).reverse().find((t) => !drop.has(t));
    active = right ?? left ?? null;
  }
  return { ...p, workspace: { ...p.workspace, openTabs, activeTabId: active } };
}

function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}

interface ProfileState {
  profile: Profile | null;
  profilePath: string | null;
  /** Bumped on every change; `savedVersion` is the version last written to disk. */
  version: number;
  savedVersion: number;
  /** Request id → version of its last unsaved edit (tab dot). */
  dirtyRequests: Record<Id, number>;
  selection: Selection | null;
  renaming: Id | null;
  /** Where the inline rename is shown: a request can be both in the tree and in a tab. */
  renamingIn: 'tree' | 'tab';

  loadSession(session: ProfileSession | null): void;
  save(reason: SaveReason): Promise<boolean>;

  select(sel: Selection | null): void;
  startRename(id: Id, where?: 'tree' | 'tab'): void;
  stopRename(): void;

  createCollection(): Promise<void>;
  renameCollection(id: Id, name: string): Promise<void>;
  deleteCollection(id: Id): Promise<void>;
  duplicateCollection(id: Id): Promise<void>;
  toggleCollection(id: Id, expanded?: boolean): void;
  setCollectionVariables(id: Id, vars: KeyValue[]): void;
  moveCollection(id: Id, toIndex: number): void;

  createRequest(collectionId?: Id): Promise<void>;
  updateRequest(id: Id, fn: (r: RequestDef) => RequestDef): void;
  renameRequest(id: Id, name: string): Promise<void>;
  deleteRequest(id: Id): Promise<void>;
  duplicateRequest(id: Id): Promise<void>;
  moveRequest(id: Id, toCollectionId: Id, toIndex: number): void;

  openTab(id: Id): void;
  closeTabs(ids: readonly Id[]): void;
  setActiveTab(id: Id): void;
  moveTab(id: Id, toIndex: number): void;
  revealInTree(id: Id): void;

  setSidebarWidth(w: number): void;
  setSplitRatio(r: number): void;
  setSplitOrientation(o: SplitOrientation): void;
}

export const useProfileStore = create<ProfileState>()((set, get) => {
  /** Apply a change; optionally mark a request as having unsaved edits. */
  const mutate = (fn: (p: Profile) => Profile, dirtyRequest?: Id): void =>
    set((s) => {
      if (!s.profile) return {};
      const version = s.version + 1;
      return {
        profile: fn(s.profile),
        version,
        dirtyRequests: dirtyRequest ? { ...s.dirtyRequests, [dirtyRequest]: version } : s.dirtyRequests,
      };
    });

  const openAndSelect = (p: Profile, id: Id): Profile => ({
    ...p,
    workspace: {
      ...p.workspace,
      openTabs: p.workspace.openTabs.includes(id) ? p.workspace.openTabs : [...p.workspace.openTabs, id],
      activeTabId: id,
    },
  });

  return {
    profile: null,
    profilePath: null,
    version: 0,
    savedVersion: 0,
    dirtyRequests: {},
    selection: null,
    renaming: null,
    renamingIn: 'tree',

    loadSession(session) {
      const active = session?.profile.workspace.activeTabId ?? null;
      set({
        profile: session?.profile ?? null,
        profilePath: session?.profilePath ?? null,
        version: 0,
        savedVersion: 0,
        dirtyRequests: {},
        renaming: null,
        selection: active ? { kind: 'request', id: active } : null,
      });
    },

    async save(reason) {
      const { profile, version } = get();
      if (!profile) return false;
      const r = await window.api.invoke('profile:save', { profile, reason });
      if (r.ok) {
        set((s) => {
          const dirty: Record<Id, number> = {};
          for (const [id, v] of Object.entries(s.dirtyRequests)) if (v > version) dirty[id] = v;
          return { savedVersion: Math.max(s.savedVersion, version), dirtyRequests: dirty };
        });
        return true;
      }
      useUiStore.getState().pushToast({
        kind: 'error',
        text: t.toasts.saveFailed(r.message),
        action: { label: t.actions.retry, command: 'retry-save' },
        secondaryAction: { label: t.actions.relocate, command: 'relocate' },
      });
      return false;
    },

    select: (selection) => set({ selection }),
    startRename: (id, where = 'tree') => set({ renaming: id, renamingIn: where }),
    stopRename: () => set({ renaming: null }),

    async createCollection() {
      const col = newCollection(t.defaults.newCollection);
      mutate((p) => ({ ...p, collections: [...p.collections, col] }));
      set({ selection: { kind: 'collection', id: col.id } });
      // The save is issued first (doc 04 §2 #1); rename mode starts right away so focus
      // moves to the name input instead of staying on the button while the disk write runs.
      const saving = get().save('collection-created');
      set({ renaming: col.id, renamingIn: 'tree' });
      await saving;
    },

    async renameCollection(id, name) {
      set({ renaming: null });
      const col = get().profile?.collections.find((c) => c.id === id);
      const trimmed = name.trim();
      if (!col || !trimmed || trimmed === col.name) return;
      mutate((p) => mapCollection(p, id, (c) => ({ ...c, name: trimmed, updatedAt: now() })));
      await get().save('renamed');
    },

    async deleteCollection(id) {
      const col = get().profile?.collections.find((c) => c.id === id);
      if (!col) return;
      const ids = col.requests.map((r) => r.id);
      mutate((p) => withoutTabs({ ...p, collections: p.collections.filter((c) => c.id !== id) }, ids));
      set((s) => ({ selection: s.selection?.id === id || ids.includes(s.selection?.id ?? '') ? null : s.selection }));
      await get().save('deleted');
    },

    async duplicateCollection(id) {
      const p = get().profile;
      const idx = p?.collections.findIndex((c) => c.id === id) ?? -1;
      const src = p?.collections[idx];
      if (!p || !src) return;
      const copy = cloneCollection(src, t.defaults.copyOf(src.name));
      mutate((pr) => {
        const cols = [...pr.collections];
        cols.splice(idx + 1, 0, copy);
        return { ...pr, collections: cols };
      });
      set({ selection: { kind: 'collection', id: copy.id } });
      await get().save('collection-created');
    },

    toggleCollection(id, expanded) {
      mutate((p) => mapCollection(p, id, (c) => ({ ...c, expanded: expanded ?? !c.expanded })));
    },

    setCollectionVariables(id, vars) {
      mutate((p) => mapCollection(p, id, (c) => ({ ...c, variables: vars, updatedAt: now() })));
    },

    moveCollection(id, toIndex) {
      mutate((p) => {
        const from = p.collections.findIndex((c) => c.id === id);
        if (from < 0 || from === toIndex) return p;
        return { ...p, collections: arrayMove(p.collections, from, toIndex) };
      });
    },

    async createRequest(collectionId) {
      const s = get();
      const p = s.profile;
      if (!p) return;
      let target = collectionId ?? findRequest(p, p.workspace.activeTabId)?.collection.id;
      if (!target && s.selection) {
        target =
          s.selection.kind === 'collection' ? s.selection.id : findRequest(p, s.selection.id)?.collection.id;
      }
      if (!target) target = p.collections[0]?.id;
      let extra: Collection | null = null;
      if (!target) {
        extra = newCollection(t.defaults.myCollection);
        target = extra.id;
      }
      const req = newRequest(t.defaults.newRequest, useUiStore.getState().settings.http.followRedirectsDefault);
      const colId = target;
      mutate((pr) => {
        const base = extra ? { ...pr, collections: [...pr.collections, extra] } : pr;
        const withReq = mapCollection(base, colId, (c) => ({
          ...c,
          expanded: true,
          requests: [...c.requests, req],
          updatedAt: now(),
        }));
        return openAndSelect(withReq, req.id);
      });
      set({ selection: { kind: 'request', id: req.id } });
      useUiStore.getState().requestUrlFocus();
      await get().save('request-created');
    },

    updateRequest(id, fn) {
      mutate((p) => mapRequest(p, id, (r) => ({ ...fn(r), updatedAt: now() })), id);
    },

    async renameRequest(id, name) {
      set({ renaming: null });
      const loc = findRequest(get().profile, id);
      const trimmed = name.trim();
      if (!loc || !trimmed || trimmed === loc.request.name) return;
      mutate((p) => mapRequest(p, id, (r) => ({ ...r, name: trimmed, updatedAt: now() })));
      await get().save('renamed');
    },

    async deleteRequest(id) {
      const loc = findRequest(get().profile, id);
      if (!loc) return;
      mutate((p) =>
        withoutTabs(
          mapCollection(p, loc.collection.id, (c) => ({
            ...c,
            requests: c.requests.filter((r) => r.id !== id),
            updatedAt: now(),
          })),
          [id],
        ),
      );
      set((s) => ({ selection: s.selection?.id === id ? null : s.selection }));
      await get().save('deleted');
    },

    async duplicateRequest(id) {
      const loc = findRequest(get().profile, id);
      if (!loc) return;
      const copy = cloneRequest(loc.request, t.defaults.copyOf(loc.request.name));
      mutate((p) =>
        openAndSelect(
          mapCollection(p, loc.collection.id, (c) => {
            const reqs = [...c.requests];
            reqs.splice(loc.index + 1, 0, copy);
            return { ...c, requests: reqs, updatedAt: now() };
          }),
          copy.id,
        ),
      );
      set({ selection: { kind: 'request', id: copy.id } });
      await get().save('request-created');
    },

    moveRequest(id, toCollectionId, toIndex) {
      const loc = findRequest(get().profile, id);
      if (!loc) return;
      if (loc.collection.id === toCollectionId && loc.index === toIndex) return;
      mutate((p) => {
        const removed = mapCollection(p, loc.collection.id, (c) => ({
          ...c,
          requests: c.requests.filter((r) => r.id !== id),
        }));
        return mapCollection(removed, toCollectionId, (c) => {
          const reqs = [...c.requests];
          reqs.splice(Math.min(toIndex, reqs.length), 0, loc.request);
          return { ...c, requests: reqs, expanded: true, updatedAt: now() };
        });
      });
    },

    openTab(id) {
      if (!findRequest(get().profile, id)) return;
      mutate((p) => openAndSelect(p, id));
      set({ selection: { kind: 'request', id } });
    },

    closeTabs(ids) {
      if (!ids.length) return;
      mutate((p) => withoutTabs(p, ids));
    },

    setActiveTab(id) {
      if (get().profile?.workspace.activeTabId === id) return;
      mutate((p) => ({ ...p, workspace: { ...p.workspace, activeTabId: id } }));
      set({ selection: { kind: 'request', id } });
    },

    moveTab(id, toIndex) {
      mutate((p) => {
        const from = p.workspace.openTabs.indexOf(id);
        if (from < 0 || from === toIndex) return p;
        return { ...p, workspace: { ...p.workspace, openTabs: arrayMove(p.workspace.openTabs, from, toIndex) } };
      });
    },

    revealInTree(id) {
      const loc = findRequest(get().profile, id);
      if (!loc) return;
      if (!loc.collection.expanded) get().toggleCollection(loc.collection.id, true);
      set({ selection: { kind: 'request', id } });
      useUiStore.getState().setSidebarCollapsed(false);
    },

    setSidebarWidth(w) {
      const width = Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w)));
      mutate((p) => ({ ...p, workspace: { ...p.workspace, sidebarWidth: width } }));
    },

    setSplitRatio(r) {
      const ratio = Math.min(0.85, Math.max(0.15, r));
      mutate((p) => ({ ...p, workspace: { ...p.workspace, splitRatio: ratio } }));
    },

    setSplitOrientation(o) {
      mutate((p) => ({ ...p, workspace: { ...p.workspace, splitOrientation: o } }));
    },
  };
});

/** Stable empty arrays: selectors must not return a new reference on every call. */
export const EMPTY_IDS: readonly Id[] = Object.freeze([]);
export const EMPTY_COLLECTIONS: readonly Collection[] = Object.freeze([]);

export const selectIsDirty = (s: ProfileState): boolean => s.version !== s.savedVersion;

/** Save moment #9 (doc 04 §2): a splitter was released after changing the layout. */
export function saveIfResized(before: number | undefined, after: number | undefined): void {
  if (before !== after) void useProfileStore.getState().save('resized');
}

/** Double-click on a splitter: back to the default size, saved like a drag. */
export function resetSize(get: () => number | undefined, reset: () => void): void {
  const before = get();
  reset();
  saveIfResized(before, get());
}
