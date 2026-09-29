import { BrowserWindow, nativeTheme, screen, session } from 'electron';
import { join } from 'node:path';
import type { AppSettings, ThemeSetting } from '../shared/types';

const CHROME = {
  dark: { color: '#151820', symbolColor: '#8e97a7' },
  light: { color: '#f5f6f8', symbolColor: '#586170' },
} as const;

export const TITLEBAR_HEIGHT = 40;

export function effectiveTheme(theme: ThemeSetting): 'dark' | 'light' {
  if (theme === 'system') return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  return theme;
}

/** Overlay colours follow --surface-1 / --text-muted of the active theme (doc 02). */
export function applyWindowChrome(win: BrowserWindow, theme: ThemeSetting, zoom: number): void {
  const c = CHROME[effectiveTheme(theme)];
  win.setBackgroundColor(c.color);
  win.setTitleBarOverlay({ ...c, height: Math.round(TITLEBAR_HEIGHT * zoom) });
}

function visibleBounds(s: AppSettings['window']): { x?: number; y?: number } {
  if (s.x === undefined || s.y === undefined) return {};
  const onScreen = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return s.x! >= a.x - 50 && s.y! >= a.y - 50 && s.x! < a.x + a.width - 100 && s.y! < a.y + a.height - 100;
  });
  return onScreen ? { x: s.x, y: s.y } : {};
}

function isAllowedUrl(url: string): boolean {
  if (url.startsWith('file:') || url.startsWith('devtools:') || url.startsWith('data:')) return true;
  const dev = process.env.ELECTRON_RENDERER_URL;
  if (dev) {
    const origin = new URL(dev);
    try {
      const u = new URL(url);
      return u.hostname === origin.hostname && u.port === origin.port;
    } catch {
      return false;
    }
  }
  return false;
}

export function createMainWindow(settings: AppSettings): BrowserWindow {
  const c = CHROME[effectiveTheme(settings.theme)];
  const win = new BrowserWindow({
    width: settings.window.width,
    height: settings.window.height,
    ...visibleBounds(settings.window),
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: c.color,
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...c, height: Math.round(TITLEBAR_HEIGHT * settings.zoomFactor) },
    autoHideMenuBar: false,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.setMenuBarVisibility(false);

  // Zero network from the UI: anything that is not the app bundle (or the dev server) is blocked.
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => cb({ cancel: !isAllowedUrl(details.url) }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12' && process.env.ELECTRON_RENDERER_URL) {
      win.webContents.toggleDevTools();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    // Development only: surface renderer console errors in the terminal.
    win.webContents.on('console-message', (e) => {
      if (e.level === 'error' || e.level === 'warning') console.log(`[renderer:${e.level}] ${e.message}`);
    });
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}
