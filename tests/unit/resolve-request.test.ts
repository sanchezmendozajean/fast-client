import { describe, expect, it } from 'vitest';
import { defaultSettings, newCollection, newRequest } from '../../src/shared/defaults';
import type { Collection, RequestDef } from '../../src/shared/types';
import { autoHeaders, resolveRequest } from '../../src/renderer/src/lib/resolve-request';
import { variableMap } from '../../src/renderer/src/lib/interpolate';

const http = defaultSettings().http;

function col(): Collection {
  const c = newCollection('API');
  c.variables = [
    { id: '1', key: 'baseUrl', value: 'https://api.dev', enabled: true },
    { id: '2', key: 'token', value: 't0k', enabled: true },
  ];
  return c;
}

function req(patch: Partial<RequestDef> = {}): RequestDef {
  return { ...newRequest('r'), url: '{{baseUrl}}/users', ...patch };
}

const header = (r: ReturnType<typeof resolveRequest>, name: string): string | undefined =>
  r.ok ? r.resolved.headers.find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] : undefined;

describe('resolveRequest', () => {
  it('interpolates the URL and rebuilds the query from enabled params', () => {
    const r = resolveRequest(
      req({
        url: '{{baseUrl}}/users?stale=1',
        params: [
          { id: 'a', key: 'page', value: '2', enabled: true },
          { id: 'b', key: 'off', value: 'x', enabled: false },
        ],
      }),
      col(),
      http,
      '1.0.0',
    );
    expect(r.ok && r.resolved.url).toBe('https://api.dev/users?page=2');
  });

  it('adds http:// when the scheme is missing and rejects invalid URLs', () => {
    expect(resolveRequest(req({ url: 'localhost:3000/x' }), col(), http, '1').ok).toBe(true);
    const r = resolveRequest(req({ url: 'localhost:3000/x' }), col(), http, '1');
    expect(r.ok && r.resolved.url).toBe('http://localhost:3000/x');
    expect(resolveRequest(req({ url: 'http://exa mple.com:99999' }), col(), http, '1').ok).toBe(false);
    expect(resolveRequest(req({ url: '   ' }), col(), http, '1').ok).toBe(false);
  });

  it('bearer and basic auth', () => {
    const b = resolveRequest(req({ auth: { type: 'bearer', token: '{{token}}' } }), col(), http, '1');
    expect(header(b, 'authorization')).toBe('Bearer t0k');
    const basic = resolveRequest(req({ auth: { type: 'basic', username: 'ana', password: 'ñ:1' } }), col(), http, '1');
    expect(header(basic, 'authorization')).toBe(`Basic ${Buffer.from('ana:ñ:1').toString('base64')}`);
  });

  it('an explicit Authorization header takes priority', () => {
    const r = resolveRequest(
      req({
        auth: { type: 'bearer', token: 'x' },
        headers: [{ id: 'h', key: 'Authorization', value: 'Custom 1', enabled: true }],
      }),
      col(),
      http,
      '1',
    );
    expect(r.ok && r.resolved.headers.filter(([k]) => k.toLowerCase() === 'authorization')).toEqual([
      ['Authorization', 'Custom 1'],
    ]);
  });

  it('sets Content-Type automatically per body mode unless defined', () => {
    const body = (mode: RequestDef['body']['mode']): RequestDef['body'] => ({
      mode,
      raw: '{"a":1}',
      formUrlEncoded: [{ id: 'f', key: 'a b', value: 'c&d', enabled: true }],
      multipart: [],
    });
    expect(header(resolveRequest(req({ method: 'POST', body: body('json') }), col(), http, '1'), 'content-type')).toBe(
      'application/json',
    );
    expect(header(resolveRequest(req({ method: 'POST', body: body('xml') }), col(), http, '1'), 'content-type')).toBe(
      'application/xml',
    );
    expect(header(resolveRequest(req({ method: 'POST', body: body('text') }), col(), http, '1'), 'content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    const form = resolveRequest(req({ method: 'POST', body: body('form-urlencoded') }), col(), http, '1');
    expect(header(form, 'content-type')).toBe('application/x-www-form-urlencoded');
    expect(form.ok && form.resolved.body).toEqual({ kind: 'text', text: 'a+b=c%26d' });
    const own = resolveRequest(
      req({
        method: 'POST',
        body: body('json'),
        headers: [{ id: 'h', key: 'content-type', value: 'application/vnd+json', enabled: true }],
      }),
      col(),
      http,
      '1',
    );
    expect(own.ok && own.resolved.headers.filter(([k]) => k.toLowerCase() === 'content-type')).toHaveLength(1);
    const multi = resolveRequest(req({ method: 'POST', body: { ...body('multipart') } }), col(), http, '1');
    expect(header(multi, 'content-type')).toBeUndefined();
  });

  it('reports unresolved variables and warns about GET with body', () => {
    const r = resolveRequest(
      req({ url: '{{baseUrl}}/{{id}}', body: { mode: 'text', raw: '{{nada}}', formUrlEncoded: [], multipart: [] } }),
      col(),
      http,
      '1',
    );
    expect(r.ok && r.resolved.unresolvedVariables).toEqual(['id', 'nada']);
    expect(r.ok && r.warnings.some((w) => w.includes('GET'))).toBe(true);
  });

  it('uses the global timeout when the request has none', () => {
    const r1 = resolveRequest(req(), col(), http, '1');
    expect(r1.ok && r1.resolved.timeoutMs).toBe(30000);
    const r2 = resolveRequest(req({ settings: { timeoutMs: 1500, followRedirects: false } }), col(), http, '1');
    expect(r2.ok && r2.resolved).toMatchObject({ timeoutMs: 1500, followRedirects: false });
  });

  it('autoHeaders lists Content-Type, Authorization and User-Agent', () => {
    const r = req({ method: 'POST', auth: { type: 'bearer', token: '{{token}}' } });
    r.body.mode = 'json';
    expect(autoHeaders(r, variableMap(col().variables), '0.1.0')).toEqual([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer t0k' },
      { key: 'User-Agent', value: 'FastClient/0.1.0' },
    ]);
  });
});
