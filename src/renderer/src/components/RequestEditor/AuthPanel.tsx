import { useRef, useState } from 'react';
import type { Auth, RequestDef } from '@shared/types';
import { t } from '../../i18n/es';
import { useProfileStore } from '../../store/profile-store';
import { Icon } from '../Icon/Icon';
import { Segmented } from '../common/Segmented';
import { TextInput } from '../common/TextInput';
import styles from './RequestPanel.module.css';

const setAuth = (id: string, auth: Auth): void => useProfileStore.getState().updateRequest(id, (r) => ({ ...r, auth }));

function Secret({
  value,
  onChange,
  label,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  mono?: boolean;
}): JSX.Element {
  const [shown, setShown] = useState(false);
  return (
    <TextInput
      boxClassName={styles.fieldInput}
      type={shown ? 'text' : 'password'}
      value={value}
      mono={mono}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      suffix={
        <button
          type="button"
          className={styles.eye}
          aria-label={shown ? t.editor.hide : t.editor.show}
          data-tooltip={shown ? t.editor.hide : t.editor.show}
          onClick={() => setShown((s) => !s)}
        >
          <Icon name={shown ? 'visibility_off' : 'visibility'} size={16} />
        </button>
      }
    />
  );
}

/** Bearer token: grows with its content, can be masked and cleared. Line breaks are never stored. */
function TokenField({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const blockIfMasked = (e: React.ClipboardEvent): void => {
    if (!shown) e.preventDefault();
  };
  return (
    <span className={styles.tokenBox}>
      <textarea
        ref={ref}
        className={`${styles.tokenInput} ${shown ? '' : styles.masked}`}
        rows={1}
        spellCheck={false}
        aria-label={t.editor.token}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.ctrlKey) e.preventDefault();
        }}
        onPaste={(e) => {
          // Chromium turns pasted line breaks into spaces while masked; drop them ourselves.
          const text = e.clipboardData.getData('text/plain');
          if (!/[\r\n]/.test(text)) return;
          e.preventDefault();
          const el = e.currentTarget;
          el.setRangeText(text.replace(/\s*[\r\n]+\s*/g, ''), el.selectionStart, el.selectionEnd, 'end');
          onChange(el.value);
        }}
        onCopy={blockIfMasked}
        onCut={blockIfMasked}
      />
      <span className={styles.tokenActions}>
        {value !== '' && (
          <button
            type="button"
            className={styles.eye}
            aria-label={t.editor.clearToken}
            data-tooltip={t.editor.clearToken}
            onClick={() => {
              onChange('');
              ref.current?.focus();
            }}
          >
            <Icon name="close" size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.eye}
          aria-label={shown ? t.editor.hide : t.editor.show}
          data-tooltip={shown ? t.editor.hide : t.editor.show}
          onClick={() => setShown((s) => !s)}
        >
          <Icon name={shown ? 'visibility_off' : 'visibility'} size={16} />
        </button>
      </span>
    </span>
  );
}

export function AuthPanel({ request }: { request: RequestDef }): JSX.Element {
  const { auth } = request;
  const change = (type: Auth['type']): void => {
    if (type === auth.type) return;
    if (type === 'none') setAuth(request.id, { type });
    else if (type === 'bearer') setAuth(request.id, { type, token: '' });
    else setAuth(request.id, { type, username: '', password: '' });
  };
  return (
    <div className={styles.panelScroll}>
      <div className={styles.toolbar}>
        <Segmented<Auth['type']>
          label={t.editor.auth}
          value={auth.type}
          onChange={change}
          options={[
            { value: 'none', label: t.editor.authModes.none },
            { value: 'bearer', label: t.editor.authModes.bearer },
            { value: 'basic', label: t.editor.authModes.basic },
          ]}
        />
      </div>
      <div className={styles.form}>
        {auth.type === 'none' && <div className={styles.emptyNote}>{t.editor.noAuth}</div>}
        {auth.type === 'bearer' && (
          <label className={`${styles.field} ${styles.fieldTop}`}>
            <span className={styles.fieldLabel}>{t.editor.token}</span>
            <TokenField value={auth.token} onChange={(token) => setAuth(request.id, { ...auth, token })} />
          </label>
        )}
        {auth.type === 'basic' && (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.editor.username}</span>
              <TextInput
                boxClassName={styles.fieldInput}
                mono
                value={auth.username}
                aria-label={t.editor.username}
                onChange={(e) => setAuth(request.id, { ...auth, username: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.editor.password}</span>
              <Secret mono label={t.editor.password} value={auth.password} onChange={(password) => setAuth(request.id, { ...auth, password })} />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
