import { z } from 'zod';
import { BODY_MODES, HTTP_METHODS, type Profile } from './types';
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN } from './defaults';

export const CURRENT_FORMAT_VERSION = 1;

const keyValueSchema = z.object({
  id: z.string().min(1),
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
});

const multipartFieldSchema = keyValueSchema.extend({
  kind: z.enum(['text', 'file']),
});

const authSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('bearer'), token: z.string() }),
  z.object({ type: z.literal('basic'), username: z.string(), password: z.string() }),
]);

const requestSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  method: z.enum(HTTP_METHODS),
  url: z.string(),
  params: z.array(keyValueSchema),
  headers: z.array(keyValueSchema),
  body: z.object({
    mode: z.enum(BODY_MODES),
    raw: z.string(),
    formUrlEncoded: z.array(keyValueSchema),
    multipart: z.array(multipartFieldSchema),
  }),
  auth: authSchema,
  settings: z.object({
    timeoutMs: z.number().int().positive().nullable(),
    followRedirects: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const collectionSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  expanded: z.boolean(),
  variables: z.array(keyValueSchema),
  requests: z.array(requestSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workspaceSchema = z.object({
  openTabs: z.array(z.string()),
  activeTabId: z.string().nullable(),
  sidebarWidth: z.number().catch(SIDEBAR_DEFAULT),
  splitRatio: z.number().catch(0.5),
  splitOrientation: z.enum(['vertical', 'horizontal']).catch('vertical'),
});

export const profileSchema = z.object({
  formatVersion: z.literal(CURRENT_FORMAT_VERSION),
  app: z.literal('fast-client'),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  collections: z.array(collectionSchema),
  workspace: workspaceSchema,
});

export type ParseProfileResult =
  | { ok: true; profile: Profile; migrated: boolean }
  | { ok: false; reason: 'invalid' | 'future-version'; detail?: string };

/** Migrations keyed by the version they upgrade FROM. Empty while only v1 exists. */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate, migrate and normalise raw JSON into a Profile (doc 03 integrity rules). */
export function parseProfile(raw: unknown): ParseProfileResult {
  if (!isRecord(raw) || raw.app !== 'fast-client') return { ok: false, reason: 'invalid' };
  let version = raw.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'invalid' };
  }
  if (version > CURRENT_FORMAT_VERSION) return { ok: false, reason: 'future-version' };

  let data: Record<string, unknown> = raw;
  let migrated = false;
  while (version < CURRENT_FORMAT_VERSION) {
    const step = migrations[version];
    if (!step) return { ok: false, reason: 'invalid', detail: `no migration from v${version}` };
    data = step(data);
    version += 1;
    migrated = true;
  }

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { ok: false, reason: 'invalid', detail: parsed.error.message };
  return { ok: true, profile: normalizeProfile(parsed.data), migrated };
}

/** Drop orphan tabs, fix the active tab and clamp layout values. */
export function normalizeProfile(profile: Profile): Profile {
  const ids = new Set(profile.collections.flatMap((c) => c.requests.map((r) => r.id)));
  const openTabs = [...new Set(profile.workspace.openTabs.filter((id) => ids.has(id)))];
  const active = profile.workspace.activeTabId;
  return {
    ...profile,
    workspace: {
      ...profile.workspace,
      openTabs,
      activeTabId: active !== null && openTabs.includes(active) ? active : (openTabs[0] ?? null),
      sidebarWidth: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, profile.workspace.sidebarWidth)),
      splitRatio: Math.min(0.85, Math.max(0.15, profile.workspace.splitRatio)),
    },
  };
}
