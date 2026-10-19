import { describe, expect, it } from 'vitest';
import { UpdateService, type UpdaterLike } from '../../src/main/services/update-service';
import type { ToastMessage, UpdatePhase } from '../../src/shared/types';

type CheckResult = Awaited<ReturnType<UpdaterLike['checkForUpdates']>>;

function fakeUpdater(result: () => Promise<CheckResult>): UpdaterLike & {
  emitDownloaded: (v: string) => void;
  checks: number;
  installs: [boolean | undefined, boolean | undefined][];
} {
  let onDownloaded: ((info: { version: string }) => void) | null = null;
  const f = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checks: 0,
    installs: [] as [boolean | undefined, boolean | undefined][],
    checkForUpdates: () => {
      f.checks++;
      return result();
    },
    quitAndInstall: (s?: boolean, r?: boolean) => void f.installs.push([s, r]),
    on: (event: string, listener: (arg: never) => void) => {
      if (event === 'update-downloaded') onDownloaded = listener as (info: { version: string }) => void;
      return f;
    },
    emitDownloaded: (v: string) => onDownloaded?.({ version: v }),
  };
  return f;
}

function setup(result: () => Promise<CheckResult>, enabled = true) {
  const toasts: ToastMessage[] = [];
  const phases: UpdatePhase[] = [];
  const updater = fakeUpdater(result);
  const svc = new UpdateService({
    updater,
    enabled,
    currentVersion: '0.1.0',
    toast: (t) => void toasts.push(t),
    onPhase: (p) => void phases.push(p),
  });
  return { svc, updater, toasts, phases };
}

const none = (): Promise<CheckResult> => Promise.resolve({ isUpdateAvailable: false, updateInfo: { version: '0.1.0' } });
const found = (): Promise<CheckResult> => Promise.resolve({ isUpdateAvailable: true, updateInfo: { version: '0.2.0' } });
const offline = (): Promise<CheckResult> => Promise.reject(new Error('net::ERR_INTERNET_DISCONNECTED'));

describe('UpdateService', () => {
  it('downloads automatically and installs on quit', () => {
    const { updater } = setup(none);
    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
  });

  it('never touches the network when disabled (dev / e2e)', async () => {
    const { svc, updater, toasts } = setup(none, false);
    await svc.check(false);
    expect(updater.checks).toBe(0);
    expect(toasts).toEqual([]);
    await svc.check(true);
    expect(updater.checks).toBe(0);
    expect(toasts[0]?.kind).toBe('info');
  });

  it('automatic checks are silent when there is nothing new or the network fails', async () => {
    for (const r of [none, found, offline]) {
      const { svc, updater, toasts } = setup(r);
      await svc.check(false);
      expect(updater.checks).toBe(1);
      expect(toasts).toEqual([]);
    }
  });

  it('manual checks always report the outcome', async () => {
    let s = setup(none);
    await s.svc.check(true);
    expect(s.toasts[0]).toMatchObject({ kind: 'success', text: expect.stringContaining('0.1.0') });

    s = setup(found);
    await s.svc.check(true);
    expect(s.toasts[0]).toMatchObject({ kind: 'info', text: expect.stringContaining('0.2.0') });

    s = setup(offline);
    await s.svc.check(true);
    expect(s.toasts[0]?.kind).toBe('error');
  });

  it('announces a downloaded update with a restart action and stops checking', async () => {
    const { svc, updater, toasts } = setup(found);
    updater.emitDownloaded('0.2.0');
    expect(svc.isUpdateReady).toBe(true);
    expect(toasts[0]).toMatchObject({ kind: 'success', action: { command: 'install-update' } });
    await svc.check(true);
    expect(updater.checks).toBe(0);
    expect(toasts[1]?.action?.command).toBe('install-update');
  });

  it('reports phases: checking, then downloading until the download finishes', async () => {
    const { svc, updater, phases } = setup(found);
    await svc.check(true);
    expect(phases).toEqual(['checking', 'downloading']);
    updater.emitDownloaded('0.2.0');
    expect(phases).toEqual(['checking', 'downloading', 'ready']);
  });

  it('goes back to idle when there is nothing new or the check fails', async () => {
    for (const r of [none, offline]) {
      const { svc, phases } = setup(r);
      await svc.check(true);
      expect(phases).toEqual(['checking', 'idle']);
    }
  });

  it('installs silently and relaunches the app', () => {
    const { svc, updater } = setup(none);
    svc.installAndRestart();
    expect(updater.installs).toEqual([[true, true]]);
  });
});
