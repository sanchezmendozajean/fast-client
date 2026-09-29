import { describe, expect, it } from 'vitest';
import { parseProfile } from '../../src/shared/profile-schema';
import { sampleProfile } from './helpers';

describe('profile-schema', () => {
  it('accepts a valid profile', () => {
    const p = sampleProfile();
    const r = parseProfile(JSON.parse(JSON.stringify(p)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile).toEqual(p);
  });

  it('rejects missing fields', () => {
    const raw = JSON.parse(JSON.stringify(sampleProfile()));
    delete raw.collections[0].requests[0].method;
    expect(parseProfile(raw)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(parseProfile({})).toMatchObject({ ok: false, reason: 'invalid' });
    expect(parseProfile(null)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(parseProfile([])).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('refuses a future formatVersion', () => {
    const raw = { ...JSON.parse(JSON.stringify(sampleProfile())), formatVersion: 2 };
    expect(parseProfile(raw)).toMatchObject({ ok: false, reason: 'future-version' });
  });

  it('rejects an unknown older version without migration', () => {
    const raw = { ...JSON.parse(JSON.stringify(sampleProfile())), formatVersion: 0 };
    expect(parseProfile(raw)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('filters orphan tabs and fixes the active tab', () => {
    const p = sampleProfile();
    const first = p.workspace.openTabs[0]!;
    p.workspace.openTabs = ['ghost', first, 'ghost2'];
    p.workspace.activeTabId = 'ghost';
    const r = parseProfile(JSON.parse(JSON.stringify(p)));
    expect(r.ok && r.profile.workspace.openTabs).toEqual([first]);
    expect(r.ok && r.profile.workspace.activeTabId).toBe(first);
  });

  it('fills invalid layout values with defaults (lenient migration)', () => {
    const raw = JSON.parse(JSON.stringify(sampleProfile()));
    raw.workspace.splitOrientation = 'diagonal';
    raw.workspace.sidebarWidth = 9999;
    const r = parseProfile(raw);
    expect(r.ok && r.profile.workspace.splitOrientation).toBe('vertical');
    expect(r.ok && r.profile.workspace.sidebarWidth).toBe(480);
  });

  it('strips unknown fields such as responses', () => {
    const raw = JSON.parse(JSON.stringify(sampleProfile()));
    raw.collections[0].requests[0].response = { status: 200, body: 'secret' };
    raw.responses = { x: 1 };
    const r = parseProfile(raw);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain('secret');
  });
});
