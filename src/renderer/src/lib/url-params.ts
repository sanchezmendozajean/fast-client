import { newId } from '@shared/defaults';
import type { KeyValue } from '@shared/types';

export interface UrlParts {
  base: string;
  query: string | null;
  hash: string;
}

/** Split without `new URL()` so `{{vars}}` and partial URLs survive untouched. */
export function splitUrl(url: string): UrlParts {
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const rest = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const qAt = rest.indexOf('?');
  if (qAt < 0) return { base: rest, query: null, hash };
  return { base: rest.slice(0, qAt), query: rest.slice(qAt + 1), hash };
}

export interface RawParam {
  key: string;
  value: string;
}

/** Query string → raw (still encoded) key/value pairs, in order. */
export function parseQuery(query: string | null): RawParam[] {
  if (!query) return [];
  return query
    .split('&')
    .filter((p) => p.length > 0)
    .map((p) => {
      const eq = p.indexOf('=');
      return eq < 0 ? { key: p, value: '' } : { key: p.slice(0, eq), value: p.slice(eq + 1) };
    });
}

export function formatQuery(params: readonly RawParam[]): string {
  return params.map((p) => (p.value === '' ? p.key : `${p.key}=${p.value}`)).join('&');
}

/** URL edited → params table. Enabled rows mirror the URL (ids reused by position); disabled rows are kept. */
export function paramsFromUrl(url: string, existing: readonly KeyValue[]): KeyValue[] {
  const parsed = parseQuery(splitUrl(url).query);
  const enabled = existing.filter((p) => p.enabled);
  const next: KeyValue[] = parsed.map((p, i) => {
    const prev = enabled[i];
    return prev
      ? { ...prev, key: p.key, value: p.value }
      : { id: newId(), key: p.key, value: p.value, enabled: true };
  });
  return [...next, ...existing.filter((p) => !p.enabled)];
}

/** Params table edited → URL. Only enabled rows with a key go into the query string. */
export function urlFromParams(url: string, params: readonly KeyValue[]): string {
  const { base, hash } = splitUrl(url);
  const q = formatQuery(params.filter((p) => p.enabled && p.key !== '').map((p) => ({ key: p.key, value: p.value })));
  return `${base}${q ? `?${q}` : ''}${hash}`;
}
