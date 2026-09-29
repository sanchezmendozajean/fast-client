import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atomicWrite, RENAME_RETRY_DELAYS_MS } from '../../src/main/services/atomic-write';
import { tmp } from './helpers';

const noSleep = (): Promise<void> => Promise.resolve();

describe('atomic-write', () => {
  it('writes and replaces a file without leaving .tmp files', async () => {
    const dir = tmp();
    const dest = join(dir, 'perfil.fcprofile');
    await atomicWrite(dest, 'uno');
    expect(readFileSync(dest, 'utf8')).toBe('uno');
    writeFileSync(dest, 'viejo');
    await atomicWrite(dest, 'dos');
    expect(readFileSync(dest, 'utf8')).toBe('dos');
    expect(readdirSync(dir)).toEqual(['perfil.fcprofile']);
  });

  it('retries the rename on EPERM and then succeeds', async () => {
    const dir = tmp();
    const dest = join(dir, 'p.fcprofile');
    let calls = 0;
    const flaky = async (a: string, b: string): Promise<void> => {
      calls++;
      if (calls < 3) throw Object.assign(new Error('locked'), { code: 'EPERM' });
      await rename(a, b);
    };
    await atomicWrite(dest, 'ok', { rename: flaky, sleep: noSleep });
    expect(calls).toBe(3);
    expect(readFileSync(dest, 'utf8')).toBe('ok');
    expect(readdirSync(dir)).toEqual(['p.fcprofile']);
  });

  it('gives up after the retries, cleans the temp file and throws', async () => {
    const dir = tmp();
    const dest = join(dir, 'p.fcprofile');
    let calls = 0;
    const locked = async (): Promise<void> => {
      calls++;
      throw Object.assign(new Error('busy'), { code: 'EBUSY' });
    };
    await expect(atomicWrite(dest, 'x', { rename: locked, sleep: noSleep })).rejects.toThrow('busy');
    expect(calls).toBe(RENAME_RETRY_DELAYS_MS.length + 1);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('does not retry non-transient errors', async () => {
    const dir = tmp();
    let calls = 0;
    const bad = async (): Promise<void> => {
      calls++;
      throw Object.assign(new Error('nope'), { code: 'ENOSPC' });
    };
    await expect(atomicWrite(join(dir, 'a'), 'x', { rename: bad, sleep: noSleep })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
