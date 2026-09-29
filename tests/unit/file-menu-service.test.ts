import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rename as fsRename } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileMenuService, moveFile, type FileDialogs } from '../../src/main/services/file-menu-service';
import { PathsService } from '../../src/main/services/paths-service';
import { ProfileService, serializeProfile } from '../../src/main/services/profile-service';
import { SettingsService } from '../../src/main/services/settings-service';
import type { Profile, ToastMessage } from '../../src/shared/types';
import { sampleProfile, tmp } from './helpers';

vi.mock('node:fs/promises', async (orig) => {
  const real = await orig<typeof import('node:fs/promises')>();
  return { ...real, rename: vi.fn(real.rename) };
});

interface Ctx {
  dir: string;
  paths: PathsService;
  settings: SettingsService;
  profiles: ProfileService;
  files: FileMenuService;
  answers: (string | null)[];
  toasts: ToastMessage[];
  revealed: string[];
}

async function setup(): Promise<Ctx> {
  const dir = tmp();
  const paths = new PathsService({ profilesDir: join(dir, 'perfiles'), configDir: join(dir, 'cfg') });
  await paths.ensure();
  const settings = new SettingsService(paths.settingsPath());
  await settings.load();
  const profiles = new ProfileService();
  const answers: (string | null)[] = [];
  const next = (): Promise<string | null> => Promise.resolve(answers.shift() ?? null);
  const dialogs: FileDialogs = { showSave: next, showOpen: next };
  const toasts: ToastMessage[] = [];
  const revealed: string[] = [];
  const files = new FileMenuService({
    paths,
    settings,
    profiles,
    dialogs,
    shell: {
      showItemInFolder: (p) => void revealed.push(p),
      openPath: (p) => {
        revealed.push(`dir:${p}`);
        return Promise.resolve('');
      },
    },
    toast: (t) => void toasts.push(t),
  });
  return { dir, paths, settings, profiles, files, answers, toasts, revealed };
}

function writeProfile(path: string, p: Profile = sampleProfile()): void {
  writeFileSync(path, serializeProfile(p));
}

describe('FileMenuService', () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await setup();
  });

  it('Nuevo without a default profile creates it without asking', async () => {
    const r = await c.files.newProfile({ profile: null, mode: 'menu' });
    expect(r.status).toBe('ok');
    expect(existsSync(c.paths.defaultProfilePath())).toBe(true);
    expect(c.settings.get().lastProfilePath).toBe(c.paths.defaultProfilePath());
  });

  it('Nuevo saves the current profile first (before-new)', async () => {
    const current = join(c.dir, 'actual.fcprofile');
    const p = sampleProfile();
    c.profiles.setSession(current, p);
    await c.files.newProfile({ profile: { ...p, name: 'cambiado' }, mode: 'menu' });
    expect(JSON.parse(readFileSync(current, 'utf8')).name).toBe('cambiado');
    expect(c.profiles.writeLog).toContain('before-new');
  });

  it('Nuevo with an existing default returns a conflict', async () => {
    writeProfile(c.paths.defaultProfilePath());
    const r = await c.files.newProfile({ profile: null, mode: 'menu' });
    expect(r).toEqual({ status: 'conflict', existingPath: c.paths.defaultProfilePath() });
  });

  it('conflict → create anyway keeps a .bak and creates an empty profile', async () => {
    const def = c.paths.defaultProfilePath();
    writeProfile(def);
    const r = await c.files.newProfile({ profile: null, mode: 'menu', resolution: 'create-anyway' });
    expect(r.status).toBe('ok');
    expect(JSON.parse(readFileSync(`${def}.bak`, 'utf8')).collections).toHaveLength(1);
    expect(JSON.parse(readFileSync(def, 'utf8')).collections).toHaveLength(0);
  });

  it('conflict → relocate moves the existing file and creates a new one', async () => {
    const def = c.paths.defaultProfilePath();
    writeProfile(def);
    const dest = join(c.dir, 'otro', 'viejo');
    mkdirSync(join(c.dir, 'otro'));
    c.answers.push(dest);
    const r = await c.files.newProfile({ profile: null, mode: 'menu', resolution: 'relocate-existing' });
    expect(r.status).toBe('ok');
    expect(JSON.parse(readFileSync(`${dest}.fcprofile`, 'utf8')).collections).toHaveLength(1);
    expect(JSON.parse(readFileSync(def, 'utf8')).collections).toHaveLength(0);
    expect(c.settings.get().recentProfiles).toContain(`${dest}.fcprofile`);
  });

  it('conflict → relocate cancelled returns to the conflict dialog', async () => {
    writeProfile(c.paths.defaultProfilePath());
    c.answers.push(null);
    const r = await c.files.newProfile({ profile: null, mode: 'menu', resolution: 'relocate-existing' });
    expect(r.status).toBe('conflict');
  });

  it('Abrir an invalid file keeps the current profile', async () => {
    const current = join(c.dir, 'actual.fcprofile');
    writeProfile(current);
    c.profiles.setSession(current, sampleProfile());
    const bad = join(c.dir, 'malo.fcprofile');
    writeFileSync(bad, '{"app":"otra"}');
    c.answers.push(bad);
    const r = await c.files.open({ profile: sampleProfile() });
    expect(r.status).toBe('error');
    expect(c.profiles.getPath()).toBe(current);
  });

  it('Abrir a valid file switches profile and updates recents', async () => {
    const other = join(c.dir, 'otro.fcprofile');
    writeProfile(other, { ...sampleProfile(), name: 'otro' });
    c.answers.push(other);
    const r = await c.files.open({ profile: null });
    expect(r.status).toBe('ok');
    expect(c.profiles.getPath()).toBe(other);
    expect(c.settings.get().lastProfilePath).toBe(other);
  });

  it('Reubicar to the same path does nothing', async () => {
    const current = join(c.dir, 'actual.fcprofile');
    writeProfile(current);
    c.profiles.setSession(current, sampleProfile());
    c.answers.push(current);
    const r = await c.files.relocate(sampleProfile());
    expect(r.status).toBe('cancelled');
    expect(existsSync(current)).toBe(true);
  });

  it('Reubicar moves the file with unsaved changes and renames the profile', async () => {
    const current = join(c.dir, 'actual.fcprofile');
    writeProfile(current);
    c.profiles.setSession(current, sampleProfile());
    const dest = join(c.dir, 'nuevo-nombre.fcprofile');
    c.answers.push(dest);
    const changed = { ...sampleProfile(), collections: [] };
    const r = await c.files.relocate(changed);
    expect(r.status).toBe('ok');
    expect(existsSync(current)).toBe(false);
    const disk = JSON.parse(readFileSync(dest, 'utf8')) as Profile;
    expect(disk.collections).toHaveLength(0);
    expect(disk.name).toBe('nuevo-nombre');
    expect(c.settings.get().lastProfilePath).toBe(dest);
  });

  it('moveFile falls back to copy + delete on EXDEV', async () => {
    const mocked = vi.mocked(fsRename);
    mocked.mockRejectedValueOnce(Object.assign(new Error('cross-device'), { code: 'EXDEV' }));
    const src = join(c.dir, 'a.fcprofile');
    writeProfile(src);
    const dest = join(c.dir, 'b.fcprofile');
    await moveFile(src, dest);
    expect(existsSync(src)).toBe(false);
    expect(existsSync(dest)).toBe(true);
  });

  it('Ir al archivo reveals the file, or its folder, or reports the missing folder', async () => {
    const current = join(c.dir, 'actual.fcprofile');
    c.profiles.setSession(current, sampleProfile());
    await c.files.reveal();
    expect(c.revealed).toEqual([`dir:${c.dir}`]);
    writeProfile(current);
    await c.files.reveal();
    expect(c.revealed[1]).toBe(current);
    c.profiles.setSession(join(c.dir, 'nope', 'x.fcprofile'), sampleProfile());
    expect(await c.files.reveal()).toBe(false);
    expect(c.toasts.at(-1)?.kind).toBe('error');
  });
});
