import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SettingsService } from '../../src/main/services/settings-service';
import { defaultSettings, MAX_RECENTS } from '../../src/shared/defaults';
import { parseSettings, pushRecent, stepZoom, validatePreferences } from '../../src/shared/settings-schema';
import { tmp } from './helpers';

describe('SettingsService', () => {
  it('uses defaults when the file does not exist', async () => {
    const svc = new SettingsService(join(tmp(), 'fastclient.settings.json'));
    expect(await svc.load()).toEqual(defaultSettings());
  });

  it('renames a corrupt file to .corrupt and uses defaults', async () => {
    const file = join(tmp(), 'fastclient.settings.json');
    writeFileSync(file, '{{{ roto');
    const svc = new SettingsService(file);
    expect(await svc.load()).toEqual(defaultSettings());
    expect(existsSync(`${file}.corrupt`)).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  it('migrates settings without zoomFactor / followRedirectsDefault', async () => {
    const file = join(tmp(), 'fastclient.settings.json');
    writeFileSync(
      file,
      JSON.stringify({
        settingsVersion: 1,
        lastProfilePath: 'C:\\p.fcprofile',
        recentProfiles: [],
        theme: 'light',
        http: { defaultTimeoutMs: 10000, verifyTls: false, maxResponseBytesToRender: 1048576 },
        window: { width: 1000, height: 700, maximized: false },
      }),
    );
    const s = await new SettingsService(file).load();
    expect(s.zoomFactor).toBe(1);
    expect(s.http.followRedirectsDefault).toBe(true);
    expect(s.http.verifyTls).toBe(false);
    expect(s.theme).toBe('light');
    expect(s.lastProfilePath).toBe('C:\\p.fcprofile');
    expect(s.checkForUpdates).toBe(true);
  });

  it('persists updates immediately', async () => {
    const file = join(tmp(), 'fastclient.settings.json');
    const svc = new SettingsService(file);
    await svc.load();
    await svc.update({ theme: 'system', http: { ...defaultSettings().http, verifyTls: false } });
    const disk = JSON.parse(readFileSync(file, 'utf8'));
    expect(disk.theme).toBe('system');
    expect(disk.http.verifyTls).toBe(false);
    expect(disk.http.defaultTimeoutMs).toBe(30000);
  });

  it('keeps at most 8 recents without duplicates (case-insensitive)', async () => {
    const svc = new SettingsService(join(tmp(), 's.json'));
    await svc.load();
    for (let i = 0; i < 12; i++) await svc.addRecent(`C:\\p${i}.fcprofile`);
    await svc.addRecent('c:\\P3.FCPROFILE');
    const r = svc.get().recentProfiles;
    expect(r).toHaveLength(MAX_RECENTS);
    expect(r[0]).toBe('c:\\P3.FCPROFILE');
    expect(r.filter((p) => p.toLowerCase() === 'c:\\p3.fcprofile')).toHaveLength(1);
  });
});

describe('settings-schema', () => {
  it('steps zoom within limits', () => {
    expect(stepZoom(1, 'in')).toBe(1.1);
    expect(stepZoom(1, 'out')).toBe(0.9);
    expect(stepZoom(2, 'in')).toBe(2);
    expect(stepZoom(0.5, 'out')).toBe(0.5);
    expect(stepZoom(1.5, 'reset')).toBe(1);
    expect(stepZoom(1.03, 'in')).toBe(1.1);
  });

  it('clamps out-of-range values when parsing', () => {
    const s = parseSettings({ zoomFactor: 7, http: { defaultTimeoutMs: 5, maxResponseBytesToRender: 1e12 } });
    expect(s.zoomFactor).toBe(2);
    expect(s.http.defaultTimeoutMs).toBe(1000);
    expect(s.http.maxResponseBytesToRender).toBe(100 * 1024 * 1024);
  });

  it('validates Preferences', () => {
    expect(validatePreferences({ timeoutSeconds: '30', maxRenderMb: '5' })).toEqual({});
    expect(validatePreferences({ timeoutSeconds: '0', maxRenderMb: '5' }).timeoutSeconds).toBeDefined();
    expect(validatePreferences({ timeoutSeconds: '601', maxRenderMb: '5' }).timeoutSeconds).toBeDefined();
    expect(validatePreferences({ timeoutSeconds: '3.5', maxRenderMb: '5' }).timeoutSeconds).toBeDefined();
    expect(validatePreferences({ timeoutSeconds: '30', maxRenderMb: '101' }).maxRenderMb).toBeDefined();
    expect(validatePreferences({ timeoutSeconds: '30', maxRenderMb: '' }).maxRenderMb).toBeDefined();
  });

  it('pushRecent replaces a relocated path', () => {
    expect(pushRecent(['A', 'B', 'C'], 'D', 'B')).toEqual(['D', 'A', 'C']);
  });
});
