import { closeSync, fsyncSync, openSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { open, rename, unlink } from 'node:fs/promises';

export const RENAME_RETRY_DELAYS_MS = [50, 100, 200, 400, 800];

export interface AtomicWriteDeps {
  rename: (from: string, to: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
}

const defaultDeps: AtomicWriteDeps = {
  rename,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

function isRetryable(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  return code === 'EPERM' || code === 'EBUSY' || code === 'EACCES';
}

export function tempPathFor(dest: string): string {
  return `${dest}.tmp-${process.pid}`;
}

/** Doc 04 §3: write temp file in the same folder, fsync, rename with retries (Windows AV/indexer). */
export async function atomicWrite(dest: string, data: string, deps: Partial<AtomicWriteDeps> = {}): Promise<void> {
  const { rename: doRename, sleep } = { ...defaultDeps, ...deps };
  const tmp = tempPathFor(dest);
  try {
    const fh = await open(tmp, 'w');
    try {
      await fh.writeFile(data, 'utf8');
      await fh.sync();
    } finally {
      await fh.close();
    }
    for (let attempt = 0; ; attempt++) {
      try {
        await doRename(tmp, dest);
        return;
      } catch (err) {
        const delay = RENAME_RETRY_DELAYS_MS[attempt];
        if (!isRetryable(err) || delay === undefined) throw err;
        await sleep(delay);
      }
    }
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

/** Synchronous variant for `session-end` (Windows shutdown). */
export function atomicWriteSync(dest: string, data: string): void {
  const tmp = tempPathFor(dest);
  try {
    const fd = openSync(tmp, 'w');
    try {
      writeSync(fd, data, null, 'utf8');
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, dest);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw err;
  }
}
