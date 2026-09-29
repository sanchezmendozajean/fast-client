import { useEffect, useRef, useState } from 'react';
import type { Id } from '@shared/types';
import { t } from '../../i18n/es';
import { resetSize, saveIfResized, useProfileStore } from '../../store/profile-store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { Button, IconButton } from '../common/Button';
import { CollectionTree } from './CollectionTree';
import { VariablesDialog } from './VariablesDialog';
import styles from './Sidebar.module.css';

/** Last focus request already honoured, so remounting the sidebar does not steal focus. */
let handledSearchNonce = 0;

function SearchBox(): JSX.Element {
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const nonce = useUiStore((s) => s.searchFocusNonce);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (nonce > handledSearchNonce) {
      handledSearchNonce = nonce;
      ref.current?.focus();
      ref.current?.select();
    }
  }, [nonce]);
  return (
    <label className={styles.search}>
      <Icon name="search" size={16} />
      <input
        ref={ref}
        className={styles.searchInput}
        value={search}
        placeholder={t.sidebar.search}
        spellCheck={false}
        aria-label={t.sidebar.search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && search) {
            e.preventDefault();
            e.stopPropagation();
            setSearch('');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.querySelector<HTMLElement>('[role="tree"] [role="treeitem"][tabindex="0"]')?.focus();
          }
        }}
      />
      {search ? (
        <button type="button" className={styles.clear} aria-label="Limpiar búsqueda" onClick={() => setSearch('')}>
          <Icon name="close" size={14} />
        </button>
      ) : (
        <kbd className={styles.kbd}>Ctrl K</kbd>
      )}
    </label>
  );
}

function ResizeHandle(): JSX.Element {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = useProfileStore.getState().profile?.workspace.sidebarWidth ?? 280;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent): void => useProfileStore.getState().setSidebarWidth(startW + ev.clientX - startX);
    const up = (): void => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      saveIfResized(startW, useProfileStore.getState().profile?.workspace.sidebarWidth);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };
  return (
    <div
      className={styles.resize}
      role="separator"
      aria-orientation="vertical"
      aria-label={t.sidebar.resize}
      onPointerDown={onPointerDown}
      onDoubleClick={() =>
        resetSize(
          () => useProfileStore.getState().profile?.workspace.sidebarWidth,
          () => useProfileStore.getState().setSidebarWidth(280),
        )
      }
    />
  );
}

export function Sidebar(): JSX.Element {
  const width = useProfileStore((s) => s.profile?.workspace.sidebarWidth ?? 280);
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const empty = useProfileStore((s) => (s.profile?.collections.length ?? 0) === 0);
  const createCollection = useProfileStore((s) => s.createCollection);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [varsFor, setVarsFor] = useState<Id | null>(null);

  return (
    <aside className={styles.sidebar} style={{ width }} aria-label={t.sidebar.collections}>
      <div className={styles.header}>
        <SearchBox />
        <IconButton
          icon="create_new_folder"
          label={t.sidebar.newCollection}
          box={32}
          onSurface1
          disabled={!hasProfile}
          onClick={() => void createCollection()}
        />
      </div>

      <div className={styles.sectionTitle}>{t.sidebar.collections}</div>

      <div className={styles.scroll}>
        {empty ? (
          <div className={styles.empty}>
            <Icon name="create_new_folder" size={32} className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>{t.sidebar.emptyTitle}</div>
            <div className={styles.emptyText}>{t.sidebar.emptyText}</div>
            <Button variant="secondary" icon="add" disabled={!hasProfile} onClick={() => void createCollection()}>
              {t.sidebar.emptyAction}
            </Button>
          </div>
        ) : (
          <CollectionTree onVariables={setVarsFor} />
        )}
      </div>

      <div className={styles.footer}>
        <IconButton icon="left_panel_close" label={t.sidebar.collapse} box={30} tone="faint" onSurface1 onClick={toggleSidebar} />
      </div>
      <ResizeHandle />
      {varsFor && <VariablesDialog collectionId={varsFor} onClose={() => setVarsFor(null)} />}
    </aside>
  );
}
