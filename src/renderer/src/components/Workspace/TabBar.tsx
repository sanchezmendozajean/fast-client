import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from './restrict-axis';
import { horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Id } from '@shared/types';
import { t } from '../../i18n/es';
import { EMPTY_IDS, findRequest, useProfileStore } from '../../store/profile-store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { IconButton } from '../common/Button';
import { InlineRename } from '../common/InlineRename';
import type { MenuEntry } from '../common/Menu';
import { MethodBadge } from '../common/MethodBadge';
import styles from './TabBar.module.css';

function tabMenu(id: Id): MenuEntry[] {
  const s = useProfileStore.getState();
  const tabs = s.profile?.workspace.openTabs ?? [];
  const idx = tabs.indexOf(id);
  return [
    { type: 'item', id: 'close', label: t.ctx.close, icon: 'close', shortcut: 'Ctrl+W', onSelect: () => s.closeTabs([id]) },
    {
      type: 'item',
      id: 'others',
      label: t.ctx.closeOthers,
      icon: 'tab_close',
      disabled: tabs.length < 2,
      onSelect: () => s.closeTabs(tabs.filter((x) => x !== id)),
    },
    {
      type: 'item',
      id: 'right',
      label: t.ctx.closeRight,
      icon: 'tab_close_right',
      disabled: idx === tabs.length - 1,
      onSelect: () => s.closeTabs(tabs.slice(idx + 1)),
    },
    { type: 'item', id: 'all', label: t.ctx.closeAll, icon: 'cancel', onSelect: () => s.closeTabs(tabs) },
    { type: 'separator' },
    { type: 'item', id: 'rename', label: t.ctx.rename, icon: 'edit', onSelect: () => s.startRename(id, 'tab') },
    { type: 'item', id: 'dup', label: t.ctx.duplicate, icon: 'content_copy', onSelect: () => void s.duplicateRequest(id) },
    { type: 'item', id: 'tree', label: t.ctx.showInTree, icon: 'account_tree', onSelect: () => s.revealInTree(id) },
  ];
}

function Tab({ id, active }: { id: Id; active: boolean }): JSX.Element | null {
  const req = useProfileStore((s) => findRequest(s.profile, id)?.request);
  const dirty = useProfileStore((s) => id in s.dirtyRequests);
  const renaming = useProfileStore((s) => s.renaming === id && s.renamingIn === 'tab');
  const showMenu = useUiStore((s) => s.showContextMenu);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: renaming });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  if (!req) return null;
  const s = useProfileStore.getState;
  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        ref.current = el;
      }}
      {...attributes}
      {...listeners}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      data-tab-id={id}
      className={`${styles.tab} ${active ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: DndCSS.Translate.toString(transform), transition }}
      onMouseDown={(e) => {
        if (e.button === 1) e.preventDefault();
      }}
      onAuxClick={(e) => {
        if (e.button === 1) s().closeTabs([id]);
      }}
      onClick={() => s().setActiveTab(id)}
      onContextMenu={(e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, tabMenu(id));
      }}
      data-tooltip={req.url || undefined}
    >
      <MethodBadge method={req.method} />
      {renaming ? (
        <InlineRename value={req.name} onCommit={(n) => void s().renameRequest(id, n)} onCancel={() => s().stopRename()} />
      ) : (
        <span className={styles.name} onDoubleClick={() => s().startRename(id, 'tab')}>
          {req.name}
        </span>
      )}
      <span className={styles.end}>
        {dirty && <span className={styles.dot} aria-label={t.titlebar.unsaved} role="img" />}
        <button
          type="button"
          className={`${styles.close} ${dirty ? styles.closeOnHover : ''}`}
          aria-label={t.tabs.close}
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            s().closeTabs([id]);
          }}
        >
          <Icon name="close" size={15} />
        </button>
      </span>
    </div>
  );
}

export function TabBar(): JSX.Element {
  const tabs = useProfileStore((s) => s.profile?.workspace.openTabs ?? EMPTY_IDS);
  const active = useProfileStore((s) => s.profile?.workspace.activeTabId ?? null);
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = (): void => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 0, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  };
  useLayoutEffect(updateEdges, [tabs.length]);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDragEnd = (e: DragEndEvent): void => {
    if (!e.over || e.active.id === e.over.id) return;
    useProfileStore.getState().moveTab(String(e.active.id), tabs.indexOf(String(e.over.id)));
  };

  return (
    <div className={styles.bar}>
      {collapsed && (
        <IconButton
          icon="left_panel_open"
          label={t.sidebar.expand}
          tone="faint"
          className={styles.expand}
          onClick={toggleSidebar}
        />
      )}
      <div
        ref={scroller}
        className={`${styles.scroller} ${edges.left ? styles.shadowLeft : ''} ${edges.right ? styles.shadowRight : ''}`}
        role="tablist"
        onScroll={updateEdges}
        onWheel={(e) => {
          if (scroller.current && e.deltaY !== 0 && e.deltaX === 0) scroller.current.scrollLeft += e.deltaY;
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={onDragEnd}>
          <SortableContext items={[...tabs]} strategy={horizontalListSortingStrategy}>
            {tabs.map((id) => (
              <Tab key={id} id={id} active={id === active} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <IconButton
        icon="add"
        label={t.tabs.newRequest}
        tone="faint"
        className={styles.add}
        disabled={!hasProfile}
        onClick={() => void useProfileStore.getState().createRequest()}
      />
    </div>
  );
}
