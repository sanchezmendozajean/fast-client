import { useEffect, useState } from 'react';
import type { RequestDef } from '@shared/types';
import { t } from '../../i18n/es';
import { useProfileStore } from '../../store/profile-store';
import { useUiStore } from '../../store/ui-store';
import { Switch } from '../common/Switch';
import { TextInput } from '../common/TextInput';
import styles from './RequestPanel.module.css';

export function OptionsPanel({ request }: { request: RequestDef }): JSX.Element {
  const globalTimeout = useUiStore((s) => s.settings.http.defaultTimeoutMs);
  const ms = request.settings.timeoutMs;
  const [text, setText] = useState(ms === null ? '' : String(Math.round(ms / 1000)));
  useEffect(() => setText(ms === null ? '' : String(Math.round(ms / 1000))), [ms, request.id]);
  const invalid = text.trim() !== '' && !(/^\d+$/.test(text.trim()) && +text >= 1 && +text <= 600);

  const commit = (v: string): void => {
    setText(v);
    const trimmed = v.trim();
    if (trimmed === '') {
      useProfileStore.getState().updateRequest(request.id, (r) => ({ ...r, settings: { ...r.settings, timeoutMs: null } }));
    } else if (/^\d+$/.test(trimmed) && +trimmed >= 1 && +trimmed <= 600) {
      useProfileStore
        .getState()
        .updateRequest(request.id, (r) => ({ ...r, settings: { ...r.settings, timeoutMs: +trimmed * 1000 } }));
    }
  };

  return (
    <div className={styles.panelScroll}>
      <div className={styles.options}>
        <div className={styles.optionRow}>
          <div className={styles.optionText}>
            <span>{t.editor.timeout}</span>
            <span className={styles.optionHint}>{t.editor.timeoutHint}</span>
          </div>
          <div className={styles.optionControl}>
            <TextInput
              mono
              inputMode="numeric"
              className={styles.numInput}
              value={text}
              placeholder={String(Math.round(globalTimeout / 1000))}
              invalid={invalid}
              aria-label={t.editor.timeout}
              suffix="s"
              onChange={(e) => commit(e.target.value)}
            />
            {invalid && <span className={styles.error}>{t.editor.timeoutError}</span>}
          </div>
        </div>
        <div className={styles.optionRow}>
          <div className={styles.optionText}>
            <span>{t.editor.followRedirects}</span>
            <span className={styles.optionHint}>{t.editor.followRedirectsHint}</span>
          </div>
          <Switch
            label={t.editor.followRedirects}
            checked={request.settings.followRedirects}
            onChange={(followRedirects) =>
              useProfileStore
                .getState()
                .updateRequest(request.id, (r) => ({ ...r, settings: { ...r.settings, followRedirects } }))
            }
          />
        </div>
      </div>
    </div>
  );
}
