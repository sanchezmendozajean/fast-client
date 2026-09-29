import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PathsService, resolvePaths } from '../../src/main/services/paths-service';
import { tmp } from './helpers';

const base = {
  appPath: 'C:\\proyecto',
  documentsDir: 'C:\\Users\\ana\\Documents',
  userDataDir: 'C:\\Users\\ana\\AppData\\Roaming\\Fast Client',
};

describe('PathsService', () => {
  it('uses .dev-data in development', () => {
    const r = resolvePaths({ ...base, isPackaged: false, env: {} });
    expect(r.profilesDir).toBe(join('C:\\proyecto', '.dev-data'));
    expect(r.configDir).toBe(r.profilesDir);
  });

  it('uses Documents / userData when packaged', () => {
    const r = resolvePaths({ ...base, isPackaged: true, env: {} });
    expect(r.profilesDir).toBe(join('C:\\Users\\ana\\Documents', 'Fast Client'));
    expect(r.configDir).toBe(base.userDataDir);
  });

  it('FASTCLIENT_HOME wins over everything', () => {
    for (const isPackaged of [true, false]) {
      const r = resolvePaths({ ...base, isPackaged, env: { FASTCLIENT_HOME: 'D:\\tmp\\x' } });
      expect(r).toEqual({ profilesDir: 'D:\\tmp\\x', configDir: 'D:\\tmp\\x' });
    }
  });

  it('falls back to <config>/perfiles when the profiles folder cannot be created', async () => {
    const dir = tmp();
    const blocker = join(dir, 'es-un-archivo');
    writeFileSync(blocker, 'x');
    const svc = new PathsService({ profilesDir: join(blocker, 'Fast Client'), configDir: join(dir, 'config') });
    await svc.ensure();
    expect(svc.fallbackUsed).toBe(true);
    expect(svc.getProfilesDir()).toBe(join(dir, 'config', 'perfiles'));
    expect(svc.defaultProfilePath()).toBe(join(dir, 'config', 'perfiles', 'perfil.fcprofile'));
    chmodSync(blocker, 0o666);
  });

  it('keeps the profiles folder when it is writable', async () => {
    const dir = tmp();
    const svc = new PathsService({ profilesDir: join(dir, 'docs'), configDir: join(dir, 'cfg') });
    await svc.ensure();
    expect(svc.fallbackUsed).toBe(false);
    expect(svc.settingsPath()).toBe(join(dir, 'cfg', 'fastclient.settings.json'));
  });
});
