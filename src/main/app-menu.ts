import { Menu, type Input, type MenuItemConstructorOptions } from 'electron';
import type { MenuCommand } from '../shared/types';

export interface AppShortcutHandlers {
  command: (cmd: MenuCommand) => void;
  zoom: (dir: 'in' | 'out' | 'reset') => void;
  quit: () => void;
}

/**
 * Hidden native menu (doc 02): only edit roles (copy, paste, undo…).
 * The visible menus are drawn by the renderer.
 */
export function buildAppMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

/**
 * Global accelerators of the Archivo/Ajustes menus, matched in `before-input-event`
 * so they work with the native menu bar hidden. Returns true when the key was handled.
 */
export function handleAppShortcut(input: Input, h: AppShortcutHandlers): boolean {
  if (input.type !== 'keyDown' || !input.control || input.alt || input.meta) return false;
  const key = input.key.toLowerCase();
  const shift = input.shift;
  const run = (fn: () => void): boolean => {
    fn();
    return true;
  };
  if (!shift && key === 'n') return run(() => h.command('file:new'));
  if (!shift && key === 'o') return run(() => h.command('file:open'));
  if (shift && key === 's') return run(() => h.command('file:relocate'));
  if (shift && key === 'e') return run(() => h.command('file:reveal'));
  if (!shift && key === 's') return run(() => h.command('profile:save'));
  if (!shift && key === 'q') return run(h.quit);
  if (!shift && key === ',') return run(() => h.command('settings:preferences'));
  if (key === '=' || key === '+') return run(() => h.zoom('in'));
  if (key === '-' || key === '_') return run(() => h.zoom('out'));
  if (!shift && key === '0') return run(() => h.zoom('reset'));
  return false;
}
