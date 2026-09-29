import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThemeSetting } from '@shared/types';
import { fileNew, fileOpen, fileRelocate, fileReveal, removeRecent } from '../../actions/file-actions';
import { t } from '../../i18n/es';
import { formatZoom } from '../../lib/format';
import { selectIsDirty, useProfileStore } from '../../store/profile-store';
import { useUiStore, type MenuName } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { FloatingMenu, type MenuEntry } from '../common/Menu';
import styles from './TitleBar.module.css';

const MENUS: MenuName[] = ['file', 'settings'];

async function setTheme(theme: ThemeSetting): Promise<void> {
  useUiStore.getState().setSettings(await window.api.invoke('settings:update', { theme }));
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

function useFileEntries(): MenuEntry[] {
  const recents = useUiStore((s) => s.recents);
  const recentEntries: MenuEntry[] = recents.length
    ? recents.map((r) => ({
        type: 'item',
        id: `recent:${r.path}`,
        label: basename(r.path),
        title: r.path,
        icon: 'description',
        disabled: !r.exists,
        onSelect: () => void fileOpen(r.path),
        onRemove: r.exists ? undefined : () => void removeRecent(r.path),
        removeLabel: t.menu.removeRecent,
      }))
    : [{ type: 'item', id: 'recent:none', label: t.menu.noRecents, disabled: true }];
  return [
    { type: 'item', id: 'new', label: t.menu.new, icon: 'note_add', shortcut: 'Ctrl+N', onSelect: () => void fileNew() },
    { type: 'item', id: 'open', label: t.menu.open, icon: 'file_open', shortcut: 'Ctrl+O', onSelect: () => void fileOpen() },
    { type: 'item', id: 'recent', label: t.menu.openRecent, icon: 'history', submenu: recentEntries },
    {
      type: 'item',
      id: 'relocate',
      label: t.menu.relocate,
      icon: 'drive_file_move',
      shortcut: 'Ctrl+Shift+S',
      onSelect: () => void fileRelocate(),
    },
    {
      type: 'item',
      id: 'reveal',
      label: t.menu.reveal,
      icon: 'folder_open',
      shortcut: 'Ctrl+Shift+E',
      onSelect: () => void fileReveal(),
    },
    { type: 'separator' },
    {
      type: 'item',
      id: 'quit',
      label: t.menu.quit,
      icon: 'logout',
      shortcut: 'Ctrl+Q',
      onSelect: () => void window.api.invoke('app:quit'),
    },
  ];
}

function useSettingsEntries(): MenuEntry[] {
  const theme = useUiStore((s) => s.settings.theme);
  const themeItem = (value: ThemeSetting, label: string, icon: string): MenuEntry => ({
    type: 'item',
    id: `theme:${value}`,
    label,
    icon,
    checked: theme === value,
    onSelect: () => void setTheme(value),
  });
  return [
    {
      type: 'item',
      id: 'zoom-in',
      label: t.menu.zoomIn,
      icon: 'zoom_in',
      shortcut: 'Ctrl+=',
      onSelect: () => void window.api.invoke('app:zoom', 'in'),
    },
    {
      type: 'item',
      id: 'zoom-out',
      label: t.menu.zoomOut,
      icon: 'zoom_out',
      shortcut: 'Ctrl+-',
      onSelect: () => void window.api.invoke('app:zoom', 'out'),
    },
    { type: 'separator' },
    themeItem('dark', t.menu.themeDark, 'dark_mode'),
    themeItem('light', t.menu.themeLight, 'light_mode'),
    themeItem('system', t.menu.themeSystem, 'contrast'),
    { type: 'separator' },
    {
      type: 'item',
      id: 'prefs',
      label: t.menu.preferences,
      icon: 'settings_applications',
      shortcut: 'Ctrl+,',
      onSelect: () => useUiStore.getState().setPreferencesOpen(true),
    },
  ];
}

export function TitleBar(): JSX.Element {
  const openMenu = useUiStore((s) => s.openMenu);
  const setOpenMenu = useUiStore((s) => s.setOpenMenu);
  const profilePath = useProfileStore((s) => s.profilePath);
  const dirty = useProfileStore(selectIsDirty);
  const fileRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const refs = { file: fileRef, settings: settingsRef };
  const fileEntries = useFileEntries();
  const settingsEntries = useSettingsEntries();

  const close = useCallback(() => setOpenMenu(null), [setOpenMenu]);
  const navigate = useCallback(
    (dir: 'prev' | 'next') => {
      const cur = useUiStore.getState().openMenu;
      const i = cur ? MENUS.indexOf(cur) : 0;
      setOpenMenu(MENUS[(i + (dir === 'next' ? 1 : -1) + MENUS.length) % MENUS.length] ?? null);
    },
    [setOpenMenu],
  );

  // Mnemonics: Alt+A (Archivo), Alt+J (Ajustes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.altKey || e.ctrlKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'j') {
        e.preventDefault();
        setOpenMenu(k === 'a' ? 'file' : 'settings');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpenMenu]);

  const anchor = openMenu ? refs[openMenu].current?.getBoundingClientRect() : undefined;
  const ignore = [fileRef, settingsRef];

  const menuButton = (name: MenuName, icon: string, label: string): JSX.Element => (
    <button
      ref={refs[name]}
      type="button"
      className={`${styles.menuBtn} ${openMenu === name ? styles.open : ''}`}
      aria-haspopup="menu"
      aria-expanded={openMenu === name}
      onMouseDown={(e) => {
        e.preventDefault();
        setOpenMenu(openMenu === name ? null : name);
      }}
      onMouseEnter={() => {
        if (openMenu && openMenu !== name) setOpenMenu(name);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpenMenu(name);
        }
      }}
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <Icon name="bolt" size={18} fill className={styles.logo} />
        <span className={styles.brandName}>{t.app.name}</span>
      </div>
      {menuButton('file', 'description', t.menu.file)}
      {menuButton('settings', 'settings', t.menu.settings)}

      {profilePath && (
        <div
          className={styles.profile}
          data-tooltip={t.titlebar.pathTooltip(profilePath)}
          onDoubleClick={() => void fileReveal()}
        >
          <span className={styles.profileName}>{basename(profilePath)}</span>
          {dirty && <span className={styles.dirty} aria-label={t.titlebar.unsaved} role="img" />}
        </div>
      )}

      {openMenu && anchor && (
        <FloatingMenu
          key={openMenu}
          entries={openMenu === 'file' ? fileEntries : settingsEntries}
          x={anchor.left}
          y={anchor.bottom + 4}
          onClose={close}
          onNavigate={navigate}
          ignoreRefs={ignore}
          label={openMenu === 'file' ? t.menu.file : t.menu.settings}
        />
      )}
      <ZoomBadge />
    </header>
  );
}

function ZoomBadge(): JSX.Element | null {
  const badge = useUiStore((s) => s.zoomBadge);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!badge) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 1000);
    return () => window.clearTimeout(id);
  }, [badge]);
  if (!badge || !visible) return null;
  return <div className={styles.zoomBadge}>{formatZoom(badge.value)}</div>;
}
