import { useEffect, useMemo, useRef, useState } from 'react';
import type { Id, RequestDef, SplitOrientation } from '@shared/types';
import { cancelRequest, sendRequest } from '../../actions/request-actions';
import { t } from '../../i18n/es';
import { formatBytes, formatDuration, statusTone } from '../../lib/format';
import {
  base64ToBytes,
  decodeText,
  detectKind,
  extensionFor,
  prettyJson,
  prettyXml,
  type BodyKind,
} from '../../lib/response-body';
import { useProfileStore } from '../../store/profile-store';
import { useResponseStore, type OkResult } from '../../store/response-store';
import { useUiStore, useView } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { Button, IconButton } from '../common/Button';
import { CodeEditor, type CodeEditorHandle } from '../common/CodeEditor';
import { Segmented } from '../common/Segmented';
import styles from './ResponseViewer.module.css';

interface Decoded {
  kind: BodyKind;
  text: string;
  pretty: string | null;
  bytes: Uint8Array;
}

function decode(result: OkResult): Decoded {
  const bytes = base64ToBytes(result.bodyBase64);
  const text = decodeText(bytes, result.contentType);
  const kind = detectKind(result.contentType, bytes, text);
  let pretty: string | null = null;
  if (kind === 'json') pretty = prettyJson(text);
  else if (kind === 'xml') pretty = prettyXml(text);
  return { kind, text, pretty, bytes };
}

function Elapsed({ since }: { since: number }): JSX.Element {
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, []);
  return <span className={styles.mono}>{formatDuration(now - since)}</span>;
}

function OrientationButton(): JSX.Element {
  const orientation = useProfileStore((s) => s.profile?.workspace.splitOrientation ?? 'vertical');
  const next: SplitOrientation = orientation === 'vertical' ? 'horizontal' : 'vertical';
  return (
    <IconButton
      icon={orientation === 'vertical' ? 'splitscreen' : 'vertical_split'}
      label={t.response.orientation}
      onClick={() => useProfileStore.getState().setSplitOrientation(next)}
    />
  );
}

function sanitizeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'respuesta';
}

function DoneView({ id, request, result, warnings }: { id: Id; request: RequestDef; result: OkResult; warnings: string[] }): JSX.Element {
  const decoded = useMemo(() => decode(result), [result]);
  const [view, setView] = useView<'body' | 'headers'>(`resview:${id}`, 'body');
  const [mode, setMode] = useView<'pretty' | 'raw'>(`resmode:${id}`, 'pretty');
  // Wrapped by default so long values (tokens, base64…) stay readable; the toolbar button toggles it.
  const [wrap, setWrap] = useView<'on' | 'off'>('reswrap', 'on');
  const maxRender = useUiStore((s) => s.settings.http.maxResponseBytesToRender);
  const editor = useRef<CodeEditorHandle>(null);
  const tone = statusTone(result.status);
  const tooBig = result.truncatedForView || result.sizeBytes.body > maxRender;
  const total = result.sizeBytes.headers + result.sizeBytes.body;
  const canRenderText = !tooBig && ['json', 'xml', 'html', 'text'].includes(decoded.kind);
  const shownText = mode === 'pretty' && decoded.pretty !== null ? decoded.pretty : decoded.text;
  const language = decoded.kind === 'json' ? 'json' : decoded.kind === 'xml' || decoded.kind === 'html' ? 'xml' : 'text';

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(shownText);
    useUiStore.getState().pushToast({ kind: 'success', text: t.response.copied });
  };
  const save = async (): Promise<void> => {
    const ok = await window.api.invoke('response:save', {
      suggestedName: `${sanitizeName(request.name)}.${extensionFor(result.contentType, decoded.kind)}`,
      bytesBase64: result.bodyBase64,
    });
    if (ok) useUiStore.getState().pushToast({ kind: 'success', text: t.response.saved });
  };

  return (
    <div
      className={styles.viewer}
      onKeyDown={(e) => {
        if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'f' && canRenderText && view === 'body') {
          e.preventDefault();
          editor.current?.openSearch();
        }
      }}
    >
      <div className={styles.header}>
        <span className={`${styles.pill} ${styles[`tone_${tone}`]}`}>
          <span className={styles.pillDot} />
          <span>
            {result.status} {result.statusText}
          </span>
        </span>
        <span className={styles.metrics}>
          <span data-tooltip={`TTFB ${formatDuration(result.timingMs.ttfb)}`}>{formatDuration(result.timingMs.total)}</span>
          <span className={styles.dotSep}>·</span>
          <span data-tooltip={t.response.sizeTip(formatBytes(result.sizeBytes.headers), formatBytes(result.sizeBytes.body))}>
            {formatBytes(total)}
          </span>
        </span>
        <span className={styles.actions}>
          <IconButton
            icon="search"
            label={t.response.search}
            disabled={!canRenderText || view !== 'body'}
            onClick={() => editor.current?.openSearch()}
          />
          <IconButton icon="wrap_text" label={t.response.wrap} active={wrap === 'on'} fill={false} onClick={() => setWrap(wrap === 'on' ? 'off' : 'on')} />
          <IconButton icon="content_copy" label={t.response.copy} disabled={!canRenderText} onClick={() => void copy()} />
          <IconButton icon="download" label={t.response.save} onClick={() => void save()} />
          <span className={styles.vsep} />
          <OrientationButton />
        </span>
      </div>

      {warnings.length > 0 && (
        <div className={styles.warnings}>
          {warnings.map((w) => (
            <span key={w} className={styles.warning}>
              <Icon name="warning" size={15} />
              {w}
            </span>
          ))}
        </div>
      )}

      <div className={styles.views}>
        <div className={styles.pills} role="tablist">
          <button type="button" role="tab" aria-selected={view === 'body'} className={`${styles.viewPill} ${view === 'body' ? styles.viewOn : ''}`} onClick={() => setView('body')}>
            {t.response.body}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'headers'}
            className={`${styles.viewPill} ${view === 'headers' ? styles.viewOn : ''}`}
            onClick={() => setView('headers')}
          >
            {t.response.headers}
            <span className={styles.count}>{result.headers.length}</span>
          </button>
        </div>
        {view === 'body' && canRenderText && decoded.pretty !== null && (
          <span className={styles.viewRight}>
            <Segmented<'pretty' | 'raw'>
              label="Vista"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'pretty', label: t.response.pretty },
                { value: 'raw', label: t.response.raw },
              ]}
            />
          </span>
        )}
      </div>

      {view === 'headers' ? (
        <div className={styles.headersBox}>
          <table className={styles.headersTable}>
            <tbody>
              {result.headers.map(([k, v], i) => (
                <tr key={`${k}${i}`}>
                  <td className={styles.hKey}>{k}</td>
                  <td className={styles.hVal}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : decoded.kind === 'empty' ? (
        <div className={styles.note}>{t.response.emptyBody}</div>
      ) : tooBig ? (
        <div className={styles.center}>
          <Icon name="description" size={32} className={styles.centerIcon} />
          <span>{t.response.tooBig(formatBytes(result.sizeBytes.body))}</span>
          <Button variant="secondary" icon="download" onClick={() => void save()}>
            {t.response.saveToFile}
          </Button>
        </div>
      ) : decoded.kind === 'image' ? (
        <div className={styles.imageBox}>
          <img src={`data:${result.contentType ?? 'image/png'};base64,${result.bodyBase64}`} alt="" className={styles.image} />
        </div>
      ) : decoded.kind === 'binary' ? (
        <div className={styles.center}>
          <Icon name="draft" size={32} className={styles.centerIcon} />
          <span>{t.response.binary}</span>
          <Button variant="secondary" icon="download" onClick={() => void save()}>
            {t.response.saveToFile}
          </Button>
        </div>
      ) : (
        <div className={styles.codeArea}>
          <CodeEditor ref={editor} ariaLabel="Respuesta" value={shownText} language={language} readOnly wrap={wrap === 'on'} />
        </div>
      )}
    </div>
  );
}

export function ResponseViewer({ request }: { request: RequestDef }): JSX.Element {
  const state = useResponseStore((s) => s.responses[request.id]);

  if (!state) {
    return (
      <div className={styles.viewer}>
        <div className={styles.header}>
          <span className={styles.actions}>
            <OrientationButton />
          </span>
        </div>
        <div className={styles.center}>
          <Icon name="send" size={32} className={styles.centerIcon} />
          <span className={styles.centerTitle}>{t.response.emptyTitle}</span>
          <span className={styles.centerHint}>{t.response.emptyHint}</span>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className={styles.viewer}>
        <div className={styles.progress}>
          <span className={styles.progressBar} />
        </div>
        <div className={styles.header}>
          <span className={styles.metrics}>
            {t.response.loading} <Elapsed since={state.startedAt} />
          </span>
          <span className={styles.actions}>
            <OrientationButton />
          </span>
        </div>
        <div className={styles.center}>
          <Button variant="secondary" icon="stop_circle" onClick={() => cancelRequest(request.id)}>
            {t.response.cancel}
          </Button>
          <span className={styles.centerHint}>Esc</span>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    const cancelled = state.code === 'CANCELLED';
    return (
      <div className={styles.viewer}>
        <div className={styles.header}>
          <span className={`${styles.pill} ${cancelled ? styles.tone_neutral : styles.tone_danger}`}>
            <span className={styles.pillDot} />
            <span>{state.code}</span>
          </span>
          {state.totalMs > 0 && <span className={styles.metrics}>{formatDuration(state.totalMs)}</span>}
          <span className={styles.actions}>
            <OrientationButton />
          </span>
        </div>
        <div className={styles.center}>
          <Icon name={cancelled ? 'block' : 'error'} size={32} className={cancelled ? styles.centerIcon : styles.errorIcon} />
          <span className={styles.centerTitle}>{cancelled ? state.message : t.response.errorTitle}</span>
          {!cancelled && <span className={styles.errorMsg}>{state.message}</span>}
          {state.detail && !cancelled && <span className={styles.detail}>{state.detail}</span>}
          <Button variant="secondary" icon="refresh" onClick={() => void sendRequest(request.id)}>
            {t.response.retry}
          </Button>
        </div>
      </div>
    );
  }

  return <DoneView id={request.id} request={request} result={state.result} warnings={state.warnings} />;
}
