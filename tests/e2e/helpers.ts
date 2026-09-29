import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AppSettings, MenuCommand, Profile } from '../../src/shared/types';

export interface Launched {
  app: ElectronApplication;
  page: Page;
  home: string;
}

export function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'fastclient-e2e-'));
}

export const profilePathIn = (home: string, name = 'perfil.fcprofile'): string => join(home, name);

/** Launch the built app (`out/`) with an isolated profiles/config folder (FASTCLIENT_HOME). */
export async function launch(
  opts: { home?: string; dialogResponses?: (string | null)[]; args?: string[] } = {},
): Promise<Launched> {
  const home = opts.home ?? tempHome();
  const env: Record<string, string> = { ...(process.env as Record<string, string>), FASTCLIENT_HOME: home };
  delete env.ELECTRON_RENDERER_URL;
  delete env.ELECTRON_RUN_AS_NODE;
  if (opts.dialogResponses) env.FASTCLIENT_TEST_DIALOG_RESPONSES = JSON.stringify(opts.dialogResponses);
  const app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), ...(opts.args ?? [])],
    env,
  });
  const page = await app.firstWindow();
  await page.waitForSelector('[data-app-ready]');
  return { app, page, home };
}

/** Close through the normal close flow (doc 04 §7) and wait for the process to exit. */
export async function closeApp(app: ElectronApplication): Promise<void> {
  const closed = new Promise<void>((r) => app.process().once('exit', () => r()));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  await closed;
}

export function readProfileFile(path: string): Profile {
  return JSON.parse(readFileSync(path, 'utf8')) as Profile;
}

export function writeProfileFile(path: string, profile: Profile): void {
  writeFileSync(path, JSON.stringify(profile, null, 2));
}

export function writeSettings(home: string, patch: Partial<AppSettings>): void {
  writeFileSync(join(home, 'fastclient.settings.json'), JSON.stringify(patch, null, 2));
}

export function readSettings(home: string): AppSettings {
  return JSON.parse(readFileSync(join(home, 'fastclient.settings.json'), 'utf8')) as AppSettings;
}

/** File "version": content + mtime, to detect whether a save reached the disk. */
export function snapshotFile(path: string): string {
  if (!existsSync(path)) return '';
  return `${statSync(path).mtimeMs}:${readFileSync(path, 'utf8')}`;
}

export async function expectFileChanged(path: string, before: string): Promise<void> {
  await expect.poll(() => snapshotFile(path), { timeout: 5000 }).not.toBe(before);
}

export async function sendMenuCommand(app: ElectronApplication, cmd: MenuCommand): Promise<void> {
  await app.evaluate(({ BrowserWindow }, c) => BrowserWindow.getAllWindows()[0]?.webContents.send('menu:command', c), cmd);
}

/**
 * Press a key through the real input pipeline (webContents.sendInputEvent). Global shortcuts are
 * resolved in main's `before-input-event`, which Playwright's CDP keyboard does not reach.
 */
export async function pressNative(app: ElectronApplication, keyCode: string, modifiers: ('control' | 'shift')[] = ['control']): Promise<void> {
  await app.evaluate(({ BrowserWindow }, { keyCode, modifiers }) => {
    const wc = BrowserWindow.getAllWindows()[0]?.webContents;
    wc?.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    wc?.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
  }, { keyCode, modifiers });
}
