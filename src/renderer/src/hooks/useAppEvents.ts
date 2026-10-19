import { useEffect } from 'react';
import type { MenuCommand } from '@shared/types';
import { fileNew, fileOpen, fileRelocate, fileReveal } from '../actions/file-actions';
import { useProfileStore } from '../store/profile-store';
import { useUiStore } from '../store/ui-store';

const SYNC_DEBOUNCE_MS = 300;

function modalOpen(): boolean {
  const ui = useUiStore.getState();
  return ui.dialog !== null || ui.preferencesOpen;
}

function runMenuCommand(cmd: MenuCommand): void {
  if (modalOpen()) return;
  switch (cmd) {
    case 'file:new':
      void fileNew();
      break;
    case 'file:open':
      void fileOpen();
      break;
    case 'file:relocate':
      void fileRelocate();
      break;
    case 'file:reveal':
      void fileReveal();
      break;
    case 'profile:save':
      void useProfileStore.getState().save('manual');
      break;
    case 'settings:preferences':
      useUiStore.getState().setPreferencesOpen(true);
      break;
  }
}

/** Main-process events, profile:sync and theme application. */
export function useAppEvents(): void {
  // profile:sync — in-memory copy in main, debounced (doc 02). Never writes to disk.
  useEffect(() => {
    let timer: number | undefined;
    const unsub = useProfileStore.subscribe((s, prev) => {
      if (s.profile === prev.profile || !s.profile) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const p = useProfileStore.getState().profile;
        if (p) window.api.send('profile:sync', p);
      }, SYNC_DEBOUNCE_MS);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  useEffect(() => {
    const offs = [
      // Doc 04 §7: the renderer answers with its final snapshot.
      window.api.on('app:before-close', () => {
        const p = useProfileStore.getState().profile;
        if (p) void window.api.invoke('profile:save', { profile: p, reason: 'close' });
      }),
      window.api.on('menu:command', runMenuCommand),
      window.api.on('app:toast', (toast) => useUiStore.getState().pushToast(toast)),
      window.api.on('update:phase', (phase) => useUiStore.getState().setUpdatePhase(phase)),
      window.api.on('app:open-path', (path) => void fileOpen(path)),
      window.api.on('settings:changed', (s) => {
        const ui = useUiStore.getState();
        if (s.zoomFactor !== ui.settings.zoomFactor) ui.showZoomBadge(s.zoomFactor);
        ui.setSettings(s);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Theme: data-theme on <html>; "system" follows prefers-color-scheme.
  const theme = useUiStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const effective = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = effective;
      useUiStore.getState().setEffectiveTheme(effective);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
