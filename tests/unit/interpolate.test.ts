import { describe, expect, it } from 'vitest';
import { interpolate, segmentVariables, variableMap } from '../../src/renderer/src/lib/interpolate';

const vars = variableMap([
  { id: '1', key: 'baseUrl', value: 'https://api.dev', enabled: true },
  { id: '2', key: 'token', value: 'abc', enabled: false },
  { id: '3', key: 'loop', value: '{{baseUrl}}', enabled: true },
  { id: '4', key: ' spaced ', value: 'ok', enabled: true },
]);

describe('interpolate', () => {
  it('replaces defined variables', () => {
    expect(interpolate('{{baseUrl}}/x?{{ spaced }}', vars)).toEqual({ text: 'https://api.dev/x?ok', unresolved: [] });
  });

  it('leaves undefined variables as they are and reports them once', () => {
    expect(interpolate('{{nope}}/{{nope}}', vars)).toEqual({ text: '{{nope}}/{{nope}}', unresolved: ['nope'] });
  });

  it('ignores disabled variables', () => {
    expect(interpolate('Bearer {{token}}', vars).unresolved).toEqual(['token']);
  });

  it('does not recurse', () => {
    expect(interpolate('{{loop}}', vars).text).toBe('{{baseUrl}}');
  });

  it('segments text for highlighting', () => {
    const segs = segmentVariables('{{baseUrl}}/users/{{id}}', vars);
    expect(segs).toEqual([
      { kind: 'var', text: '{{baseUrl}}', name: 'baseUrl', defined: true, value: 'https://api.dev' },
      { kind: 'text', text: '/users/' },
      { kind: 'var', text: '{{id}}', name: 'id', defined: false, value: undefined },
    ]);
  });
});
