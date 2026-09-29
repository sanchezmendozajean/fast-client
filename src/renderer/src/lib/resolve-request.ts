import type { Collection, HttpSettings, RequestDef, ResolvedBody, ResolvedRequest } from '@shared/types';
import { interpolate, variableMap, type VarMap } from './interpolate';
import { urlFromParams } from './url-params';

export type ResolveOutcome =
  | { ok: true; resolved: ResolvedRequest; warnings: string[] }
  | { ok: false; message: string; unresolved: string[] };

const CONTENT_TYPES: Partial<Record<RequestDef['body']['mode'], string>> = {
  json: 'application/json',
  xml: 'application/xml',
  text: 'text/plain; charset=utf-8',
  'form-urlencoded': 'application/x-www-form-urlencoded',
};

export function toBase64Utf8(s: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function hasHeader(req: RequestDef, name: string): boolean {
  const n = name.toLowerCase();
  return req.headers.some((h) => h.enabled && h.key.trim().toLowerCase() === n);
}

export interface AutoHeader {
  key: string;
  value: string;
}

/** Headers added automatically unless the user defines them (shown read-only in grey, doc 05). */
export function autoHeaders(req: RequestDef, vars: VarMap, appVersion: string): AutoHeader[] {
  const out: AutoHeader[] = [];
  if (!hasHeader(req, 'content-type')) {
    const ct = CONTENT_TYPES[req.body.mode];
    if (ct) out.push({ key: 'Content-Type', value: ct });
    if (req.body.mode === 'multipart') {
      out.push({ key: 'Content-Type', value: 'multipart/form-data; boundary=<calculado al enviar>' });
    }
  }
  if (!hasHeader(req, 'authorization')) {
    if (req.auth.type === 'bearer') {
      out.push({ key: 'Authorization', value: `Bearer ${interpolate(req.auth.token, vars).text}` });
    } else if (req.auth.type === 'basic') {
      const u = interpolate(req.auth.username, vars).text;
      const p = interpolate(req.auth.password, vars).text;
      out.push({ key: 'Authorization', value: `Basic ${toBase64Utf8(`${u}:${p}`)}` });
    }
  }
  if (!hasHeader(req, 'user-agent')) out.push({ key: 'User-Agent', value: `FastClient/${appVersion}` });
  return out;
}

export function withScheme(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `http://${url}`;
}

/** Doc 06 "Resolución": pure, no network. */
export function resolveRequest(
  req: RequestDef,
  collection: Collection | undefined,
  http: HttpSettings,
  appVersion: string,
): ResolveOutcome {
  const vars = variableMap(collection?.variables ?? []);
  const unresolved = new Set<string>();
  const sub = (s: string): string => {
    const r = interpolate(s, vars);
    r.unresolved.forEach((u) => unresolved.add(u));
    return r.text;
  };
  const warnings: string[] = [];

  const rawUrl = sub(urlFromParams(req.url.trim(), req.params)).trim();
  if (!rawUrl) return { ok: false, message: 'Escribe una URL', unresolved: [...unresolved] };
  let finalUrl: string;
  try {
    finalUrl = new URL(withScheme(rawUrl)).toString();
  } catch {
    return { ok: false, message: `La URL no es válida: ${rawUrl}`, unresolved: [...unresolved] };
  }

  const headers: [string, string][] = req.headers
    .filter((h) => h.enabled && h.key.trim() !== '')
    .map((h) => [sub(h.key.trim()), sub(h.value)]);

  let body: ResolvedBody = { kind: 'none' };
  switch (req.body.mode) {
    case 'json':
    case 'xml':
    case 'text':
      body = { kind: 'text', text: sub(req.body.raw) };
      break;
    case 'form-urlencoded': {
      const usp = new URLSearchParams();
      for (const f of req.body.formUrlEncoded) if (f.enabled && f.key !== '') usp.append(sub(f.key), sub(f.value));
      body = { kind: 'text', text: usp.toString() };
      break;
    }
    case 'multipart':
      body = {
        kind: 'multipart',
        fields: req.body.multipart
          .filter((f) => f.enabled && f.key !== '')
          .map((f) => ({ key: sub(f.key), kind: f.kind, value: f.kind === 'file' ? f.value : sub(f.value) })),
      };
      break;
    case 'none':
      break;
  }
  if (body.kind !== 'none' && (req.method === 'GET' || req.method === 'HEAD')) {
    warnings.push(`Se envía un body con ${req.method}; muchos servidores lo ignoran`);
  }

  // Auth variables must be reported as unresolved too.
  if (req.auth.type === 'bearer') sub(req.auth.token);
  if (req.auth.type === 'basic') {
    sub(req.auth.username);
    sub(req.auth.password);
  }
  // Automatic headers go after the user's own, which always take priority.
  for (const h of autoHeaders(req, vars, appVersion)) {
    if (req.body.mode === 'multipart' && h.key === 'Content-Type') continue; // undici sets the boundary
    headers.push([h.key, h.value]);
  }

  const list = [...unresolved];
  if (list.length) warnings.push(`Variables sin definir: ${list.join(', ')}`);
  return {
    ok: true,
    warnings,
    resolved: {
      method: req.method,
      url: finalUrl,
      headers,
      body,
      timeoutMs: req.settings.timeoutMs ?? http.defaultTimeoutMs,
      followRedirects: req.settings.followRedirects,
      unresolvedVariables: list,
    },
  };
}
