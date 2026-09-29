import type { FileOpResult, NewRequestArgs, NewResolution, OpenRequestArgs, ToastAction, ToastMessage } from '@shared/types';
import { t } from '../i18n/es';
import { useProfileStore } from '../store/profile-store';
import { useResponseStore } from '../store/response-store';
import { useUiStore } from '../store/ui-store';

let busy = false;

/** Serialise file operations: a second Ctrl+N while a dialog is open is ignored. */
async function exclusive(fn: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } finally {
    busy = false;
  }
}

export function showToasts(toasts: readonly ToastMessage[]): void {
  const ui = useUiStore.getState();
  for (const toast of toasts) ui.pushToast(toast);
}

function applyOk(r: Extract<FileOpResult, { status: 'ok' }>): void {
  useResponseStore.getState().clear();
  useProfileStore.getState().loadSession(r.session);
  useUiStore.getState().setRecents(r.recents);
  showToasts(r.toasts);
}

async function askSaveFailed(message: string): Promise<boolean> {
  const v = await useUiStore.getState().ask({
    tone: 'danger',
    title: t.dialogs.saveFailedTitle,
    text: t.dialogs.saveFailedText(message),
    buttons: [
      { value: 'cancel', label: t.actions.cancel, variant: 'secondary' },
      { value: 'continue', label: t.dialogs.continueWithoutSaving, icon: 'warning', variant: 'danger' },
    ],
    cancelValue: 'cancel',
    primaryValue: 'cancel',
  });
  return v === 'continue';
}

async function askConflict(path: string, mode: 'menu' | 'startup'): Promise<NewResolution | 'cancel'> {
  return useUiStore.getState().ask<NewResolution | 'cancel'>({
    tone: 'question',
    title: t.dialogs.newConflictTitle,
    text: t.dialogs.newConflictText(path),
    buttons: [
      { value: 'relocate-existing', label: t.dialogs.relocateExisting, icon: 'drive_file_move', variant: 'primary' },
      { value: 'create-anyway', label: t.dialogs.createAnyway, icon: 'note_add', variant: 'danger' },
      mode === 'startup'
        ? { value: 'open-existing', label: t.dialogs.openExisting, icon: 'file_open', variant: 'ghost' }
        : { value: 'cancel', label: t.actions.cancel, variant: 'ghost' },
    ],
    cancelValue: mode === 'startup' ? 'open-existing' : 'cancel',
    primaryValue: 'relocate-existing',
  });
}

/** Archivo › Nuevo (doc 04 §5), also used at startup in "arranque" mode. */
export function fileNew(mode: 'menu' | 'startup' = 'menu', startupConflictPath?: string): Promise<void> {
  return exclusive(async () => {
    let args: NewRequestArgs = { profile: useProfileStore.getState().profile, mode };
    let conflict: string | null = startupConflictPath ?? null;
    for (;;) {
      if (conflict) {
        const choice = await askConflict(conflict, mode);
        if (choice === 'cancel') return;
        args = { ...args, resolution: choice, skipSave: true };
        conflict = null;
      }
      const r = await window.api.invoke('file:new', args);
      switch (r.status) {
        case 'ok':
          applyOk(r);
          return;
        case 'cancelled':
          showToasts(r.toasts);
          return;
        case 'error':
          showToasts(r.toasts);
          if (mode !== 'startup') return;
          conflict = startupConflictPath ?? null;
          if (!conflict) return;
          break;
        case 'save-failed':
          if (!(await askSaveFailed(r.message))) return;
          args = { ...args, skipSave: true };
          break;
        case 'conflict':
          conflict = r.existingPath;
          break;
      }
    }
  });
}

/** Archivo › Abrir (doc 04 §6). `path` opens a recent entry or an associated file directly. */
export function fileOpen(path?: string): Promise<void> {
  return exclusive(async () => {
    let args: OpenRequestArgs = { profile: useProfileStore.getState().profile, path };
    for (;;) {
      const r = await window.api.invoke('file:open', args);
      if (r.status === 'save-failed') {
        if (!(await askSaveFailed(r.message))) return;
        args = { ...args, skipSave: true };
        continue;
      }
      if (r.status === 'ok') applyOk(r);
      else if (r.status === 'cancelled' || r.status === 'error') showToasts(r.toasts);
      return;
    }
  });
}

/** Archivo › Reubicar (doc 04 §8): the working profile keeps its tabs and responses. */
export function fileRelocate(): Promise<void> {
  return exclusive(async () => {
    const { profile, version } = useProfileStore.getState();
    if (!profile) return;
    const r = await window.api.invoke('file:relocate', { profile });
    if (r.status === 'ok') {
      useProfileStore.setState((s) => {
        const dirty: Record<string, number> = {};
        for (const [id, v] of Object.entries(s.dirtyRequests)) if (v > version) dirty[id] = v;
        return {
          profilePath: r.session.profilePath,
          profile: s.profile ? { ...s.profile, name: r.session.profile.name } : s.profile,
          savedVersion: Math.max(s.savedVersion, version),
          dirtyRequests: dirty,
        };
      });
      useUiStore.getState().setRecents(r.recents);
      showToasts(r.toasts);
    } else if (r.status === 'cancelled' || r.status === 'error') {
      showToasts(r.toasts);
    }
  });
}

export async function fileReveal(): Promise<void> {
  await window.api.invoke('file:reveal');
}

export async function removeRecent(path: string): Promise<void> {
  useUiStore.getState().setRecents(await window.api.invoke('file:remove-recent', path));
}

export function runToastCommand(cmd: ToastAction): void {
  switch (cmd) {
    case 'retry-save':
      void useProfileStore.getState().save('manual');
      break;
    case 'reveal':
      void fileReveal();
      break;
    case 'relocate':
      void fileRelocate();
      break;
    case 'import-curl':
      break;
    case 'install-update':
      void window.api.invoke('update:install');
      break;
  }
}
