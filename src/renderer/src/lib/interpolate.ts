import type { KeyValue } from '@shared/types';

const VAR_RE = /\{\{\s*([^{}\s]+)\s*\}\}/g;

export type VarMap = ReadonlyMap<string, string>;

/** Enabled collection variables as a map (first definition wins). */
export function variableMap(vars: readonly KeyValue[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const v of vars) {
    const key = v.key.trim();
    if (v.enabled && key && !map.has(key)) map.set(key, v.value);
  }
  return map;
}

export interface InterpolationResult {
  text: string;
  unresolved: string[];
}

/** Replace {{name}} with its value. No recursion: substituted values are not scanned again. */
export function interpolate(text: string, vars: VarMap): InterpolationResult {
  const unresolved: string[] = [];
  const out = text.replace(VAR_RE, (whole, name: string) => {
    const value = vars.get(name);
    if (value === undefined) {
      if (!unresolved.includes(name)) unresolved.push(name);
      return whole;
    }
    return value;
  });
  return { text: out, unresolved };
}

export type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'var'; text: string; name: string; defined: boolean; value?: string };

/** Split a string into plain text and {{variable}} segments (URL highlighting). */
export function segmentVariables(text: string, vars: VarMap): TextSegment[] {
  const segs: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(VAR_RE)) {
    const start = m.index ?? 0;
    if (start > last) segs.push({ kind: 'text', text: text.slice(last, start) });
    const name = m[1] ?? '';
    const value = vars.get(name);
    segs.push({ kind: 'var', text: m[0], name, defined: value !== undefined, value });
    last = start + m[0].length;
  }
  if (last < text.length) segs.push({ kind: 'text', text: text.slice(last) });
  return segs;
}
