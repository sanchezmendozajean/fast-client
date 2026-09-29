import { useEffect, useState } from 'react';
import { fileNew, showToasts } from './actions/file-actions';
import { ContextMenuHost } from './components/common/ContextMenuHost';
import { TooltipLayer } from './components/common/TooltipLayer';
import { DialogHost } from './components/Dialog/DialogHost';
import { PreferencesModal } from './components/Preferences/PreferencesModal';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TitleBar } from './components/TitleBar/TitleBar';
import { ToastStack } from './components/Toast/ToastStack';
import { Workspace } from './components/Workspace/Workspace';
import { useAppEvents } from './hooks/useAppEvents';
import { useShortcuts } from './hooks/useShortcuts';
import { useProfileStore } from './store/profile-store';
import { useUiStore } from './store/ui-store';
import styles from './App.module.css';

export function App(): JSX.Element {
  const [ready, setReady] = useState(false);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  useAppEvents();
  useShortcuts();

  useEffect(() => {
    let cancelled = false;
    void window.api.invoke('app:init').then((init) => {
      if (cancelled) return;
      const ui = useUiStore.getState();
      ui.setSettings(init.settings);
      ui.setRecents(init.recents);
      ui.setMeta({ profilesDir: init.profilesDir, appVersion: init.appVersion });
      useProfileStore.getState().loadSession(init.session);
      setReady(true);
      showToasts(init.toasts);
      // Doc 04 §4: the dialog appears over the already visible (empty) workspace.
      if (init.startupConflictPath) void fileNew('startup', init.startupConflictPath);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) requestAnimationFrame(() => window.api.send('app:rendered', null));
  }, [ready]);

  return (
    <div className={styles.app} data-app-ready={ready || undefined}>
      <TitleBar />
      <div className={styles.main}>
        {!collapsed && <Sidebar />}
        <Workspace />
      </div>
      <PreferencesModal />
      <DialogHost />
      <ContextMenuHost />
      <ToastStack />
      <TooltipLayer />
    </div>
  );
}
