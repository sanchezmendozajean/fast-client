import { describe, expect, it } from 'vitest';
import type { KeyValue } from '../../src/shared/types';
import { paramsFromUrl, parseQuery, splitUrl, urlFromParams } from '../../src/renderer/src/lib/url-params';

const strip = (ps: KeyValue[]): [string, string, boolean][] => ps.map((p) => [p.key, p.value, p.enabled]);

describe('url-params', () => {
  it('splits base, query and fragment without new URL()', () => {
    expect(splitUrl('{{baseUrl}}/x?a=1&b#top')).toEqual({ base: '{{baseUrl}}/x', query: 'a=1&b', hash: '#top' });
    expect(splitUrl('/x#frag?not-query')).toEqual({ base: '/x', query: null, hash: '#frag?not-query' });
  });

  it('parses params without value and keeps raw encoding', () => {
    expect(parseQuery('flag&q=a%20b&e=')).toEqual([
      { key: 'flag', value: '' },
      { key: 'q', value: 'a%20b' },
      { key: 'e', value: '' },
    ]);
  });

  it('URL → params → URL is idempotent', () => {
    for (const url of [
      'https://x.dev/a?page=1&size=20',
      '{{baseUrl}}/employees?page={{page}}&q=a%20b#anchor',
      'http://x/?flag&x=1',
      'http://x/no-query',
    ]) {
      expect(urlFromParams(url, paramsFromUrl(url, []))).toBe(url);
    }
  });

  it('keeps ids of existing enabled rows and preserves disabled rows', () => {
    const existing: KeyValue[] = [
      { id: 'a', key: 'page', value: '1', enabled: true },
      { id: 'd', key: 'debug', value: 'true', enabled: false },
    ];
    const next = paramsFromUrl('http://x?page=2&size=5', existing);
    expect(next[0]!.id).toBe('a');
    expect(strip(next)).toEqual([
      ['page', '2', true],
      ['size', '5', true],
      ['debug', 'true', false],
    ]);
  });

  it('builds the URL only from enabled params with a key', () => {
    const params: KeyValue[] = [
      { id: '1', key: 'a', value: '1', enabled: true },
      { id: '2', key: 'b', value: '2', enabled: false },
      { id: '3', key: '', value: 'x', enabled: true },
    ];
    expect(urlFromParams('http://x/p?old=1#h', params)).toBe('http://x/p?a=1#h');
    expect(urlFromParams('http://x/p?old=1', [])).toBe('http://x/p');
  });
});
