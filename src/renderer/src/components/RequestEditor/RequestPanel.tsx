import { useMemo } from 'react';
import type { Collection, RequestDef } from '@shared/types';
import { t } from '../../i18n/es';
import { variableMap } from '../../lib/interpolate';
import { autoHeaders, type AutoHeader } from '../../lib/resolve-request';
import { urlFromParams } from '../../lib/url-params';
import { useProfileStore } from '../../store/profile-store';
import { useUiStore, useView } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { KeyValueTable, type ReadonlyRow } from '../common/KeyValueTable';
import { AuthPanel } from './AuthPanel';
import { BodyPanel } from './BodyPanel';
import { COMMON_HEADERS } from './header-names';
import { OptionsPanel } from './OptionsPanel';
import styles from './RequestPanel.module.css';

export type SubTab = 'params' | 'headers' | 'body' | 'auth' | 'options';

const TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: 'params', icon: 'tune', label: t.editor.params },
  { id: 'headers', icon: 'list_alt', label: t.editor.headers },
  { id: 'body', icon: 'data_object', label: t.editor.body },
  { id: 'auth', icon: 'key', label: t.editor.auth },
  { id: 'options', icon: 'instant_mix', label: t.editor.options },
];

/** Auto headers in the table: the credentials stay hidden, only the scheme (Bearer/Basic) is shown. */
function autoHeaderRow(h: AutoHeader): ReadonlyRow {
  const value = h.key === 'Authorization' ? h.value.replace(/^(\S+).*$/s, '$1 ••••••••') : h.value;
  return { ...h, value, note: t.editor.autoHeaderNotes[h.key] };
}

function defaultTab(r: RequestDef): SubTab {
  return r.body.mode !== 'none' ? 'body' : 'params';
}

export function RequestPanel({ request, collection }: { request: RequestDef; collection: Collection | undefined }): JSX.Element {
  const [tab, setTab] = useView<SubTab>(`subtab:${request.id}`, defaultTab(request));
  const appVersion = useUiStore((s) => s.appVersion);
  const vars = useMemo(() => variableMap(collection?.variables ?? []), [collection?.variables]);
  const auto = useMemo(() => autoHeaders(request, vars, appVersion), [request, vars, appVersion]);
  const counts: Partial<Record<SubTab, number>> = {
    params: request.params.filter((p) => p.enabled && p.key !== '').length,
    headers: request.headers.filter((h) => h.enabled && h.key.trim() !== '').length,
  };
  const update = useProfileStore.getState().updateRequest;

  const onTabKey = (e: React.KeyboardEvent): void => {
    const i = TABS.findIndex((x) => x.id === tab);
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = TABS[(i + dir + TABS.length) % TABS.length]!;
    setTab(next.id);
    requestAnimationFrame(() => document.getElementById(`subtab-${next.id}`)?.focus());
  };

  return (
    <div className={styles.panel}>
      <div className={styles.subtabs} role="tablist" aria-label="Request" onKeyDown={onTabKey}>
        {TABS.map((x) => {
          const on = x.id === tab;
          const count = counts[x.id];
          return (
            <button
              key={x.id}
              id={`subtab-${x.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              className={`${styles.subtab} ${on ? styles.subtabOn : ''}`}
              onClick={() => setTab(x.id)}
            >
              <Icon name={x.icon} size={16} fill={on} className={on ? styles.subtabIconOn : undefined} />
              <span>{x.label}</span>
              {count ? <span className={styles.count}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className={styles.content} role="tabpanel">
        {tab === 'params' && (
          <div className={styles.panelScroll}>
            <div className={styles.tableWrap}>
              <KeyValueTable
                label={t.editor.params}
                rows={request.params}
                onChange={(params) => update(request.id, (r) => ({ ...r, params, url: urlFromParams(r.url, params) }))}
                createRow={(id, key, value) => ({ id, key, value, enabled: true })}
              />
            </div>
          </div>
        )}
        {tab === 'headers' && (
          <div className={styles.panelScroll}>
            <div className={styles.tableWrap}>
              <KeyValueTable
                label={t.editor.headers}
                rows={request.headers}
                onChange={(headers) => update(request.id, (r) => ({ ...r, headers }))}
                createRow={(id, key, value) => ({ id, key, value, enabled: true })}
                keySuggestions={COMMON_HEADERS}
                readonlyRows={auto.map(autoHeaderRow)}
              />
            </div>
          </div>
        )}
        {tab === 'body' && <BodyPanel request={request} />}
        {tab === 'auth' && <AuthPanel request={request} />}
        {tab === 'options' && <OptionsPanel request={request} />}
      </div>
    </div>
  );
}
