import { useEffect } from 'react';
import { cancelRequest, isLoading, sendRequest } from '../actions/request-actions';
import { deleteSelected, renameSelected } from '../actions/tree-actions';
import { useProfileStore } from '../store/profile-store';
import { useUiStore } from '../store/ui-store';

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

function blocked(): boolean {
  const ui = useUiStore.getState();
  return ui.dialog !== null || ui.preferencesOpen || ui.contextMenu !== null || ui.openMenu !== null;
}

/** Renderer-side shortcuts (doc 05). File/zoom/preferences accelerators live in the hidden native menu. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (blocked() || e.defaultPrevented) return;
      const s = useProfileStore.getState();
      const ui = useUiStore.getState();
      const ws = s.profile?.workspace;
      const active = ws?.activeTabId ?? null;
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;
      let handled = true;

      if (ctrl && key === 'enter') {
        if (active) void sendRequest(active);
      } else if (e.key === 'Escape' && !e.ctrlKey && active && isLoading(active)) {
        cancelRequest(active);
      } else if (ctrl && !e.shiftKey && key === 't') {
        void s.createRequest();
      } else if (ctrl && !e.shiftKey && key === 'w') {
        if (active) s.closeTabs([active]);
      } else if (ctrl && e.key === 'Tab') {
        const tabs = ws?.openTabs ?? [];
        if (tabs.length > 1 && active) {
          const i = tabs.indexOf(active);
          const next = tabs[(i + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length];
          if (next) s.setActiveTab(next);
        }
      } else if (ctrl && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        const tabs = ws?.openTabs ?? [];
        const target = e.key === '9' ? tabs[tabs.length - 1] : tabs[Number(e.key) - 1];
        if (target) s.setActiveTab(target);
      } else if (ctrl && !e.shiftKey && key === 'l') {
        const url = document.querySelector<HTMLInputElement>('[data-url-input]');
        url?.focus();
        url?.select();
      } else if (ctrl && !e.shiftKey && key === 'b') {
        ui.toggleSidebar();
      } else if (ctrl && !e.shiftKey && key === 'k') {
        const search = document.querySelector<HTMLInputElement>('input[aria-label="Buscar"]');
        if (search) {
          search.focus();
          search.select();
        } else {
          ui.requestSearchFocus(); // sidebar collapsed: it opens and focuses on mount
        }
      } else if (e.key === 'F2' && !isEditable(document.activeElement)) {
        renameSelected();
      } else if (e.key === 'Delete' && !isEditable(document.activeElement) && !document.activeElement?.closest('.cm-editor')) {
        deleteSelected();
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
