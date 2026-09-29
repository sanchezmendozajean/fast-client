import { useEffect, useRef } from 'react';
import type { ToastKind } from '@shared/types';
import { runToastCommand } from '../../actions/file-actions';
import { t } from '../../i18n/es';
import { TOAST_DURATIONS, useUiStore, type ToastEntry } from '../../store/ui-store';
import { Icon } from '../Icon/Icon';
import { IconButton } from '../common/Button';
import styles from './ToastStack.module.css';

const ICONS: Record<ToastKind, string> = {
  success: 'check_circle',
  info: 'info',
  warning: 'warning',
  error: 'error',
};

function ToastItem({ toast }: { toast: ToastEntry }): JSX.Element {
  const dismiss = useUiStore((s) => s.dismissToast);
  const remaining = useRef<number | null>(TOAST_DURATIONS[toast.kind]);
  const started = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const start = (): void => {
    if (remaining.current === null) return;
    started.current = performance.now();
    timer.current = window.setTimeout(() => dismiss(toast.id), remaining.current);
  };
  const pause = (): void => {
    if (remaining.current === null) return;
    window.clearTimeout(timer.current);
    remaining.current = Math.max(500, remaining.current - (performance.now() - started.current));
  };

  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAction = (): void => {
    dismiss(toast.id);
    if (toast.onAction) toast.onAction();
    else if (toast.action) runToastCommand(toast.action.command);
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.kind]}`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={start}
    >
      <Icon name={ICONS[toast.kind]} size={18} className={styles.icon} />
      <span className={styles.text}>{toast.text}</span>
      {toast.action && (
        <button type="button" className={styles.action} onClick={onAction}>
          {toast.action.label}
        </button>
      )}
      {toast.secondaryAction && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            dismiss(toast.id);
            runToastCommand(toast.secondaryAction!.command);
          }}
        >
          {toast.secondaryAction.label}
        </button>
      )}
      <IconButton icon="close" label={t.actions.close} box={24} iconSize={16} tone="faint" onSurface1 onClick={() => dismiss(toast.id)} />
    </div>
  );
}

export function ToastStack(): JSX.Element {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
