import { useMemo } from 'react';
import { BODY_MODES, type BodyMode, type MultipartField, type RequestDef } from '@shared/types';
import { t } from '../../i18n/es';
import { prettyJson, prettyXml } from '../../lib/response-body';
import { useProfileStore } from '../../store/profile-store';
import { Icon } from '../Icon/Icon';
import { Button } from '../common/Button';
import { CodeEditor } from '../common/CodeEditor';
import { KeyValueTable } from '../common/KeyValueTable';
import { Segmented } from '../common/Segmented';
import styles from './RequestPanel.module.css';

const update = (id: string, fn: (b: RequestDef['body']) => RequestDef['body']): void =>
  useProfileStore.getState().updateRequest(id, (r) => ({ ...r, body: fn(r.body) }));

/** Invalid JSON warning is non-blocking; {{vars}} are neutralised before checking. */
function jsonInvalid(raw: string): boolean {
  if (!raw.trim()) return false;
  try {
    JSON.parse(raw.replace(/\{\{[^{}]+\}\}/g, '0'));
    return false;
  } catch {
    return true;
  }
}

export function formatBody(request: RequestDef): void {
  const { mode, raw } = request.body;
  if (mode === 'json') {
    const pretty = prettyJson(raw);
    if (pretty !== null) update(request.id, (b) => ({ ...b, raw: pretty }));
  } else if (mode === 'xml' && raw.trim()) {
    update(request.id, (b) => ({ ...b, raw: prettyXml(raw) }));
  }
}

function FileCell({ row, onPick }: { row: MultipartField; onPick: (path: string) => void }): JSX.Element {
  const name = row.value ? row.value.split(/[\\/]/).pop() : t.kv.noFile;
  return (
    <button
      type="button"
      className={styles.fileBtn}
      data-tooltip={row.value || undefined}
      onClick={async () => {
        const p = await window.api.invoke('file:pick-attachment');
        if (p) onPick(p);
      }}
    >
      <Icon name="attach_file" size={16} />
      <span className={row.value ? styles.fileName : styles.fileEmpty}>{name}</span>
    </button>
  );
}

export function BodyPanel({ request }: { request: RequestDef }): JSX.Element {
  const { body } = request;
  const invalid = useMemo(() => body.mode === 'json' && jsonInvalid(body.raw), [body.mode, body.raw]);
  const options = BODY_MODES.map((m) => ({ value: m, label: t.editor.bodyModes[m] }));
  const language = body.mode === 'json' ? 'json' : body.mode === 'xml' ? 'xml' : 'text';

  return (
    <div
      className={styles.panelFill}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          formatBody(request);
        }
      }}
    >
      <div className={styles.toolbar}>
        <Segmented<BodyMode>
          label={t.editor.body}
          value={body.mode}
          options={options}
          onChange={(mode) => update(request.id, (b) => ({ ...b, mode }))}
        />
        {invalid && (
          <span className={styles.invalid}>
            <Icon name="warning" size={15} />
            {t.editor.invalidJson}
          </span>
        )}
        {(body.mode === 'json' || body.mode === 'xml') && (
          <Button
            variant="ghost"
            size="sm"
            icon="format_align_left"
            className={styles.toolRight}
            data-tooltip={t.editor.formatTip}
            onClick={() => formatBody(request)}
          >
            {t.editor.format}
          </Button>
        )}
      </div>

      {body.mode === 'none' && <div className={styles.emptyNote}>{t.editor.noBody}</div>}

      {(body.mode === 'json' || body.mode === 'text' || body.mode === 'xml') && (
        <div className={styles.codeArea}>
          <CodeEditor
            key={request.id}
            ariaLabel={t.editor.body}
            value={body.raw}
            language={language}
            onChange={(raw) => update(request.id, (b) => ({ ...b, raw }))}
          />
        </div>
      )}

      {body.mode === 'form-urlencoded' && (
        <div className={styles.scrollArea}>
          <KeyValueTable
            label={t.editor.bodyModes['form-urlencoded']}
            rows={body.formUrlEncoded}
            onChange={(rows) => update(request.id, (b) => ({ ...b, formUrlEncoded: rows }))}
            createRow={(id, key, value) => ({ id, key, value, enabled: true })}
          />
        </div>
      )}

      {body.mode === 'multipart' && (
        <div className={styles.scrollArea}>
          <KeyValueTable<MultipartField>
            label={t.editor.bodyModes.multipart}
            rows={body.multipart}
            onChange={(rows) => update(request.id, (b) => ({ ...b, multipart: rows }))}
            createRow={(id, key, value) => ({ id, key, value, enabled: true, kind: 'text' })}
            allowBulk={false}
            extraColumn={{
              header: 'Tipo',
              width: 150,
              render: (row, patch) => (
                <Segmented<'text' | 'file'>
                  label="Tipo"
                  value={row.kind}
                  options={[
                    { value: 'text', label: t.kv.text },
                    { value: 'file', label: t.kv.file },
                  ]}
                  onChange={(kind) => patch({ kind, value: '' })}
                />
              ),
            }}
            renderValue={(row, patch) =>
              row.kind === 'file' ? (
                <FileCell row={row} onPick={(value) => patch({ value })} />
              ) : (
                <input
                  className={styles.cellInput}
                  value={row.value}
                  placeholder={t.kv.value}
                  spellCheck={false}
                  onChange={(e) => patch({ value: e.target.value })}
                />
              )
            }
          />
        </div>
      )}
    </div>
  );
}
