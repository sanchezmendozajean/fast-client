import { describe, expect, it } from 'vitest';
import type { ResolvedRequest } from '../../src/shared/types';
import { looksLikeCurl, parseCurl, toCurl, tokenize } from '../../src/renderer/src/lib/curl';

describe('curl', () => {
  it('tokenizes quotes, escapes and line continuations (bash and cmd)', () => {
    expect(tokenize(`curl 'a b' "c \\"d\\"" e\\ f \\\n -H x`)).toEqual(['curl', 'a b', 'c "d"', 'e f', '-H', 'x']);
    expect(tokenize('curl ^\r\n  -X POST')).toEqual(['curl', '-X', 'POST']);
  });

  it('detects cURL text', () => {
    expect(looksLikeCurl('curl https://x')).toBe(true);
    expect(looksLikeCurl('  curl.exe -X GET x')).toBe(true);
    expect(looksLikeCurl('curly')).toBe(false);
  });

  it('imports method, headers, JSON body and bearer auth', () => {
    const r = parseCurl(`curl -X PUT 'https://api.dev/items/1?x=1' \\
      -H 'Content-Type: application/json' -H 'Authorization: Bearer abc' \\
      --data-raw '{"a":1}'`)!;
    expect(r.method).toBe('PUT');
    expect(r.url).toBe('https://api.dev/items/1?x=1');
    expect(r.params.map((p) => [p.key, p.value])).toEqual([['x', '1']]);
    expect(r.headers.map((h) => [h.key, h.value])).toEqual([['Content-Type', 'application/json']]);
    expect(r.auth).toEqual({ type: 'bearer', token: 'abc' });
    expect(r.body).toMatchObject({ mode: 'json', raw: '{"a":1}' });
  });

  it('defaults to POST with data, GET with -G, basic auth with -u, -k and -F', () => {
    const post = parseCurl('curl https://x -d a=1 -d b=2 -u ana:pw -k')!;
    expect(post.method).toBe('POST');
    expect(post.body.mode).toBe('form-urlencoded');
    expect(post.body.formUrlEncoded.map((f) => [f.key, f.value])).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
    expect(post.auth).toEqual({ type: 'basic', username: 'ana', password: 'pw' });
    expect(post.insecure).toBe(true);
    const get = parseCurl('curl -G https://x --data-urlencode "q=a b"')!;
    expect(get.method).toBe('GET');
    expect(get.url).toBe('https://x?q=a%20b');
    const multi = parseCurl('curl --url https://x -F name=ana -F file=@C:\\tmp\\a.png')!;
    expect(multi.url).toBe('https://x');
    expect(multi.body.mode).toBe('multipart');
    expect(multi.body.multipart.map((f) => [f.key, f.kind, f.value])).toEqual([
      ['name', 'text', 'ana'],
      ['file', 'file', 'C:\\tmp\\a.png'],
    ]);
  });

  it('returns null for non-cURL text', () => {
    expect(parseCurl('wget https://x')).toBeNull();
  });

  it('round-trips export → import', () => {
    const req: ResolvedRequest = {
      method: 'POST',
      url: 'https://api.dev/orders?x=1',
      headers: [
        ['Content-Type', 'application/json'],
        ['X-Quote', "it's"],
        ['User-Agent', 'FastClient/0.1.0'],
      ],
      body: { kind: 'text', text: `{"nota":"it's ok"}` },
      timeoutMs: 1000,
      followRedirects: true,
      unresolvedVariables: [],
    };
    const cmd = toCurl(req);
    expect(cmd).not.toContain('FastClient/');
    const back = parseCurl(cmd)!;
    expect(back.method).toBe('POST');
    expect(back.url).toBe(req.url);
    expect(back.headers.map((h) => [h.key, h.value])).toEqual([
      ['Content-Type', 'application/json'],
      ['X-Quote', "it's"],
    ]);
    expect(back.body).toMatchObject({ mode: 'json', raw: `{"nota":"it's ok"}` });
    expect(back.followRedirects).toBe(true);
  });
});
