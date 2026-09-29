import { z } from 'zod';
import type { AppSettings } from './types';
import { defaultSettings, MAX_RECENTS, ZOOM_STEPS } from './defaults';

const d = defaultSettings();

export const TIMEOUT_MIN_S = 1;
export const TIMEOUT_MAX_S = 600;
export const MAX_RENDER_MIN_MB = 1;
export const MAX_RENDER_MAX_MB = 100;

/** Tolerant schema: every missing or wrong field falls back to its default (settings migration). */
export const settingsSchema = z.object({
  settingsVersion: z.literal(1).catch(1),
  lastProfilePath: z.string().nullable().catch(null),
  recentProfiles: z.array(z.string()).catch([]),
  theme: z.enum(['dark', 'light', 'system']).catch(d.theme),
  zoomFactor: z.number().catch(d.zoomFactor),
  http: z
    .object({
      defaultTimeoutMs: z.number().catch(d.http.defaultTimeoutMs),
      verifyTls: z.boolean().catch(d.http.verifyTls),
      followRedirectsDefault: z.boolean().catch(d.http.followRedirectsDefault),
      maxResponseBytesToRender: z.number().catch(d.http.maxResponseBytesToRender),
    })
    .catch(d.http),
  window: z
    .object({
      width: z.number().catch(d.window.width),
      height: z.number().catch(d.window.height),
      x: z.number().optional().catch(undefined),
      y: z.number().optional().catch(undefined),
      maximized: z.boolean().catch(false),
    })
    .catch(d.window),
  checkForUpdates: z.boolean().catch(d.checkForUpdates),
});

export function nearestZoomStep(f: number): number {
  let best: number = ZOOM_STEPS[0];
  for (const s of ZOOM_STEPS) if (Math.abs(s - f) < Math.abs(best - f)) best = s;
  return best;
}

export function stepZoom(current: number, dir: 'in' | 'out' | 'reset'): number {
  if (dir === 'reset') return 1;
  const cur = nearestZoomStep(current);
  const i = ZOOM_STEPS.indexOf(cur as (typeof ZOOM_STEPS)[number]);
  const next = dir === 'in' ? Math.min(i + 1, ZOOM_STEPS.length - 1) : Math.max(i - 1, 0);
  return ZOOM_STEPS[next] ?? 1;
}

export function clampSettings(s: AppSettings): AppSettings {
  const recents = [...new Set(s.recentProfiles)].slice(0, MAX_RECENTS);
  return {
    ...s,
    recentProfiles: recents,
    zoomFactor: nearestZoomStep(s.zoomFactor),
    http: {
      ...s.http,
      defaultTimeoutMs: Math.round(
        Math.min(TIMEOUT_MAX_S * 1000, Math.max(TIMEOUT_MIN_S * 1000, s.http.defaultTimeoutMs)),
      ),
      maxResponseBytesToRender: Math.round(
        Math.min(
          MAX_RENDER_MAX_MB * 1024 * 1024,
          Math.max(MAX_RENDER_MIN_MB * 1024 * 1024, s.http.maxResponseBytesToRender),
        ),
      ),
    },
  };
}

export function parseSettings(raw: unknown): AppSettings {
  const parsed = settingsSchema.safeParse(raw);
  const base = parsed.success ? (parsed.data as AppSettings) : defaultSettings();
  return clampSettings(base);
}

export interface PreferencesDraft {
  timeoutSeconds: string;
  maxRenderMb: string;
}

export interface PreferencesErrors {
  timeoutSeconds?: string;
  maxRenderMb?: string;
}

function intInRange(v: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(v.trim())) return false;
  const n = Number(v);
  return n >= min && n <= max;
}

export function validatePreferences(d: PreferencesDraft): PreferencesErrors {
  const errors: PreferencesErrors = {};
  if (!intInRange(d.timeoutSeconds, TIMEOUT_MIN_S, TIMEOUT_MAX_S)) {
    errors.timeoutSeconds = `Entre ${TIMEOUT_MIN_S} y ${TIMEOUT_MAX_S} segundos`;
  }
  if (!intInRange(d.maxRenderMb, MAX_RENDER_MIN_MB, MAX_RENDER_MAX_MB)) {
    errors.maxRenderMb = `Entre ${MAX_RENDER_MIN_MB} y ${MAX_RENDER_MAX_MB} MB`;
  }
  return errors;
}

/** Add a path to the front of the recents list (max 8, no duplicates). */
export function pushRecent(list: string[], path: string, replace?: string): string[] {
  const norm = (p: string): string => p.toLowerCase();
  const filtered = list.filter((p) => norm(p) !== norm(path) && (!replace || norm(p) !== norm(replace)));
  return [path, ...filtered].slice(0, MAX_RECENTS);
}
