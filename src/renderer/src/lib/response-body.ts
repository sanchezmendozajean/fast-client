export type BodyKind = 'json' | 'xml' | 'html' | 'image' | 'text' | 'binary' | 'empty';

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function charsetOf(contentType: string | null): string {
  const m = /charset\s*=\s*"?([^";\s]+)/i.exec(contentType ?? '');
  return m?.[1]?.toLowerCase() ?? 'utf-8';
}

export function decodeText(bytes: Uint8Array, contentType: string | null): string {
  try {
    return new TextDecoder(charsetOf(contentType)).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 1024);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

export function detectKind(contentType: string | null, bytes: Uint8Array, text: string): BodyKind {
  if (bytes.length === 0) return 'empty';
  const ct = (contentType ?? '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.includes('json')) return 'json';
  if (ct.includes('html')) return 'html';
  if (ct.includes('xml')) return 'xml';
  if (looksBinary(bytes)) return 'binary';
  const t = text.trimStart();
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(text);
      return 'json';
    } catch {
      /* not JSON */
    }
  }
  if (t.startsWith('<')) return 'xml';
  if (ct && !ct.startsWith('text/') && !ct.includes('javascript')) return 'binary';
  return 'text';
}

export function prettyJson(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
}

/** Minimal XML pretty printer (one tag per line, 2-space indent). */
export function prettyXml(xml: string): string {
  const parts = xml
    .replace(/>\s+</g, '><')
    .replace(/</g, '\n<')
    .split('\n')
    .filter((l) => l.trim() !== '');
  let depth = 0;
  const lines: string[] = [];
  for (const raw of parts) {
    const line = raw.trim();
    const closing = line.startsWith('</');
    if (closing) depth = Math.max(depth - 1, 0);
    lines.push('  '.repeat(depth) + line);
    const opening = /^<[^!?/]/.test(line) && !line.endsWith('/>') && !/<\/[^>]+>$/.test(line);
    if (opening) depth++;
  }
  return lines.join('\n');
}

export function extensionFor(contentType: string | null, kind: BodyKind): string {
  const ct = (contentType ?? '').toLowerCase();
  if (kind === 'json') return 'json';
  if (kind === 'xml') return 'xml';
  if (kind === 'html') return 'html';
  if (kind === 'image') return ct.split('/')[1]?.split(/[;+]/)[0] ?? 'img';
  if (kind === 'text') return 'txt';
  return 'bin';
}
