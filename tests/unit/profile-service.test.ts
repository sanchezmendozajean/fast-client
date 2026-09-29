import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProfileService, readProfile, serializeProfile } from '../../src/main/services/profile-service';
import type { Profile } from '../../src/shared/types';
import { sampleProfile, tmp } from './helpers';

describe('ProfileService', () => {
  it('writes the snapshot atomically and updates updatedAt', async () => {
    const path = join(tmp(), 'perfil.fcprofile');
    const svc = new ProfileService();
    const p = sampleProfile();
    p.updatedAt = '2000-01-01T00:00:00.000Z';
    svc.setSession(path, p);
    const r = await svc.save(p, 'manual');
    expect(r.ok).toBe(true);
    const onDisk = JSON.parse(readFileSync(path, 'utf8')) as Profile;
    expect(onDisk.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
    expect(onDisk.collections[0]!.name).toBe('API Tienda');
    expect(svc.writeLog).toEqual(['manual']);
  });

  it('coalesces queued writes (latest wins)', async () => {
    const path = join(tmp(), 'p.fcprofile');
    const writes: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    const slowWriter = async (_d: string, data: string): Promise<void> => {
      writes.push((JSON.parse(data) as Profile).name);
      if (writes.length === 1) await gate;
    };
    const svc = new ProfileService(slowWriter);
    const base = sampleProfile();
    svc.setSession(path, base);
    const first = svc.save({ ...base, name: 'uno' }, 'send');
    const second = svc.save({ ...base, name: 'dos' }, 'send');
    const third = svc.save({ ...base, name: 'tres' }, 'renamed');
    release();
    const results = await Promise.all([first, second, third]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(writes).toEqual(['uno', 'tres']);
    expect(svc.writeLog).toEqual(['send', 'renamed']);
  });

  it('never serialises response data', () => {
    const p = sampleProfile() as Profile & { responses?: unknown };
    (p.collections[0]!.requests[0] as unknown as Record<string, unknown>).lastResponse = { body: 'TOP-SECRET' };
    p.responses = { anything: 'TOP-SECRET' };
    expect(serializeProfile(p)).not.toContain('TOP-SECRET');
  });

  it('reports recreation when the file had been deleted', async () => {
    const path = join(tmp(), 'p.fcprofile');
    const svc = new ProfileService();
    const p = sampleProfile();
    svc.setSession(path, p);
    expect(await svc.save(p, 'manual')).toEqual({ ok: true, recreated: true });
    expect(await svc.save(p, 'manual')).toEqual({ ok: true, recreated: false });
    unlinkSync(path);
    expect(await svc.save(p, 'manual')).toEqual({ ok: true, recreated: true });
  });

  it('returns an error when the folder is gone', async () => {
    const svc = new ProfileService();
    svc.setSession(join(tmp(), 'no-existe', 'p.fcprofile'), sampleProfile());
    const r = await svc.save(sampleProfile(), 'manual');
    expect(r.ok).toBe(false);
  });

  it('readProfile classifies missing, invalid, future and valid files', async () => {
    const dir = tmp();
    expect(await readProfile(join(dir, 'nada.fcprofile'))).toEqual({ ok: false, reason: 'missing' });
    writeFileSync(join(dir, 'roto.fcprofile'), '{ no es json');
    expect(await readProfile(join(dir, 'roto.fcprofile'))).toEqual({ ok: false, reason: 'invalid' });
    writeFileSync(join(dir, 'futuro.fcprofile'), JSON.stringify({ ...sampleProfile(), formatVersion: 9 }));
    expect(await readProfile(join(dir, 'futuro.fcprofile'))).toEqual({ ok: false, reason: 'future-version' });
    writeFileSync(join(dir, 'bom.fcprofile'), String.fromCharCode(0xfeff) + JSON.stringify(sampleProfile()));
    expect((await readProfile(join(dir, 'bom.fcprofile'))).ok).toBe(true);
  });
});
