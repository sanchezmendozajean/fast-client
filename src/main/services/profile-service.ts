import { access, readFile } from 'node:fs/promises';
import { parseProfile, profileSchema } from '../../shared/profile-schema';
import type { Profile, SaveReason, SaveResult } from '../../shared/types';
import { atomicWrite, atomicWriteSync } from './atomic-write';

export type ReadProfileResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'missing' | 'invalid' | 'future-version' | 'unreadable' };

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readProfile(path: string): Promise<ReadProfileResult> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return { ok: false, reason: code === 'ENOENT' ? 'missing' : 'unreadable' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const parsed = parseProfile(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, profile: parsed.profile };
}

/**
 * Serialise for disk. Re-parsing through the zod schema strips any unknown field,
 * so response data can never leak into the profile file.
 */
export function serializeProfile(profile: Profile, updatedAt = new Date().toISOString()): string {
  const clean = profileSchema.parse({ ...profile, updatedAt });
  return JSON.stringify(clean, null, 2);
}

type Writer = (dest: string, data: string) => Promise<void>;

interface Job {
  profile: Profile;
  reason: SaveReason;
  waiters: ((r: SaveResult) => void)[];
}

/** Owns the current profile path and the single write queue (doc 04 §3). */
export class ProfileService {
  private currentPath: string | null = null;
  private snapshot: Profile | null = null;
  private pending: Job | null = null;
  private running = false;
  /** Reasons of the writes that reached disk, most recent last (logs and tests). */
  readonly writeLog: SaveReason[] = [];

  constructor(private readonly write: Writer = atomicWrite) {}

  setSession(path: string, profile: Profile): void {
    this.currentPath = path;
    this.snapshot = profile;
  }

  getPath(): string | null {
    return this.currentPath;
  }

  getSnapshot(): Profile | null {
    return this.snapshot;
  }

  /** `profile:sync`: in-memory copy only, never touches disk. */
  sync(profile: Profile): void {
    this.snapshot = profile;
  }

  /** Enqueue a write; if one is already waiting it is replaced (latest wins). */
  save(profile: Profile, reason: SaveReason): Promise<SaveResult> {
    this.snapshot = profile;
    return new Promise((resolve) => {
      if (this.pending) {
        this.pending.profile = profile;
        this.pending.reason = reason;
        this.pending.waiters.push(resolve);
      } else {
        this.pending = { profile, reason, waiters: [resolve] };
      }
      void this.pump();
    });
  }

  /** Wait until the queue is empty. */
  async flush(): Promise<void> {
    while (this.running || this.pending) await new Promise((r) => setTimeout(r, 10));
  }

  /** Synchronous write of the last snapshot (Windows `session-end`). */
  saveSnapshotSync(): void {
    if (!this.currentPath || !this.snapshot) return;
    atomicWriteSync(this.currentPath, serializeProfile(this.snapshot));
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending) {
        const job = this.pending;
        this.pending = null;
        const result = await this.writeNow(job.profile);
        if (result.ok) this.writeLog.push(job.reason);
        for (const w of job.waiters) w(result);
      }
    } finally {
      this.running = false;
    }
  }

  private async writeNow(profile: Profile): Promise<SaveResult> {
    const path = this.currentPath;
    if (!path) return { ok: false, message: 'No hay un perfil abierto' };
    try {
      const existed = await fileExists(path);
      await this.write(path, serializeProfile(profile));
      return { ok: true, recreated: !existed };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }
}
