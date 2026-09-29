import { useEffect, useMemo, useRef, useState } from 'react';
import { HTTP_METHODS, type Collection, type RequestDef } from '@shared/types';
import { cancelRequest, importCurl, sendRequest } from '../../actions/request-actions';
import { t } from '../../i18n/es';
import { looksLikeCurl } from '../../lib/curl';
import { segmentVariables, variableMap } from '../../lib/interpolate';
import { paramsFromUrl } from '../../lib/url-params';
import { useProfileStore } from '../../store/profile-store';
import { useResponseStore } from '../../store/response-store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { Button } from '../common/Button';
import { FloatingMenu } from '../common/Menu';
import { methodColor } from '../common/MethodBadge';
import styles from './UrlBar.module.css';

function MethodSelect({ request }: { request: RequestDef }): JSX.Element {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const r = btn.current?.getBoundingClientRect();
  const choose = (m: RequestDef['method']): void =>
    useProfileStore.getState().updateRequest(request.id, (x) => ({ ...x, method: m }));
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={styles.method}
        style={{ color: methodColor(request.method) }}
        aria-haspopup="listbox"
        aria-label={`${t.editor.method}: ${request.method}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{request.method}</span>
        <Icon name="expand_more" size={16} className={styles.chevron} />
      </button>
      {open && r && (
        <FloatingMenu
          x={r.left}
          y={r.bottom + 6}
          minWidth={150}
          label={t.editor.method}
          ignoreRefs={[btn]}
          initialIndex={HTTP_METHODS.indexOf(request.method)}
          onClose={() => setOpen(false)}
          entries={HTTP_METHODS.map((m) => ({
            type: 'item',
            id: m,
            label: m,
            labelClassName: styles.methodItem,
            labelColor: methodColor(m),
            checked: m === request.method ? true : undefined,
            onSelect: () => choose(m),
          }))}
        />
      )}
    </>
  );
}

/** Last URL focus request already honoured (the bar remounts on every tab switch). */
let handledUrlNonce = 0;

/** URL input with {{variable}} highlighting: a mirror layer renders the colours behind a transparent input. */
function UrlInput({ request, collection }: { request: RequestDef; collection: Collection | undefined }): JSX.Element {
  const vars = useMemo(() => variableMap(collection?.variables ?? []), [collection?.variables]);
  const segments = useMemo(() => segmentVariables(request.url, vars), [request.url, vars]);
  const input = useRef<HTMLInputElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const focusNonce = useUiStore((s) => s.urlFocusNonce);

  useEffect(() => {
    if (focusNonce > handledUrlNonce) {
      handledUrlNonce = focusNonce;
      input.current?.focus();
    }
  }, [focusNonce]);

  const syncScroll = (): void => {
    if (mirror.current && input.current) mirror.current.scrollLeft = input.current.scrollLeft;
  };
  useEffect(syncScroll, [request.url]);

  const varTip = segments
    .filter((s) => s.kind === 'var')
    .map((s) => (s.kind === 'var' && s.defined ? `{{${s.name}}} = ${s.value}` : `{{${s.name}}}: ${t.editor.varMissing}`))
    .join('\n');

  const setUrl = (url: string): void =>
    useProfileStore.getState().updateRequest(request.id, (r) => ({ ...r, url, params: paramsFromUrl(url, r.params) }));

  return (
    <div className={styles.urlWrap} data-tooltip={varTip || undefined}>
      <div ref={mirror} className={styles.mirror} aria-hidden>
        {segments.map((s, i) =>
          s.kind === 'text' ? (
            <span key={i}>{s.text}</span>
          ) : (
            <span key={i} className={s.defined ? styles.varOk : styles.varMissing}>
              {s.text}
            </span>
          ),
        )}
      </div>
      <input
        ref={input}
        className={styles.url}
        value={request.url}
        placeholder={t.editor.urlPlaceholder}
        spellCheck={false}
        aria-label="URL"
        data-url-input
        onChange={(e) => setUrl(e.target.value)}
        onScroll={syncScroll}
        onKeyUp={syncScroll}
        onSelect={syncScroll}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (!looksLikeCurl(text)) return;
          e.preventDefault();
          useUiStore.getState().pushToast({
            kind: 'info',
            text: t.editor.importCurl,
            action: { label: t.editor.import, command: 'import-curl' },
            onAction: () => importCurl(request.id, text),
          });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.ctrlKey) {
            e.preventDefault();
            void sendRequest(request.id);
          }
        }}
      />
    </div>
  );
}

export function UrlBar({ request, collection }: { request: RequestDef; collection: Collection | undefined }): JSX.Element {
  const loading = useResponseStore((s) => s.responses[request.id]?.status === 'loading');
  return (
    <div className={styles.bar}>
      <div className={styles.box}>
        <MethodSelect request={request} />
        <span className={styles.sep} />
        <UrlInput request={request} collection={collection} />
      </div>
      {loading ? (
        <Button variant="secondary" size="lg" icon="stop_circle" className={styles.send} onClick={() => cancelRequest(request.id)}>
          {t.editor.cancel}
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          icon="send"
          iconFill
          className={styles.send}
          data-tooltip="Ctrl+Enter"
          onClick={() => void sendRequest(request.id)}
        >
          {t.editor.send}
        </Button>
      )}
    </div>
  );
}
