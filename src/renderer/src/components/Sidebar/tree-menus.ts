import type { Id } from '@shared/types';
import { copyAsCurl } from '../../actions/request-actions';
import { deleteCollectionWithConfirm, deleteRequestWithConfirm } from '../../actions/tree-actions';
import { t } from '../../i18n/es';
import { findRequest, useProfileStore } from '../../store/profile-store';
import type { MenuEntry } from '../common/Menu';

export function collectionMenu(id: Id, openVariables: (id: Id) => void): MenuEntry[] {
  const s = useProfileStore.getState();
  return [
    { type: 'item', id: 'new', label: t.ctx.newRequest, icon: 'add', shortcut: 'Ctrl+T', onSelect: () => void s.createRequest(id) },
    { type: 'item', id: 'rename', label: t.ctx.rename, icon: 'edit', shortcut: 'F2', onSelect: () => s.startRename(id) },
    { type: 'item', id: 'dup', label: t.ctx.duplicate, icon: 'content_copy', onSelect: () => void s.duplicateCollection(id) },
    { type: 'item', id: 'vars', label: t.ctx.variables, icon: 'data_object', onSelect: () => openVariables(id) },
    { type: 'separator' },
    {
      type: 'item',
      id: 'del',
      label: t.ctx.delete,
      icon: 'delete',
      shortcut: 'Supr',
      danger: true,
      onSelect: () => void deleteCollectionWithConfirm(id),
    },
  ];
}

export function requestMenu(id: Id): MenuEntry[] {
  const s = useProfileStore.getState();
  const loc = findRequest(s.profile, id);
  const targets: MenuEntry[] = (s.profile?.collections ?? []).map((c) => ({
    type: 'item',
    id: `move:${c.id}`,
    label: c.name,
    icon: 'folder',
    disabled: c.id === loc?.collection.id,
    onSelect: () => s.moveRequest(id, c.id, c.requests.length),
  }));
  return [
    { type: 'item', id: 'open', label: t.ctx.open, icon: 'open_in_new', onSelect: () => s.openTab(id) },
    { type: 'item', id: 'rename', label: t.ctx.rename, icon: 'edit', shortcut: 'F2', onSelect: () => s.startRename(id) },
    { type: 'item', id: 'dup', label: t.ctx.duplicate, icon: 'content_copy', onSelect: () => void s.duplicateRequest(id) },
    { type: 'item', id: 'curl', label: t.ctx.copyCurl, icon: 'terminal', onSelect: () => void copyAsCurl(id) },
    { type: 'item', id: 'move', label: t.ctx.moveTo, icon: 'drive_file_move', submenu: targets },
    { type: 'separator' },
    {
      type: 'item',
      id: 'del',
      label: t.ctx.delete,
      icon: 'delete',
      shortcut: 'Supr',
      danger: true,
      onSelect: () => void deleteRequestWithConfirm(id),
    },
  ];
}
