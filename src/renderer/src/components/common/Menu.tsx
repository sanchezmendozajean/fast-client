import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import styles from './Menu.module.css';

export type MenuEntry =
  | {
      type: 'item';
      id: string;
      label: string;
      icon?: string;
      /** Icon colour override (e.g. method colours in the method dropdown). */
      iconColor?: string;
      labelClassName?: string;
      labelColor?: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      danger?: boolean;
      onSelect?: () => void;
      submenu?: MenuEntry[];
      /** Small remove button (disabled recent entries). */
      onRemove?: () => void;
      removeLabel?: string;
      title?: string;
    }
  | { type: 'separator' }
  | { type: 'label'; label: string };

type ItemEntry = Extract<MenuEntry, { type: 'item' }>;

export interface MenuPanelProps {
  entries: MenuEntry[];
  x: number;
  y: number;
  /** For submenus: x position to use when flipping to the left side. */
  flipX?: number;
  onClose: () => void;
  /** ← / → at the top level (menu bar behaviour). */
  onNavigate?: (dir: 'prev' | 'next') => void;
  minWidth?: number;
  label?: string;
  initialIndex?: number;
  isSubmenu?: boolean;
  className?: string;
  children?: ReactNode;
}

const isFocusable = (e: MenuEntry | undefined): e is ItemEntry => !!e && e.type === 'item' && !e.disabled;

export function MenuPanel({
  entries,
  x,
  y,
  flipX,
  onClose,
  onNavigate,
  minWidth = 240,
  label,
  initialIndex,
  isSubmenu,
  className,
}: MenuPanelProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [active, setActive] = useState<number>(() => {
    if (initialIndex !== undefined) return initialIndex;
    return entries.findIndex(isFocusable);
  });
  const [openSub, setOpenSub] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth - 4) left = flipX !== undefined ? flipX - r.width : window.innerWidth - r.width - 4;
    if (top + r.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - r.height - 4);
    setPos({ left: Math.max(4, left), top });
  }, [x, y, flipX]);

  useEffect(() => {
    if (openSub === null) ref.current?.focus({ preventScroll: true });
  }, [openSub]);

  const step = (dir: 1 | -1): void => {
    if (!entries.some(isFocusable)) return;
    let i = active;
    do {
      i = (i + dir + entries.length) % entries.length;
    } while (!isFocusable(entries[i]));
    setActive(i);
  };

  const activate = (i: number): void => {
    const e = entries[i];
    if (!isFocusable(e)) return;
    if (e.submenu) {
      setOpenSub(i);
      return;
    }
    onClose();
    e.onSelect?.();
  };

  const onKeyDown = (ev: React.KeyboardEvent): void => {
    if (openSub !== null) return;
    switch (ev.key) {
      case 'ArrowDown':
        step(1);
        break;
      case 'ArrowUp':
        step(-1);
        break;
      case 'Home':
        setActive(entries.findIndex(isFocusable));
        break;
      case 'End':
        for (let i = entries.length - 1; i >= 0; i--) if (isFocusable(entries[i])) return setActive(i);
        break;
      case 'Enter':
      case ' ':
        activate(active);
        break;
      case 'ArrowRight': {
        const e = entries[active];
        if (isFocusable(e) && e.submenu) setOpenSub(active);
        else onNavigate?.('next');
        break;
      }
      case 'ArrowLeft':
        if (isSubmenu) onClose();
        else onNavigate?.('prev');
        break;
      case 'Escape':
      case 'Tab':
        onClose();
        break;
      default:
        return;
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  const subEntry = openSub !== null ? entries[openSub] : undefined;
  const subAnchor = openSub !== null ? itemRefs.current[openSub]?.getBoundingClientRect() : undefined;

  return (
    <>
      <div
        ref={ref}
        role="menu"
        aria-label={label}
        tabIndex={-1}
        className={`${styles.panel} ${className ?? ''}`}
        style={{ left: pos.left, top: pos.top, minWidth }}
        onKeyDown={onKeyDown}
        onMouseDown={(e) => e.preventDefault()}
        data-menu-panel
      >
        {entries.map((e, i) => {
          if (e.type === 'separator') return <div key={`sep${i}`} role="separator" className={styles.sep} />;
          if (e.type === 'label')
            return (
              <div key={`lbl${i}`} className={styles.label}>
                {e.label}
              </div>
            );
          return (
            <div
              key={e.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              role={e.checked !== undefined ? 'menuitemradio' : 'menuitem'}
              aria-checked={e.checked}
              aria-disabled={e.disabled || undefined}
              aria-haspopup={e.submenu ? 'menu' : undefined}
              aria-expanded={e.submenu ? openSub === i : undefined}
              data-tooltip={e.title}
              className={[
                styles.item,
                i === active ? styles.active : '',
                e.disabled ? styles.disabled : '',
                e.danger ? styles.danger : '',
              ].join(' ')}
              onMouseEnter={() => {
                if (e.disabled) return;
                setActive(i);
                setOpenSub(e.submenu ? i : null);
              }}
              onClick={() => activate(i)}
            >
              {e.icon ? (
                <Icon name={e.icon} size={16} className={styles.icon} style={e.iconColor ? { color: e.iconColor } : undefined} />
              ) : (
                <span className={styles.iconSpace} />
              )}
              <span className={`${styles.text} ${e.labelClassName ?? ''}`} style={e.labelColor ? { color: e.labelColor } : undefined}>
                {e.label}
              </span>
              {e.shortcut && <span className={styles.shortcut}>{e.shortcut}</span>}
              {e.checked && <Icon name="check" size={16} className={styles.check} />}
              {e.submenu && <Icon name="chevron_right" size={16} className={styles.chevron} />}
              {e.onRemove && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={e.removeLabel}
                  data-tooltip={e.removeLabel}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    e.onRemove?.();
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {subEntry && subEntry.type === 'item' && subEntry.submenu && subAnchor && (
        <MenuPanel
          entries={subEntry.submenu}
          x={subAnchor.right + 2}
          y={subAnchor.top - 5}
          flipX={subAnchor.left - 2}
          isSubmenu
          minWidth={200}
          onClose={() => setOpenSub(null)}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}

export interface FloatingMenuProps extends Omit<MenuPanelProps, 'onClose'> {
  onClose: () => void;
  /** Elements whose clicks should not close the menu (its trigger button). */
  ignoreRefs?: React.RefObject<HTMLElement | null>[];
}

/** MenuPanel rendered in a portal that closes on outside click, window blur or resize. */
export function FloatingMenu({ onClose, ignoreRefs, ...props }: FloatingMenuProps): JSX.Element {
  useEffect(() => {
    const down = (e: MouseEvent): void => {
      const target = e.target as Node;
      if ((target as HTMLElement).closest?.('[data-menu-panel]')) return;
      if (ignoreRefs?.some((r) => r.current?.contains(target))) return;
      onClose();
    };
    window.addEventListener('mousedown', down, true);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', down, true);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose, ignoreRefs]);
  return createPortal(<MenuPanel {...props} onClose={onClose} />, document.body);
}
