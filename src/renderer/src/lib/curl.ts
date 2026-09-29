import { newId } from '@shared/defaults';
import {
  HTTP_METHODS,
  type Auth,
  type HttpMethod,
  type KeyValue,
  type MultipartField,
  type RequestBody,
  type ResolvedRequest,
} from '@shared/types';
import { paramsFromUrl } from './url-params';

/** POSIX single-quote escaping. */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Copy as cURL from a resolved request (variables already substituted). */
export function toCurl(req: ResolvedRequest): string {
  const parts: string[] = ['curl'];
  if (req.method !== 'GET') parts.push('-X', req.method);
  parts.push(shellQuote(req.url));
  for (const [k, v] of req.headers) {
    if (k.toLowerCase() === 'user-agent' && v.startsWith('FastClient/')) continue;
    parts.push('-H', shellQuote(`${k}: ${v}`));
  }
  if (req.body.kind === 'text') parts.push('--data-raw', shellQuote(req.body.text));
  if (req.body.kind === 'multipart') {
    for (const f of req.body.fields) {
      parts.push('-F', shellQuote(`${f.key}=${f.kind === 'file' ? '@' : ''}${f.value}`));
    }
  }
  if (req.followRedirects) parts.push('-L');
  return parts.join(' ');
}

/** Shell-like tokenizer: quotes, backslash escapes and `\` / `^` line continuations. */
export function tokenize(input: string): string[] {
  const src = input.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ');
  const out: string[] = [];
  let cur = '';
  let has = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      if (has) out.push(cur);
      cur = '';
      has = false;
      i++;
    } else if (c === "'") {
      const end = src.indexOf("'", i + 1);
      const stop = end < 0 ? src.length : end;
      cur += src.slice(i + 1, stop);
      has = true;
      i = stop + 1;
    } else if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length && '"\\$`'.includes(src[i + 1]!)) i++;
        cur += src[i];
        i++;
      }
      has = true;
      i++;
    } else if (c === '\\' && i + 1 < src.length && /[\s'"\\$`]/.test(src[i + 1]!)) {
      // Only escape shell-special characters so Windows paths like C:\tmp survive.
      cur += src[i + 1];
      has = true;
      i += 2;
    } else {
      cur += c;
      has = true;
      i++;
    }
  }
  if (has) out.push(cur);
  return out;
}

export interface ImportedCurl {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: Auth;
  insecure: boolean;
  followRedirects: boolean;
}

const kv = (key: string, value: string): KeyValue => ({ id: newId(), key, value, enabled: true });

export function looksLikeCurl(text: string): boolean {
  return /^\s*curl(\.exe)?\s/i.test(text);
}

function splitHeader(h: string): [string, string] {
  const i = h.indexOf(':');
  return i < 0 ? [h.trim(), ''] : [h.slice(0, i).trim(), h.slice(i + 1).trim()];
}

function decodeForm(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

function parseForm(data: string): KeyValue[] {
  return data
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf('=');
      return i < 0 ? kv(decodeForm(pair), '') : kv(decodeForm(pair.slice(0, i)), decodeForm(pair.slice(i + 1)));
    });
}

const WITH_ARG = new Set([
  '-X', '--request', '-H', '--header', '-d', '--data', '--data-raw', '--data-binary', '--data-ascii',
  '--data-urlencode', '-F', '--form', '-u', '--user', '--url', '-A', '--user-agent', '-b', '--cookie',
  '-e', '--referer', '-o', '--output', '-m', '--max-time', '--connect-timeout', '-x', '--proxy',
]);

/** Import a cURL command (doc 06). Returns null when the text is not a cURL command. */
export function parseCurl(text: string): ImportedCurl | null {
  const tokens = tokenize(text.trim());
  if (!tokens.length || !/^curl(\.exe)?$/i.test(tokens[0]!)) return null;
  let method: string | null = null;
  let url = '';
  const headers: [string, string][] = [];
  const data: string[] = [];
  const form: MultipartField[] = [];
  let user: string | null = null;
  let getMode = false;
  let insecure = false;
  let followRedirects = false;
  let hasUrlencoded = false;

  for (let i = 1; i < tokens.length; i++) {
    let t = tokens[i]!;
    let arg: string | undefined;
    const eq = t.startsWith('--') ? t.indexOf('=') : -1;
    if (eq > 0) {
      arg = t.slice(eq + 1);
      t = t.slice(0, eq);
    } else if (WITH_ARG.has(t)) {
      arg = tokens[++i] ?? '';
    } else if (/^-[XHdFuAb]./.test(t)) {
      arg = t.slice(2);
      t = t.slice(0, 2);
    }
    switch (t) {
      case '-X':
      case '--request':
        method = (arg ?? '').toUpperCase();
        break;
      case '-H':
      case '--header':
        headers.push(splitHeader(arg ?? ''));
        break;
      case '-A':
      case '--user-agent':
        headers.push(['User-Agent', arg ?? '']);
        break;
      case '-b':
      case '--cookie':
        headers.push(['Cookie', arg ?? '']);
        break;
      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
      case '--data-ascii':
        data.push(arg ?? '');
        break;
      case '--data-urlencode': {
        hasUrlencoded = true;
        const a = arg ?? '';
        const e = a.indexOf('=');
        data.push(e < 0 ? encodeURIComponent(a) : `${a.slice(0, e)}=${encodeURIComponent(a.slice(e + 1))}`);
        break;
      }
      case '-F':
      case '--form': {
        const a = arg ?? '';
        const e = a.indexOf('=');
        const key = e < 0 ? a : a.slice(0, e);
        const value = e < 0 ? '' : a.slice(e + 1);
        const isFile = value.startsWith('@');
        form.push({ ...kv(key, isFile ? value.slice(1) : value), kind: isFile ? 'file' : 'text' });
        break;
      }
      case '-u':
      case '--user':
        user = arg ?? '';
        break;
      case '--url':
        url = arg ?? '';
        break;
      case '-G':
      case '--get':
        getMode = true;
        break;
      case '-k':
      case '--insecure':
        insecure = true;
        break;
      case '-L':
      case '--location':
        followRedirects = true;
        break;
      case '-I':
      case '--head':
        method = 'HEAD';
        break;
      default:
        if (arg === undefined && !t.startsWith('-') && !url) url = t;
    }
  }

  const joined = data.join('&');
  if (getMode && joined) {
    url += (url.includes('?') ? '&' : '?') + joined;
    data.length = 0;
  }
  const m = method ?? (data.length || form.length ? 'POST' : 'GET');
  const finalMethod: HttpMethod = (HTTP_METHODS as readonly string[]).includes(m) ? (m as HttpMethod) : 'GET';

  let auth: Auth = { type: 'none' };
  if (user !== null) {
    const c = user.indexOf(':');
    auth = { type: 'basic', username: c < 0 ? user : user.slice(0, c), password: c < 0 ? '' : user.slice(c + 1) };
  }
  const headerRows: KeyValue[] = [];
  for (const [k, v] of headers) {
    const bearer = /^bearer\s+(.+)$/i.exec(v);
    if (k.toLowerCase() === 'authorization' && bearer && auth.type === 'none') {
      auth = { type: 'bearer', token: bearer[1]!.trim() };
    } else {
      headerRows.push(kv(k, v));
    }
  }

  const ct = (headers.find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '').toLowerCase();
  const body: RequestBody = { mode: 'none', raw: '', formUrlEncoded: [], multipart: [] };
  if (form.length) {
    body.mode = 'multipart';
    body.multipart = form;
  } else if (data.length) {
    const trimmed = joined.trim();
    if (ct.includes('json') || (!ct && /^[[{]/.test(trimmed))) {
      body.mode = 'json';
      body.raw = joined;
    } else if (ct.includes('xml') || (!ct && trimmed.startsWith('<'))) {
      body.mode = 'xml';
      body.raw = joined;
    } else if (
      ct.includes('x-www-form-urlencoded') ||
      hasUrlencoded ||
      (!ct && /^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(trimmed))
    ) {
      body.mode = 'form-urlencoded';
      body.formUrlEncoded = parseForm(joined);
    } else {
      body.mode = 'text';
      body.raw = joined;
    }
  }
  return {
    method: finalMethod,
    url,
    params: paramsFromUrl(url, []),
    headers: headerRows,
    body,
    auth,
    insecure,
    followRedirects,
  };
}
