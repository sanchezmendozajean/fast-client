import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: string;
  iconFill?: boolean;
  /** 'md' = 32 px (default), 'sm' = 26 px, 'lg' = 40 px (Send). */
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', icon, iconFill, size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  const cls = [styles.btn, styles[variant], styles[size], icon ? styles.withIcon : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} fill={iconFill} />}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  /** Box size in px (default 28). */
  box?: number;
  iconSize?: number;
  tone?: 'muted' | 'faint';
  /** Hover background for buttons sitting on --surface-1. */
  onSurface1?: boolean;
  active?: boolean;
  fill?: boolean;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    box = 28,
    iconSize = 18,
    tone = 'muted',
    onSurface1,
    active,
    fill,
    tooltip,
    className,
    type = 'button',
    style,
    ...rest
  },
  ref,
) {
  const cls = [
    styles.iconBtn,
    tone === 'faint' ? styles.faint : '',
    onSurface1 ? styles.onSurface1 : '',
    active ? styles.active : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      aria-label={label}
      data-tooltip={tooltip ?? label}
      style={{ width: box, height: box, ...style }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} fill={fill ?? active} />
    </button>
  );
});
