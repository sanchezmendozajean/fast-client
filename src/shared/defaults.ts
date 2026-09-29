import type {
  AppSettings,
  Collection,
  HttpMethod,
  KeyValue,
  Profile,
  RequestDef,
  WorkspaceState,
} from './types';

export const PROFILE_EXTENSION = '.fcprofile';
export const DEFAULT_PROFILE_FILE = 'perfil.fcprofile';
export const SETTINGS_FILE = 'fastclient.settings.json';
export const MAX_RECENTS = 8;

export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_DEFAULT = 280;

export function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function newKeyValue(key = '', value = ''): KeyValue {
  return { id: newId(), key, value, enabled: true };
}

export function defaultWorkspace(): WorkspaceState {
  return {
    openTabs: [],
    activeTabId: null,
    sidebarWidth: SIDEBAR_DEFAULT,
    splitRatio: 0.5,
    splitOrientation: 'vertical',
  };
}

export function newProfile(name = 'perfil'): Profile {
  const ts = now();
  return {
    formatVersion: 1,
    app: 'fast-client',
    name,
    createdAt: ts,
    updatedAt: ts,
    collections: [],
    workspace: defaultWorkspace(),
  };
}

export function newCollection(name: string): Collection {
  const ts = now();
  return { id: newId(), name, expanded: true, variables: [], requests: [], createdAt: ts, updatedAt: ts };
}

export function newRequest(name: string, followRedirects = true, method: HttpMethod = 'GET'): RequestDef {
  const ts = now();
  return {
    id: newId(),
    name,
    method,
    url: '',
    params: [],
    headers: [],
    body: { mode: 'none', raw: '', formUrlEncoded: [], multipart: [] },
    auth: { type: 'none' },
    settings: { timeoutMs: null, followRedirects },
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Deep copy with fresh ids (duplicate action). */
export function cloneRequest(req: RequestDef, name: string): RequestDef {
  const ts = now();
  const reId = <T extends { id: string }>(rows: T[]): T[] => rows.map((r) => ({ ...r, id: newId() }));
  return {
    ...structuredClone(req),
    id: newId(),
    name,
    params: reId(req.params),
    headers: reId(req.headers),
    body: {
      ...req.body,
      formUrlEncoded: reId(req.body.formUrlEncoded),
      multipart: reId(req.body.multipart),
    },
    createdAt: ts,
    updatedAt: ts,
  };
}

export function cloneCollection(col: Collection, name: string): Collection {
  const ts = now();
  return {
    ...col,
    id: newId(),
    name,
    variables: col.variables.map((v) => ({ ...v, id: newId() })),
    requests: col.requests.map((r) => cloneRequest(r, r.name)),
    createdAt: ts,
    updatedAt: ts,
  };
}

export function defaultSettings(): AppSettings {
  return {
    settingsVersion: 1,
    lastProfilePath: null,
    recentProfiles: [],
    theme: 'dark',
    zoomFactor: 1,
    http: {
      defaultTimeoutMs: 30_000,
      verifyTls: true,
      followRedirectsDefault: true,
      maxResponseBytesToRender: 5 * 1024 * 1024,
    },
    window: { width: 1280, height: 800, maximized: false },
    checkForUpdates: true,
  };
}
