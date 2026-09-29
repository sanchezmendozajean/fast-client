import type { Id } from '@shared/types';
import { t } from '../i18n/es';
import { findRequest, useProfileStore } from '../store/profile-store';
import { useUiStore } from '../store/ui-store';

async function confirmDelete(title: string, text: string): Promise<boolean> {
  const v = await useUiStore.getState().ask({
    tone: 'danger',
    title,
    text,
    buttons: [
      { value: 'cancel', label: t.actions.cancel, variant: 'secondary' },
      { value: 'delete', label: t.actions.delete, icon: 'delete', variant: 'danger' },
    ],
    cancelValue: 'cancel',
    primaryValue: 'cancel',
  });
  return v === 'delete';
}

export async function deleteCollectionWithConfirm(id: Id): Promise<void> {
  const col = useProfileStore.getState().profile?.collections.find((c) => c.id === id);
  if (!col) return;
  if (await confirmDelete(t.dialogs.deleteCollectionTitle(col.name), t.dialogs.deleteCollectionText(col.requests.length))) {
    await useProfileStore.getState().deleteCollection(id);
  }
}

export async function deleteRequestWithConfirm(id: Id): Promise<void> {
  const loc = findRequest(useProfileStore.getState().profile, id);
  if (!loc) return;
  if (await confirmDelete(t.dialogs.deleteRequestTitle(loc.request.name), t.dialogs.deleteRequestText)) {
    await useProfileStore.getState().deleteRequest(id);
  }
}

/** Supr / F2 act on the sidebar selection. */
export function deleteSelected(): void {
  const sel = useProfileStore.getState().selection;
  if (!sel) return;
  if (sel.kind === 'collection') void deleteCollectionWithConfirm(sel.id);
  else void deleteRequestWithConfirm(sel.id);
}

export function renameSelected(): void {
  const s = useProfileStore.getState();
  if (s.selection) s.startRename(s.selection.id);
}
