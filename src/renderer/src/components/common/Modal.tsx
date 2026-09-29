import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n/es';
import { Icon } from '../Icon/Icon';
import { IconButton } from './Button';
import styles from './Modal.module.css';

export interface ModalProps {
  title: string;
  icon?: string;
  iconTone?: 'muted' | 'accent' | 'danger';
  width?: number;
  onClose: () => void;
  /** Enter outside inputs/buttons triggers the primary action. */
  onEnter?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  closeButton?: boolean;
  labelledBy?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Modal shell (doc 05): scrim, --surface-1 card, footer on --bg, focus trap, Esc closes. */
export function Modal({
  title,
  icon,
  iconTone = 'muted',
  width = 440,
  onClose,
  onEnter,
  footer,
  children,
  closeButton = true,
}: ModalProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    restore.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first =
      el?.querySelector<HTMLElement>('[data-autofocus]') ??
      el?.querySelector<HTMLElement>('input, textarea') ??
      el?.querySelector<HTMLElement>('[data-primary]');
    (first ?? el)?.focus();
    return () => restore.current?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key === 'Enter' && onEnterRef.current) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag !== 'BUTTON' && tag !== 'TEXTAREA') {
        e.preventDefault();
        onEnterRef.current();
      }
      return;
    }
    if (e.key === 'Tab') {
      const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    e.stopPropagation();
  };

  return createPortal(
    <div className={styles.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={styles.card}
        style={{ width }}
        onKeyDown={onKeyDown}
      >
        <div className={styles.header}>
          {icon && <Icon name={icon} size={20} className={styles[`icon_${iconTone}`]} />}
          <span className={styles.title}>{title}</span>
          {closeButton && (
            <IconButton
              icon="close"
              label={t.prefs.close}
              tone="faint"
              onSurface1
              className={styles.close}
              onClick={onClose}
            />
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
