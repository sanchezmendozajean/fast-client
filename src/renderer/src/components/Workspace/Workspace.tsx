import { useShallow } from 'zustand/react/shallow';
import { t } from '../../i18n/es';
import { findRequest, resetSize, saveIfResized, useProfileStore } from '../../store/profile-store';
import { Icon } from '../Icon/Icon';
import { RequestPanel } from '../RequestEditor/RequestPanel';
import { UrlBar } from '../RequestEditor/UrlBar';
import { ResponseViewer } from '../ResponseViewer/ResponseViewer';
import { TabBar } from './TabBar';
import styles from './Workspace.module.css';

function EmptyWorkspace(): JSX.Element {
  const shortcuts: [string, string][] = [
    ['Ctrl+T', t.tabs.shortcutNew],
    ['Ctrl+O', t.tabs.shortcutOpen],
    ['Ctrl+K', t.tabs.shortcutSearch],
    ['Ctrl+B', t.tabs.shortcutSidebar],
  ];
  return (
    <div className={styles.empty}>
      <Icon name="bolt" size={48} fill className={styles.emptyLogo} />
      <div className={styles.emptyTitle}>{t.tabs.emptyTitle}</div>
      <div className={styles.emptyText}>{t.tabs.emptyText}</div>
      <dl className={styles.shortcuts}>
        {shortcuts.map(([k, label]) => (
          <div key={k} className={styles.shortcut}>
            <dt>{label}</dt>
            <dd>
              <kbd className={styles.kbd}>{k}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Divider({ vertical }: { vertical: boolean }): JSX.Element {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startRatio = useProfileStore.getState().profile?.workspace.splitRatio;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent): void => {
      const ratio = vertical ? (ev.clientX - rect.left) / rect.width : (ev.clientY - rect.top) / rect.height;
      useProfileStore.getState().setSplitRatio(ratio);
    };
    const up = (): void => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      saveIfResized(startRatio, useProfileStore.getState().profile?.workspace.splitRatio);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };
  return (
    <div
      className={`${styles.divider} ${vertical ? styles.dividerV : styles.dividerH}`}
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      data-tooltip="Arrastra para redimensionar"
      onPointerDown={onPointerDown}
      onDoubleClick={() =>
        resetSize(
          () => useProfileStore.getState().profile?.workspace.splitRatio,
          () => useProfileStore.getState().setSplitRatio(0.5),
        )
      }
    >
      <span className={styles.line} />
      <span className={styles.grip} />
    </div>
  );
}

function ActiveRequest(): JSX.Element | null {
  const activeId = useProfileStore((s) => s.profile?.workspace.activeTabId ?? null);
  const loc = useProfileStore(useShallow((s) => findRequest(s.profile, activeId)));
  const ratio = useProfileStore((s) => s.profile?.workspace.splitRatio ?? 0.5);
  const orientation = useProfileStore((s) => s.profile?.workspace.splitOrientation ?? 'vertical');
  if (!loc) return <EmptyWorkspace />;
  const vertical = orientation === 'vertical';
  const { request, collection } = loc;
  return (
    <div className={styles.request} key={request.id}>
      <UrlBar request={request} collection={collection} />
      <div className={`${styles.split} ${vertical ? styles.splitV : styles.splitH}`}>
        <div className={`${styles.pane} ${vertical ? styles.reqPaneV : styles.reqPaneH}`} style={{ flex: `${ratio} 1 0` }}>
          <RequestPanel request={request} collection={collection} />
        </div>
        <Divider vertical={vertical} />
        <div className={`${styles.pane} ${vertical ? styles.resPaneV : styles.resPaneH}`} style={{ flex: `${1 - ratio} 1 0` }}>
          <ResponseViewer request={request} />
        </div>
      </div>
    </div>
  );
}

export function Workspace(): JSX.Element {
  return (
    <main className={styles.workspace}>
      <TabBar />
      <ActiveRequest />
    </main>
  );
}
