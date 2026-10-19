import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { writeFile } from 'node:fs/promises';
import { stepZoom } from '../shared/settings-schema';
import type { EventChannels, InvokeChannel, InvokeChannels } from '../shared/ipc';
import type { AppSettings, InitResult, MenuCommand, Profile, ToastMessage } from '../shared/types';
import { buildAppMenu, handleAppShortcut } from './app-menu';
import { FileMenuService, type FileDialogs, type ShellLike } from './services/file-menu-service';
import { HttpService } from './services/http-service';
import { PathsService, resolvePaths } from './services/paths-service';
import { ProfileService } from './services/profile-service';
import { SettingsService } from './services/settings-service';
import { runStartup } from './services/startup';
import { UpdateService } from './services/update-service';
import { applyWindowChrome, createMainWindow } from './window';

const CLOSE_TIMEOUT_MS = 2000;
/** Let the window settle before the startup update check. */
const UPDATE_CHECK_DELAY_MS = 5000;

/** Injected by electron-vite from package.json (app.getVersion() is Electron's when run from out/). */
declare const __APP_VERSION__: string;

if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

let win: BrowserWindow | null = null;
let initResult: InitResult | null = null;
let quitting = false;
/** Set by "Reiniciar ahora": the close flow ends by installing the downloaded update. */
let restartForUpdate = false;
/** Resolved when the renderer delivers its final snapshot during close. */
let closeWaiter: (() => void) | null = null;

const paths = new PathsService(
  resolvePaths({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    documentsDir: app.getPath('documents'),
    userDataDir: app.getPath('userData'),
    env: process.env,
  }),
);
const settings = new SettingsService(paths.settingsPath());
const profiles = new ProfileService();
const http = new HttpService(() => settings.get().http);

function send<C extends keyof EventChannels>(channel: C, payload: EventChannels[C]): void {
  win?.webContents.send(channel, payload);
}

function toast(t: ToastMessage): void {
  send('app:toast', t);
}

/** Native dialogs, or scripted answers for e2e (FASTCLIENT_TEST_DIALOG_RESPONSES, JSON array). */
function makeDialogs(): FileDialogs {
  const scripted = process.env.FASTCLIENT_TEST_DIALOG_RESPONSES;
  if (scripted) {
    const queue = JSON.parse(scripted) as (string | null)[];
    const next = (): Promise<string | null> => Promise.resolve(queue.shift() ?? null);
    return { showSave: next, showOpen: next };
  }
  const filters = [
    { name: 'Perfil de Fast Client', extensions: ['fcprofile'] },
    { name: 'JSON', extensions: ['json'] },
  ];
  return {
    async showSave({ defaultPath }) {
      const r = await dialog.showSaveDialog(win!, { defaultPath, filters: filters.slice(0, 1) });
      return r.canceled || !r.filePath ? null : r.filePath;
    },
    async showOpen({ defaultPath }) {
      const r = await dialog.showOpenDialog(win!, { defaultPath, filters, properties: ['openFile'] });
      return r.canceled ? null : (r.filePaths[0] ?? null);
    },
  };
}

/** In e2e runs, record reveal calls instead of opening Explorer. */
const revealLog: string[] = [];
const shellImpl: ShellLike = process.env.FASTCLIENT_HOME
  ? {
      showItemInFolder: (p) => void revealLog.push(p),
      openPath: (p) => {
        revealLog.push(p);
        return Promise.resolve('');
      },
    }
  : { showItemInFolder: (p) => shell.showItemInFolder(p), openPath: (p) => shell.openPath(p) };
(globalThis as { __fastClientRevealLog?: string[] }).__fastClientRevealLog = revealLog;

const files = new FileMenuService({ paths, settings, profiles, dialogs: makeDialogs(), shell: shellImpl, toast });
const updates = new UpdateService({
  updater: autoUpdater,
  enabled: app.isPackaged && !process.env.FASTCLIENT_HOME,
  currentVersion: __APP_VERSION__,
  toast,
  onPhase: (phase) => send('update:phase', phase),
});

function profileArg(argv: string[]): string | undefined {
  return argv.slice(1).find((a) => a.toLowerCase().endsWith('.fcprofile') && !a.startsWith('-'));
}

function handle<C extends InvokeChannel>(
  channel: C,
  fn: (...args: InvokeChannels[C]['args']) => Promise<InvokeChannels[C]['result']> | InvokeChannels[C]['result'],
): void {
  ipcMain.handle(channel, (_e, ...args: unknown[]) => fn(...(args as InvokeChannels[C]['args'])));
}

function applySettingsEffects(s: AppSettings): void {
  if (!win) return;
  nativeTheme.themeSource = s.theme;
  win.webContents.setZoomFactor(s.zoomFactor);
  applyWindowChrome(win, s.theme, s.zoomFactor);
}

async function zoom(dir: 'in' | 'out' | 'reset'): Promise<number> {
  const f = stepZoom(settings.get().zoomFactor, dir);
  const s = await settings.update({ zoomFactor: f });
  applySettingsEffects(s);
  send('settings:changed', s);
  return f;
}

function registerIpc(): void {
  handle('app:init', () => initResult!);
  handle('profile:save', async ({ profile, reason }) => {
    const r = await profiles.save(profile, reason);
    if (reason === 'close') closeWaiter?.();
    if (r.ok && r.recreated) toast({ kind: 'info', text: 'El perfil se había eliminado y fue recreado' });
    return r;
  });
  handle('file:new', (a) => files.newProfile(a));
  handle('file:open', (a) => files.open(a));
  handle('file:relocate', ({ profile }) => files.relocate(profile));
  handle('file:reveal', () => files.reveal());
  handle('file:remove-recent', async (p) => {
    await settings.removeRecent(p);
    return files.recents();
  });
  handle('file:pick-attachment', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openFile'] });
    return r.canceled ? null : (r.filePaths[0] ?? null);
  });
  handle('settings:get', () => settings.get());
  handle('settings:update', async (patch) => {
    const s = await settings.update(patch);
    applySettingsEffects(s);
    send('settings:changed', s);
    return s;
  });
  handle('app:zoom', (dir) => zoom(dir));
  handle('window:toggle-maximize', () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  handle('app:quit', () => {
    win?.close();
  });
  handle('http:send', ({ requestId, resolved }) => http.send(requestId, resolved));
  handle('http:cancel', ({ requestId }) => http.cancel(requestId));
  handle('response:save', async ({ suggestedName, bytesBase64 }) => {
    const r = await dialog.showSaveDialog(win!, { defaultPath: suggestedName });
    if (r.canceled || !r.filePath) return false;
    await writeFile(r.filePath, Buffer.from(bytesBase64, 'base64'));
    return true;
  });

  handle('update:check', () => updates.check(true));
  handle('update:install', () => {
    if (!updates.isUpdateReady) return;
    restartForUpdate = true;
    win?.close();
  });

  ipcMain.on('profile:sync', (_e, p: Profile) => profiles.sync(p));
}

function menuCommand(cmd: MenuCommand): void {
  send('menu:command', cmd);
}

/** Doc 04 §7: ask the renderer for its final snapshot, fall back to the last sync after 2 s. */
async function closeGracefully(): Promise<void> {
  const w = win;
  if (!w) return;
  const finalSave = new Promise<void>((resolve) => {
    closeWaiter = resolve;
    setTimeout(resolve, CLOSE_TIMEOUT_MS);
  });
  const before = profiles.writeLog.length;
  send('app:before-close', null);
  await finalSave;
  closeWaiter = null;
  await profiles.flush();
  const savedByRenderer = profiles.writeLog.slice(before).includes('close');
  let ok = savedByRenderer;
  if (!ok) {
    const snap = profiles.getSnapshot();
    ok = !snap || (await profiles.save(snap, 'close')).ok;
  }
  while (!ok) {
    const choice = await dialog.showMessageBox(w, {
      type: 'error',
      title: 'Fast Client',
      message: 'No se pudo guardar el perfil',
      buttons: ['Reintentar', 'Reubicar…', 'Salir sin guardar'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    const snap = profiles.getSnapshot();
    if (choice.response === 2 || !snap) break;
    if (choice.response === 0) ok = (await profiles.save(snap, 'close')).ok;
    else ok = (await files.relocate(snap)).status === 'ok';
  }
  const bounds = w.getNormalBounds();
  settings.patchInMemory({
    window: { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y, maximized: w.isMaximized() },
  });
  await settings.save().catch(() => undefined);
  quitting = true;
  w.destroy();
  if (restartForUpdate) updates.installAndRestart();
  else app.quit();
}

async function start(): Promise<void> {
  await paths.ensure();
  const s = await settings.load();
  nativeTheme.themeSource = s.theme;
  initResult = {
    ...(await runStartup({ paths, settings, profiles, files }, profileArg(process.argv))),
    appVersion: __APP_VERSION__,
  };
  registerIpc();
  Menu.setApplicationMenu(buildAppMenu());

  win = createMainWindow(s);
  const w = win;
  const shortcuts = { command: menuCommand, zoom: (d: 'in' | 'out' | 'reset') => void zoom(d), quit: () => w.close() };
  w.webContents.on('before-input-event', (e, input) => {
    if (handleAppShortcut(input, shortcuts)) e.preventDefault();
  });
  let readyToShow = false;
  let rendered = false;
  const maybeShow = (): void => {
    if (!readyToShow || !rendered || w.isVisible()) return;
    if (s.window.maximized) w.maximize();
    w.show();
  };
  w.once('ready-to-show', () => {
    readyToShow = true;
    w.webContents.setZoomFactor(s.zoomFactor);
    maybeShow();
  });
  ipcMain.on('app:rendered', () => {
    rendered = true;
    maybeShow();
  });
  setTimeout(() => {
    rendered = true;
    maybeShow();
  }, 3000);
  setTimeout(() => {
    if (settings.get().checkForUpdates) void updates.check(false);
  }, UPDATE_CHECK_DELAY_MS);

  nativeTheme.on('updated', () => {
    const cur = settings.get();
    if (cur.theme === 'system') applyWindowChrome(w, cur.theme, cur.zoomFactor);
  });

  w.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    void closeGracefully();
  });
  w.on('session-end', () => {
    try {
      profiles.saveSnapshotSync();
      settings.saveSync();
    } catch {
      /* nothing else can be done during shutdown */
    }
  });
}

app.on('second-instance', (_e, argv) => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
  const p = profileArg(argv);
  if (p) send('app:open-path', p);
});

app.on('window-all-closed', () => app.quit());

void app.whenReady().then(start);
