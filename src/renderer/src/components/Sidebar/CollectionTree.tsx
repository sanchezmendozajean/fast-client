import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { memo, useMemo, useRef, useState } from 'react';
import type { Collection, Id, RequestDef } from '@shared/types';
import { deleteCollectionWithConfirm, deleteRequestWithConfirm } from '../../actions/tree-actions';
import { t } from '../../i18n/es';
import { EMPTY_COLLECTIONS, useProfileStore } from '../../store/profile-store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { IconButton } from '../common/Button';
import { Highlight } from '../common/Highlight';
import { InlineRename } from '../common/InlineRename';
import { MethodBadge } from '../common/MethodBadge';
import { collectionMenu, requestMenu } from './tree-menus';
import styles from './CollectionTree.module.css';

type Node =
  | { kind: 'collection'; key: string; collection: Collection; count: number }
  | { kind: 'request'; key: string; request: RequestDef; collectionId: Id };

const cKey = (id: Id): string => `c:${id}`;
const rKey = (id: Id): string => `r:${id}`;

function matches(q: string, ...fields: string[]): boolean {
  return fields.some((f) => f.toLowerCase().includes(q));
}

/** Visible rows in order. With a search, collections auto-expand and non-matching rows are hidden. */
export function flattenTree(collections: readonly Collection[], query: string, draggingCollection: Id | null): Node[] {
  const q = query.trim().toLowerCase();
  const out: Node[] = [];
  for (const c of collections) {
    const colMatch = q !== '' && matches(q, c.name);
    const reqs = q === '' || colMatch ? c.requests : c.requests.filter((r) => matches(q, r.name, r.url));
    if (q !== '' && !colMatch && reqs.length === 0) continue;
    out.push({ kind: 'collection', key: cKey(c.id), collection: c, count: c.requests.length });
    const open = q !== '' || (c.expanded && draggingCollection !== c.id);
    if (open) for (const r of reqs) out.push({ kind: 'request', key: rKey(r.id), request: r, collectionId: c.id });
  }
  return out;
}

interface RowProps {
  node: Node;
  selected: boolean;
  tabbable: boolean;
  renaming: boolean;
  query: string;
  dndDisabled: boolean;
  onVariables: (id: Id) => void;
}

const Row = memo(function Row({ node, selected, tabbable, renaming, query, dndDisabled, onVariables }: RowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.key,
    disabled: dndDisabled || renaming,
  });
  const store = useProfileStore.getState;
  const showMenu = useUiStore((s) => s.showContextMenu);
  const style = { transform: DndCSS.Translate.toString(transform), transition };
  const common = {
    ref: setNodeRef,
    style,
    ...attributes,
    ...listeners,
    // dnd-kit sets aria-disabled while dragging is off (e.g. renaming); the row itself stays usable.
    'aria-disabled': undefined,
    'aria-roledescription': undefined,
    role: 'treeitem',
    tabIndex: tabbable ? 0 : -1,
    'aria-selected': selected,
    'data-tree-key': node.key,
  };

  if (node.kind === 'collection') {
    const c = node.collection;
    const expanded = query.trim() !== '' || c.expanded;
    return (
      <div
        {...common}
        aria-expanded={expanded}
        aria-level={1}
        className={`${styles.row} ${styles.collection} ${selected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
        onClick={() => {
          store().select({ kind: 'collection', id: c.id });
          store().toggleCollection(c.id);
        }}
        onDoubleClick={() => store().startRename(c.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          store().select({ kind: 'collection', id: c.id });
          showMenu(e.clientX, e.clientY, collectionMenu(c.id, onVariables));
        }}
      >
        <Icon name="chevron_right" size={18} className={`${styles.chevron} ${expanded ? styles.open : ''}`} />
        <Icon name={expanded ? 'folder_open' : 'folder'} size={16} className={styles.folder} />
        {renaming ? (
          <InlineRename
            value={c.name}
            onCommit={(n) => void store().renameCollection(c.id, n)}
            onCancel={() => store().stopRename()}
          />
        ) : (
          <span className={styles.colName}>
            <Highlight text={c.name} query={query} />
          </span>
        )}
        {!renaming && (
          <>
            <span className={styles.count}>{node.count}</span>
            <span className={styles.actions}>
              <IconButton
                icon="add"
                label={t.sidebar.newRequest}
                box={22}
                iconSize={16}
                onSurface1
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  void store().createRequest(c.id);
                }}
              />
              <IconButton
                icon="more_horiz"
                label={t.sidebar.more}
                box={22}
                iconSize={16}
                onSurface1
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  store().select({ kind: 'collection', id: c.id });
                  showMenu(r.left, r.bottom + 4, collectionMenu(c.id, onVariables));
                }}
              />
            </span>
          </>
        )}
      </div>
    );
  }

  const r = node.request;
  return (
    <div
      {...common}
      aria-level={2}
      className={`${styles.row} ${styles.request} ${selected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={() => store().openTab(r.id)}
      onDoubleClick={() => store().startRename(r.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        store().select({ kind: 'request', id: r.id });
        showMenu(e.clientX, e.clientY, requestMenu(r.id));
      }}
      title={r.url || undefined}
    >
      {selected && <span className={styles.accentBar} />}
      <MethodBadge method={r.method} fixed />
      {renaming ? (
        <InlineRename
          value={r.name}
          onCommit={(n) => void store().renameRequest(r.id, n)}
          onCancel={() => store().stopRename()}
        />
      ) : (
        <span className={styles.reqName}>
          <Highlight text={r.name} query={query} />
        </span>
      )}
    </div>
  );
});

export function CollectionTree({ onVariables }: { onVariables: (id: Id) => void }): JSX.Element {
  const collections = useProfileStore((s) => s.profile?.collections ?? EMPTY_COLLECTIONS);
  const selection = useProfileStore((s) => s.selection);
  const renaming = useProfileStore((s) => (s.renamingIn === 'tree' ? s.renaming : null));
  const query = useUiStore((s) => s.search);
  const [draggingCollection, setDraggingCollection] = useState<Id | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(
    () => flattenTree(collections, query, draggingCollection),
    [collections, query, draggingCollection],
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const dndDisabled = query.trim() !== '';
  const selectedKey = selection ? (selection.kind === 'collection' ? cKey(selection.id) : rKey(selection.id)) : null;
  const focusKey = selectedKey && nodes.some((n) => n.key === selectedKey) ? selectedKey : nodes[0]?.key;

  const onDragStart = (e: DragStartEvent): void => {
    const id = String(e.active.id);
    if (id.startsWith('c:')) setDraggingCollection(id.slice(2));
  };

  const onDragEnd = (e: DragEndEvent): void => {
    setDraggingCollection(null);
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over || active === over) return;
    const s = useProfileStore.getState();
    const cols = s.profile?.collections ?? [];
    const overNode = nodes.find((n) => n.key === over);
    if (!overNode) return;
    if (active.startsWith('c:')) {
      const targetCol = overNode.kind === 'collection' ? overNode.collection.id : overNode.collectionId;
      const to = cols.findIndex((c) => c.id === targetCol);
      if (to >= 0) s.moveCollection(active.slice(2), to);
      return;
    }
    const reqId = active.slice(2);
    if (overNode.kind === 'collection') {
      const c = overNode.collection;
      s.moveRequest(reqId, c.id, c.expanded ? 0 : c.requests.length);
    } else {
      const col = cols.find((c) => c.id === overNode.collectionId);
      const idx = col?.requests.findIndex((r) => r.id === overNode.request.id) ?? 0;
      s.moveRequest(reqId, overNode.collectionId, idx);
    }
  };

  const focusRow = (key: string | undefined): void => {
    if (!key) return;
    const node = nodes.find((n) => n.key === key);
    if (!node) return;
    const s = useProfileStore.getState();
    s.select(node.kind === 'collection' ? { kind: 'collection', id: node.collection.id } : { kind: 'request', id: node.request.id });
    requestAnimationFrame(() =>
      treeRef.current?.querySelector<HTMLElement>(`[data-tree-key="${CSS.escape(key)}"]`)?.focus(),
    );
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    // Leave Ctrl/Alt combinations (Ctrl+Enter = Send, Ctrl+Tab…) to the global shortcuts.
    if (renaming || e.ctrlKey || e.altKey || e.metaKey) return;
    const i = nodes.findIndex((n) => n.key === (selectedKey ?? focusKey));
    const node = nodes[i];
    const s = useProfileStore.getState();
    switch (e.key) {
      case 'ArrowDown':
        focusRow(nodes[Math.min(i + 1, nodes.length - 1)]?.key ?? nodes[0]?.key);
        break;
      case 'ArrowUp':
        focusRow(nodes[Math.max(i - 1, 0)]?.key);
        break;
      case 'Home':
        focusRow(nodes[0]?.key);
        break;
      case 'End':
        focusRow(nodes[nodes.length - 1]?.key);
        break;
      case 'ArrowRight':
        if (node?.kind === 'collection') {
          if (!node.collection.expanded) s.toggleCollection(node.collection.id, true);
          else focusRow(nodes[i + 1]?.kind === 'request' ? nodes[i + 1]?.key : undefined);
        }
        break;
      case 'ArrowLeft':
        if (node?.kind === 'collection' && node.collection.expanded) s.toggleCollection(node.collection.id, false);
        else if (node?.kind === 'request') focusRow(cKey(node.collectionId));
        break;
      case 'Enter':
        if (node?.kind === 'collection') s.toggleCollection(node.collection.id);
        else if (node) s.openTab(node.request.id);
        break;
      case 'F2':
        if (node) s.startRename(node.kind === 'collection' ? node.collection.id : node.request.id);
        break;
      case 'Delete':
        if (node?.kind === 'collection') void deleteCollectionWithConfirm(node.collection.id);
        else if (node) void deleteRequestWithConfirm(node.request.id);
        break;
      case 'ContextMenu': {
        if (!node) break;
        const el = treeRef.current?.querySelector<HTMLElement>(`[data-tree-key="${CSS.escape(node.key)}"]`);
        const r = el?.getBoundingClientRect();
        useUiStore
          .getState()
          .showContextMenu(
            (r?.left ?? 0) + 24,
            r?.bottom ?? 0,
            node.kind === 'collection' ? collectionMenu(node.collection.id, onVariables) : requestMenu(node.request.id),
          );
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  if (nodes.length === 0 && query.trim() !== '') {
    return <div className={styles.noResults}>{t.sidebar.noResults}</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDraggingCollection(null)}>
      <SortableContext items={nodes.map((n) => n.key)} strategy={verticalListSortingStrategy}>
        <div ref={treeRef} role="tree" aria-label={t.sidebar.collections} className={styles.tree} onKeyDown={onKeyDown}>
          {nodes.map((n, idx) => {
            const id = n.kind === 'collection' ? n.collection.id : n.request.id;
            return (
              <div key={n.key} className={n.kind === 'collection' && idx > 0 ? styles.gap : undefined}>
                <Row
                  node={n}
                  selected={n.key === selectedKey}
                  tabbable={n.key === focusKey}
                  renaming={renaming === id}
                  query={query}
                  dndDisabled={dndDisabled}
                  onVariables={onVariables}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
