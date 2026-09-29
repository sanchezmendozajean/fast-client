import type { Id } from '@shared/types';
import { t } from '../i18n/es';
import { parseCurl } from '../lib/curl';
import { toCurl } from '../lib/curl';
import { resolveRequest } from '../lib/resolve-request';
import { findRequest, useProfileStore } from '../store/profile-store';
import { useResponseStore } from '../store/response-store';
import { useUiStore } from '../store/ui-store';

let seq = 0;

/** Send (doc 06): saves the profile in parallel (moment #3) and runs the request in main. */
export async function sendRequest(id: Id): Promise<void> {
  const store = useProfileStore.getState();
  const loc = findRequest(store.profile, id);
  if (!loc) return;
  void store.save('send');

  const ui = useUiStore.getState();
  const responses = useResponseStore.getState();
  const mySeq = ++seq;
  const outcome = resolveRequest(loc.request, loc.collection, ui.settings.http, ui.appVersion);
  if (!outcome.ok) {
    responses.set(id, { status: 'error', code: 'INVALID_URL', message: outcome.message, totalMs: 0, seq: mySeq });
    return;
  }
  responses.set(id, { status: 'loading', startedAt: performance.now(), seq: mySeq });
  const res = await window.api.invoke('http:send', { requestId: id, resolved: outcome.resolved });
  if (useResponseStore.getState().responses[id]?.seq !== mySeq) return; // superseded by a newer send
  if (res.ok) {
    responses.set(id, { status: 'done', result: res, warnings: [...outcome.warnings, ...res.warnings], seq: mySeq });
  } else {
    responses.set(id, {
      status: 'error',
      code: res.error.code,
      message: res.error.message,
      detail: res.error.detail,
      totalMs: res.timingMs.total,
      seq: mySeq,
    });
  }
}

export function cancelRequest(id: Id): void {
  void window.api.invoke('http:cancel', { requestId: id });
}

export function isLoading(id: Id | null): boolean {
  return !!id && useResponseStore.getState().responses[id]?.status === 'loading';
}

export async function copyAsCurl(id: Id): Promise<void> {
  const loc = findRequest(useProfileStore.getState().profile, id);
  if (!loc) return;
  const ui = useUiStore.getState();
  const outcome = resolveRequest(loc.request, loc.collection, ui.settings.http, ui.appVersion);
  if (!outcome.ok) {
    ui.pushToast({ kind: 'error', text: outcome.message });
    return;
  }
  await navigator.clipboard.writeText(toCurl(outcome.resolved));
  ui.pushToast({ kind: 'success', text: t.editor.curlCopied });
}

/** Fill the request with a pasted cURL command. Returns false if the text is not cURL. */
export function importCurl(id: Id, text: string): boolean {
  const parsed = parseCurl(text);
  if (!parsed) return false;
  useProfileStore.getState().updateRequest(id, (r) => ({
    ...r,
    method: parsed.method,
    url: parsed.url,
    params: parsed.params,
    headers: parsed.headers,
    body: parsed.body,
    auth: parsed.auth,
    settings: parsed.followRedirects ? { ...r.settings, followRedirects: true } : r.settings,
  }));
  const ui = useUiStore.getState();
  ui.pushToast({ kind: 'success', text: t.editor.curlImported });
  if (parsed.insecure && ui.settings.http.verifyTls) ui.pushToast({ kind: 'info', text: t.editor.curlInsecure });
  return true;
}
