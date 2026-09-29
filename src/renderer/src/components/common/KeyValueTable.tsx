import { useId, useState, type ReactNode } from 'react';
import { newId } from '@shared/defaults';
import type { KeyValue } from '@shared/types';
import { t } from '../../i18n/es';
import { Icon } from '../Icon/Icon';
import { IconButton } from './Button';
import { Checkbox } from './Checkbox';
import styles from './KeyValueTable.module.css';

export interface ReadonlyRow {
  key: string;
  value: string;
  note?: string;
}

export interface KeyValueTableProps<T extends KeyValue> {
  rows: T[];
  onChange: (rows: T[]) => void;
  /** Build a new row (the trailing empty row becomes real when typed into). */
  createRow: (id: string, key: string, value: string) => T;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keySuggestions?: readonly string[];
  readonlyRows?: ReadonlyRow[];
  /** Custom value cell (multipart: text or file). */
  renderValue?: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
  /** Optional column between key and value. */
  extraColumn?: {
    header: string;
    width: number;
    render: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
  };
  allowBulk?: boolean;
  label: string;
}

export function toBulkText(rows: readonly KeyValue[]): string {
  return rows
    .filter((r) => r.key !== '' || r.value !== '')
    .map((r) => `${r.enabled ? '' : '//'}${r.key}: ${r.value}`)
    .join('\n');
}

export function fromBulkText<T extends KeyValue>(
  text: string,
  previous: readonly T[],
  createRow: (id: string, key: string, value: string) => T,
): T[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  return lines.map((line, i) => {
    let body = line.trim();
    const enabled = !body.startsWith('//');
    if (!enabled) body = body.slice(2).trim();
    const colon = body.indexOf(':');
    const key = (colon < 0 ? body : body.slice(0, colon)).trim();
    const value = colon < 0 ? '' : body.slice(colon + 1).trim();
    const prev = previous[i];
    const row = prev ? { ...prev, key, value } : createRow(newId(), key, value);
    return { ...row, enabled };
  });
}

export function KeyValueTable<T extends KeyValue>({
  rows,
  onChange,
  createRow,
  keyPlaceholder = t.kv.key,
  valuePlaceholder = t.kv.value,
  keySuggestions,
  readonlyRows = [],
  renderValue,
  extraColumn,
  allowBulk = true,
  label,
}: KeyValueTableProps<T>): JSX.Element {
  const [draftId, setDraftId] = useState(() => newId());
  const [bulk, setBulk] = useState<string | null>(null);
  const listId = useId();

  const update = (id: string, patch: Partial<T>): void => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string): void => onChange(rows.filter((r) => r.id !== id));
  const promoteDraft = (field: 'key' | 'value', text: string): void => {
    const row = createRow(draftId, field === 'key' ? text : '', field === 'value' ? text : '');
    onChange([...rows, row]);
    setDraftId(newId());
  };

  const columns = `32px minmax(0, 1fr) ${extraColumn ? `${extraColumn.width}px ` : ''}minmax(0, 1.4fr) 32px`;

  const toggleBulk = (): void => {
    if (bulk === null) setBulk(toBulkText(rows));
    else {
      onChange(fromBulkText(bulk, rows, createRow));
      setBulk(null);
    }
  };

  return (
    <div className={styles.wrap}>
      {allowBulk && (
        <div className={styles.toolbar}>
          <button type="button" className={styles.bulkBtn} onClick={toggleBulk}>
            <Icon name={bulk === null ? 'edit_note' : 'table_rows'} size={16} />
            <span>{bulk === null ? t.kv.bulkEdit : t.kv.tableEdit}</span>
          </button>
        </div>
      )}
      {bulk !== null ? (
        <div className={styles.bulk}>
          <textarea
            className={styles.bulkArea}
            value={bulk}
            spellCheck={false}
            aria-label={`${label} — ${t.kv.bulkEdit}`}
            onChange={(e) => setBulk(e.target.value)}
            onBlur={() => onChange(fromBulkText(bulk, rows, createRow))}
            placeholder="Content-Type: application/json"
          />
          <span className={styles.hint}>{t.kv.bulkHint}</span>
        </div>
      ) : (
        <div className={styles.table} role="table" aria-label={label}>
          <div className={`${styles.row} ${styles.head}`} style={{ gridTemplateColumns: columns }} role="row">
            <span role="columnheader" />
            <span role="columnheader">{keyPlaceholder}</span>
            {extraColumn && <span role="columnheader">{extraColumn.header}</span>}
            <span role="columnheader">{valuePlaceholder}</span>
            <span role="columnheader" />
          </div>
          {/* One flat keyed list: the draft row keeps its DOM node (and focus) when it becomes real. */}
          {[
            ...readonlyRows.map((r, i) => (
              <div
                key={`ro${i}`}
                className={`${styles.row} ${styles.readonly}`}
                style={{ gridTemplateColumns: columns }}
                role="row"
                data-tooltip={r.note}
              >
                <span className={styles.cellCheck}>
                  <Icon name="lock" size={14} />
                </span>
                <span className={styles.static}>{r.key}</span>
                {extraColumn && <span />}
                <span className={styles.static}>{r.value}</span>
                <span />
              </div>
            )),
            ...rows.map((r) => (
              <div
                key={r.id}
                className={`${styles.row} ${r.enabled ? '' : styles.disabled}`}
                style={{ gridTemplateColumns: columns }}
                role="row"
              >
                <span className={styles.cellCheck}>
                  <Checkbox
                    checked={r.enabled}
                    onChange={(v) => update(r.id, { enabled: v } as Partial<T>)}
                    label={t.kv.enabled}
                  />
                </span>
                <input
                  className={styles.input}
                  value={r.key}
                  placeholder={keyPlaceholder}
                  list={keySuggestions ? listId : undefined}
                  spellCheck={false}
                  onChange={(e) => update(r.id, { key: e.target.value } as Partial<T>)}
                />
                {extraColumn && (
                  <span className={styles.cellExtra}>{extraColumn.render(r, (p) => update(r.id, p))}</span>
                )}
                {renderValue ? (
                  <span className={styles.cellCustom}>{renderValue(r, (p) => update(r.id, p))}</span>
                ) : (
                  <input
                    className={styles.input}
                    value={r.value}
                    placeholder={valuePlaceholder}
                    spellCheck={false}
                    onChange={(e) => update(r.id, { value: e.target.value } as Partial<T>)}
                  />
                )}
                <span className={styles.cellDel}>
                  <IconButton
                    icon="remove_circle_outline"
                    label={t.kv.removeRow}
                    box={24}
                    iconSize={16}
                    tone="faint"
                    className={styles.del}
                    onClick={() => remove(r.id)}
                  />
                </span>
              </div>
            )),
            <div
              key={draftId}
              className={`${styles.row} ${styles.draft}`}
              style={{ gridTemplateColumns: columns }}
              role="row"
            >
              <span />
              <input
                className={styles.input}
                value=""
                placeholder={keyPlaceholder}
                list={keySuggestions ? listId : undefined}
                spellCheck={false}
                aria-label={keyPlaceholder}
                onChange={(e) => promoteDraft('key', e.target.value)}
              />
              {extraColumn && <span />}
              <input
                className={styles.input}
                value=""
                placeholder={valuePlaceholder}
                spellCheck={false}
                aria-label={valuePlaceholder}
                onChange={(e) => promoteDraft('value', e.target.value)}
              />
              <span />
            </div>,
          ]}
        </div>
      )}
      {keySuggestions && (
        <datalist id={listId}>
          {keySuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
