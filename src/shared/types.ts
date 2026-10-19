// Domain types (doc 03). The zod schema in profile-schema.ts is the source of truth for the profile file.

export type Id = string;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface KeyValue {
  id: Id;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export const BODY_MODES = ['none', 'json', 'text', 'xml', 'form-urlencoded', 'multipart'] as const;
export type BodyMode = (typeof BODY_MODES)[number];

export interface MultipartField extends KeyValue {
  kind: 'text' | 'file';
}

export interface RequestBody {
  mode: BodyMode;
  raw: string;
  formUrlEncoded: KeyValue[];
  multipart: MultipartField[];
}

export type Auth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string };

export interface RequestSettings {
  timeoutMs: number | null;
  followRedirects: boolean;
}

export interface RequestDef {
  id: Id;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: Auth;
  settings: RequestSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: Id;
  name: string;
  expanded: boolean;
  variables: KeyValue[];
  requests: RequestDef[];
  createdAt: string;
  updatedAt: string;
}

export type SplitOrientation = 'vertical' | 'horizontal';

export interface WorkspaceState {
  openTabs: Id[];
  activeTabId: Id | null;
  sidebarWidth: number;
  splitRatio: number;
  splitOrientation: SplitOrientation;
}

export interface Profile {
  formatVersion: 1;
  app: 'fast-client';
  name: string;
  createdAt: string;
  updatedAt: string;
  collections: Collection[];
  workspace: WorkspaceState;
}

// ── Settings (fastclient.settings.json) ──

export type ThemeSetting = 'dark' | 'light' | 'system';

export interface HttpSettings {
  defaultTimeoutMs: number;
  verifyTls: boolean;
  followRedirectsDefault: boolean;
  maxResponseBytesToRender: number;
}

export interface WindowSettings {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

export interface AppSettings {
  settingsVersion: 1;
  lastProfilePath: string | null;
  recentProfiles: string[];
  theme: ThemeSetting;
  zoomFactor: number;
  http: HttpSettings;
  window: WindowSettings;
  /** Check GitHub Releases for a new version at startup (the only non-user network call). */
  checkForUpdates: boolean;
}

// ── Save / file operations ──

export type SaveReason =
  | 'collection-created'
  | 'request-created'
  | 'send'
  | 'close'
  | 'before-new'
  | 'before-open'
  | 'renamed'
  | 'deleted'
  | 'resized'
  | 'manual';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export type ToastAction = 'retry-save' | 'reveal' | 'relocate' | 'import-curl' | 'install-update';

export interface ToastMessage {
  kind: ToastKind;
  text: string;
  action?: { label: string; command: ToastAction };
  /** Second action (e.g. "Reubicar…" next to "Reintentar", doc 04 §10). */
  secondaryAction?: { label: string; command: ToastAction };
}

export type SaveResult = { ok: true; recreated: boolean } | { ok: false; message: string };

export interface RecentEntry {
  path: string;
  exists: boolean;
}

export interface ProfileSession {
  profile: Profile;
  profilePath: string;
}

/** Lifecycle of an update check as shown on the Preferences button. */
export type UpdatePhase = 'idle' | 'checking' | 'downloading' | 'ready';

export interface InitResult {
  session: ProfileSession | null;
  /** Startup NEW flow (doc 04 §4) found an existing default profile: renderer must ask. */
  startupConflictPath: string | null;
  settings: AppSettings;
  recents: RecentEntry[];
  profilesDir: string;
  appVersion: string;
  toasts: ToastMessage[];
}

export type NewResolution = 'relocate-existing' | 'create-anyway' | 'open-existing';

export interface NewRequestArgs {
  profile: Profile | null;
  mode: 'menu' | 'startup';
  resolution?: NewResolution;
  /** User accepted to continue although saving the current profile failed. */
  skipSave?: boolean;
}

export interface OpenRequestArgs {
  profile: Profile | null;
  /** Open this path directly (recent entry, file association); otherwise native dialog. */
  path?: string;
  skipSave?: boolean;
}

export type FileOpResult =
  | { status: 'ok'; session: ProfileSession; recents: RecentEntry[]; toasts: ToastMessage[] }
  | { status: 'cancelled'; toasts: ToastMessage[] }
  | { status: 'conflict'; existingPath: string }
  | { status: 'save-failed'; message: string }
  | { status: 'error'; toasts: ToastMessage[] };

// ── HTTP (doc 06) ──

export type ResolvedBody =
  | { kind: 'none' }
  | { kind: 'text'; text: string }
  | { kind: 'multipart'; fields: { key: string; kind: 'text' | 'file'; value: string }[] };

export interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  headers: [string, string][];
  body: ResolvedBody;
  timeoutMs: number;
  followRedirects: boolean;
  unresolvedVariables: string[];
}

export type HttpErrorCode =
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'DNS'
  | 'REFUSED'
  | 'TLS'
  | 'RESET'
  | 'INVALID_URL'
  | 'UNKNOWN';

export type HttpResult =
  | {
      ok: true;
      status: number;
      statusText: string;
      headers: [string, string][];
      bodyBase64: string;
      contentType: string | null;
      sizeBytes: { headers: number; body: number };
      timingMs: { total: number; ttfb: number };
      finalUrl: string;
      truncatedForView: boolean;
      warnings: string[];
    }
  | {
      ok: false;
      error: { code: HttpErrorCode; message: string; detail?: string };
      timingMs: { total: number };
    };

export type MenuCommand =
  | 'file:new'
  | 'file:open'
  | 'file:relocate'
  | 'file:reveal'
  | 'profile:save'
  | 'settings:preferences';
