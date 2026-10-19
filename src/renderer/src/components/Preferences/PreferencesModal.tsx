import { useMemo, useRef, useState } from 'react';
import { defaultSettings, ZOOM_STEPS } from '@shared/defaults';
import { validatePreferences } from '@shared/settings-schema';
import type { AppSettings, ThemeSetting } from '@shared/types';
import { t } from '../../i18n/es';
import { fileReveal } from '../../actions/file-actions';
import { formatZoom } from '../../lib/format';
import { useProfileStore } from '../../store/profile-store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { Button } from '../common/Button';
import { FloatingMenu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { Segmented } from '../common/Segmented';
import { Switch } from '../common/Switch';
import { TextInput } from '../common/TextInput';
import styles from './PreferencesModal.module.css';

const MB = 1024 * 1024;

type PrefsTab = 'network' | 'interface' | 'profiles' | 'updates';

interface Draft {
  timeoutSeconds: string;
  maxRenderMb: string;
  verifyTls: boolean;
  followRedirectsDefault: boolean;
  theme: ThemeSetting;
  zoomFactor: number;
  checkForUpdates: boolean;
}

function toDraft(s: AppSettings): Draft {
  return {
    timeoutSeconds: String(Math.round(s.http.defaultTimeoutMs / 1000)),
    maxRenderMb: String(Math.round(s.http.maxResponseBytesToRender / MB)),
    verifyTls: s.http.verifyTls,
    followRedirectsDefault: s.http.followRedirectsDefault,
    theme: s.theme,
    zoomFactor: s.zoomFactor,
    checkForUpdates: s.checkForUpdates,
  };
}

async function preview(patch: Partial<AppSettings>): Promise<void> {
  useUiStore.getState().setSettings(await window.api.invoke('settings:update', patch));
}

function ZoomSelect({ value, onChange }: { value: number; onChange: (z: number) => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const r = btn.current?.getBoundingClientRect();
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={styles.select}
        aria-haspopup="listbox"
        aria-label={t.prefs.zoom}
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
        <span className={styles.selectValue}>{formatZoom(value)}</span>
        <Icon name="expand_more" size={16} className={styles.selectChevron} />
      </button>
      {open && r && (
        <FloatingMenu
          x={r.left}
          y={r.bottom + 4}
          minWidth={r.width + 40}
          ignoreRefs={[btn]}
          initialIndex={ZOOM_STEPS.findIndex((z) => z === value)}
          onClose={() => setOpen(false)}
          entries={ZOOM_STEPS.map((z) => ({
            type: 'item',
            id: String(z),
            label: formatZoom(z),
            labelClassName: styles.mono,
            checked: z === value ? true : undefined,
            onSelect: () => onChange(z),
          }))}
        />
      )}
    </>
  );
}

export function PreferencesModal(): JSX.Element | null {
  const open = useUiStore((s) => s.preferencesOpen);
  if (!open) return null;
  return <PreferencesDialog />;
}

function PreferencesDialog(): JSX.Element {
  const settings = useUiStore((s) => s.settings);
  const profilePath = useProfileStore((s) => s.profilePath);
  const appVersion = useUiStore((s) => s.appVersion);
  const close = (): void => useUiStore.getState().setPreferencesOpen(false);
  const original = useRef(settings);
  const [tab, setTab] = useState<PrefsTab>('network');
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const errors = useMemo(() => validatePreferences(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]): void => setDraft((d) => ({ ...d, [k]: v }));

  const cancel = (): void => {
    const o = original.current;
    if (o.theme !== settings.theme || o.zoomFactor !== settings.zoomFactor) {
      void preview({ theme: o.theme, zoomFactor: o.zoomFactor });
    }
    close();
  };

  const save = async (): Promise<void> => {
    if (hasErrors) return;
    await preview({
      theme: draft.theme,
      zoomFactor: draft.zoomFactor,
      checkForUpdates: draft.checkForUpdates,
      http: {
        defaultTimeoutMs: Number(draft.timeoutSeconds) * 1000,
        maxResponseBytesToRender: Number(draft.maxRenderMb) * MB,
        verifyTls: draft.verifyTls,
        followRedirectsDefault: draft.followRedirectsDefault,
      },
    });
    close();
  };

  const reset = async (): Promise<void> => {
    const v = await useUiStore.getState().ask({
      tone: 'question',
      title: t.dialogs.resetPrefsTitle,
      text: t.dialogs.resetPrefsText,
      buttons: [
        { value: 'cancel', label: t.actions.cancel, variant: 'secondary' },
        { value: 'reset', label: t.dialogs.reset, icon: 'restart_alt', variant: 'primary' },
      ],
      cancelValue: 'cancel',
      primaryValue: 'reset',
    });
    if (v !== 'reset') return;
    const d = toDraft(defaultSettings());
    setDraft(d);
    void preview({ theme: d.theme, zoomFactor: d.zoomFactor });
  };

  const setTheme = (theme: ThemeSetting): void => {
    set('theme', theme);
    void preview({ theme });
  };
  const setZoom = (zoomFactor: number): void => {
    set('zoomFactor', zoomFactor);
    void preview({ zoomFactor });
  };

  return (
    <Modal
      title={t.prefs.title}
      icon="settings_applications"
      width={560}
      height={520}
      onClose={cancel}
      onEnter={() => void save()}
      footer={
        <>
          <Button variant="ghost" icon="restart_alt" className={styles.reset} onClick={() => void reset()}>
            {t.prefs.resetDefaults}
          </Button>
          <span className={styles.spacer} />
          <Button variant="secondary" onClick={cancel}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" className={styles.save} disabled={hasErrors} onClick={() => void save()}>
            {t.actions.save}
          </Button>
        </>
      }
    >
      <div className={styles.sections}>
        <Segmented<PrefsTab>
          label={t.prefs.title}
          surface={2}
          size="md"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'network', label: t.prefs.network, icon: 'lan' },
            { value: 'interface', label: t.prefs.interface, icon: 'palette' },
            { value: 'profiles', label: t.prefs.profiles, icon: 'folder_managed' },
            { value: 'updates', label: t.prefs.updates, icon: 'update' },
          ]}
        />

        <section className={styles.section} hidden={tab !== 'network'}>

          <div className={`${styles.row} ${styles.rowTop}`}>
            <div className={`${styles.text} ${styles.textTop}`}>
              <span>{t.prefs.timeout}</span>
              <span className={styles.hint}>{t.prefs.timeoutHint}</span>
            </div>
            <div className={styles.control}>
              <TextInput
                mono
                data-autofocus
                inputMode="numeric"
                className={styles.num}
                value={draft.timeoutSeconds}
                invalid={!!errors.timeoutSeconds}
                aria-label={t.prefs.timeoutAria}
                suffix="s"
                onChange={(e) => set('timeoutSeconds', e.target.value)}
              />
              {errors.timeoutSeconds && <span className={styles.error}>{errors.timeoutSeconds}</span>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.text}>
              <span>{t.prefs.ssl}</span>
              <span className={styles.hint}>{t.prefs.sslHint}</span>
            </div>
            <Switch label={t.prefs.ssl} checked={draft.verifyTls} onChange={(v) => set('verifyTls', v)} />
          </div>
          {!draft.verifyTls && (
            <div className={styles.alert} role="alert">
              <Icon name="gpp_maybe" size={18} />
              <span>{t.prefs.sslWarning}</span>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.text}>
              <span>{t.prefs.redirects}</span>
              <span className={styles.hint}>{t.prefs.redirectsHint}</span>
            </div>
            <Switch
              label={t.prefs.redirects}
              checked={draft.followRedirectsDefault}
              onChange={(v) => set('followRedirectsDefault', v)}
            />
          </div>

          <div className={`${styles.row} ${styles.rowTop}`}>
            <div className={`${styles.text} ${styles.textTop}`}>
              <span>{t.prefs.maxSize}</span>
              <span className={styles.hint}>{t.prefs.maxSizeHint}</span>
            </div>
            <div className={styles.control}>
              <TextInput
                mono
                inputMode="numeric"
                className={styles.num}
                value={draft.maxRenderMb}
                invalid={!!errors.maxRenderMb}
                aria-label={t.prefs.maxSize}
                suffix="MB"
                onChange={(e) => set('maxRenderMb', e.target.value)}
              />
              {errors.maxRenderMb && <span className={styles.error}>{errors.maxRenderMb}</span>}
            </div>
          </div>
        </section>

        <section className={styles.section} hidden={tab !== 'interface'}>
          <div className={styles.row}>
            <span className={styles.text}>{t.prefs.theme}</span>
            <Segmented<ThemeSetting>
              label={t.prefs.theme}
              surface={2}
              size="md"
              value={draft.theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: t.prefs.themes.dark, icon: 'dark_mode' },
                { value: 'light', label: t.prefs.themes.light, icon: 'light_mode' },
                { value: 'system', label: t.prefs.themes.system, icon: 'contrast' },
              ]}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.text}>{t.prefs.zoom}</span>
            <div className={styles.inline}>
              <ZoomSelect value={draft.zoomFactor} onChange={setZoom} />
              <button type="button" className={styles.smallBtn} onClick={() => setZoom(1)}>
                {t.prefs.zoomReset}
              </button>
            </div>
          </div>
        </section>

        <section className={styles.section} hidden={tab !== 'profiles'}>
          <div className={styles.column}>
            <span>{t.prefs.currentProfile}</span>
            <div className={styles.inline}>
              <TextInput
                readOnly
                mono
                boxClassName={styles.pathBox}
                className={styles.pathInput}
                aria-label={t.prefs.currentProfile}
                value={profilePath ?? ''}
                placeholder={t.prefs.noProfile}
              />
              <Button
                variant="secondary"
                icon="folder_open"
                className={styles.folderBtn}
                disabled={!profilePath}
                onClick={() => void fileReveal()}
              >
                {t.prefs.openFolder}
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.section} hidden={tab !== 'updates'}>
          <div className={styles.row}>
            <div className={styles.text}>
              <span>{t.prefs.autoUpdate}</span>
              <span className={styles.hint}>{t.prefs.autoUpdateHint}</span>
            </div>
            <Switch
              label={t.prefs.autoUpdate}
              checked={draft.checkForUpdates}
              onChange={(v) => set('checkForUpdates', v)}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.text}>
              <span>{t.prefs.version}</span>
              <span className={`${styles.hint} ${styles.mono}`}>{appVersion}</span>
            </div>
            <Button variant="secondary" icon="sync" onClick={() => void window.api.invoke('update:check')}>
              {t.prefs.checkNow}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
