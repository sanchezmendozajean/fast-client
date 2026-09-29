import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileMenuService } from '../../src/main/services/file-menu-service';
import { PathsService } from '../../src/main/services/paths-service';
import { ProfileService, serializeProfile } from '../../src/main/services/profile-service';
import { SettingsService } from '../../src/main/services/settings-service';
import { runStartup } from '../../src/main/services/startup';
import { sampleProfile, tmp } from './helpers';

async function deps(): Promise<Parameters<typeof runStartup>[0] & { dir: string }> {
  const dir = tmp();
  const paths = new PathsService({ profilesDir: dir, configDir: dir });
  await paths.ensure();
  const settings = new SettingsService(paths.settingsPath());
  await settings.load();
  const profiles = new ProfileService();
  const none = (): Promise<null> => Promise.resolve(null);
  const files = new FileMenuService({
    paths,
    settings,
    profiles,
    dialogs: { showSave: none, showOpen: none },
    shell: { showItemInFolder: () => undefined, openPath: () => Promise.resolve('') },
    toast: () => undefined,
  });
  return { dir, paths, settings, profiles, files };
}

describe('startup (doc 04 §4)', () => {
  it('first run creates the default profile and remembers it', async () => {
    const d = await deps();
    const r = await runStartup(d);
    expect(r.session?.profilePath).toBe(d.paths.defaultProfilePath());
    expect(existsSync(d.paths.defaultProfilePath())).toBe(true);
    expect(d.settings.get().lastProfilePath).toBe(d.paths.defaultProfilePath());
    expect(r.toasts).toEqual([]);
  });

  it('loads the last profile', async () => {
    const d = await deps();
    const other = join(d.dir, 'otro.fcprofile');
    writeFileSync(other, serializeProfile(sampleProfile()));
    await d.settings.update({ lastProfilePath: other });
    const r = await runStartup(d);
    expect(r.session?.profilePath).toBe(other);
    expect(r.session?.profile.collections).toHaveLength(1);
  });

  it('missing last profile → toast + NEW flow (creates default)', async () => {
    const d = await deps();
    await d.settings.update({ lastProfilePath: join(d.dir, 'perdido.fcprofile') });
    const r = await runStartup(d);
    expect(r.toasts[0]?.kind).toBe('warning');
    expect(r.toasts[0]?.text).toContain('No se encontró el perfil «perdido.fcprofile»');
    expect(r.session?.profilePath).toBe(d.paths.defaultProfilePath());
    expect(r.startupConflictPath).toBeNull();
  });

  it('missing last profile with an existing default → conflict for the renderer', async () => {
    const d = await deps();
    writeFileSync(d.paths.defaultProfilePath(), serializeProfile(sampleProfile()));
    await d.settings.update({ lastProfilePath: join(d.dir, 'perdido.fcprofile') });
    const r = await runStartup(d);
    expect(r.session).toBeNull();
    expect(r.startupConflictPath).toBe(d.paths.defaultProfilePath());
  });

  it('corrupt last profile is never overwritten', async () => {
    const d = await deps();
    const bad = join(d.dir, 'roto.fcprofile');
    writeFileSync(bad, 'basura');
    await d.settings.update({ lastProfilePath: bad });
    const r = await runStartup(d);
    expect(r.toasts[0]?.text).toContain('formato inválido');
    expect(existsSync(bad)).toBe(true);
  });
});
