import type { CSSProperties } from 'react';
import styles from './Icon.module.css';

export interface IconProps {
  name: string;
  size?: number;
  fill?: boolean;
  weight?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible label; without it the icon is decorative (aria-hidden). */
  label?: string;
}

/** Material Symbols Rounded, bundled locally (R2). */
export function Icon({ name, size = 18, fill = false, weight = 400, className, style, label }: IconProps): JSX.Element {
  return (
    <span
      className={`material-symbols-rounded ${styles.icon}${className ? ` ${className}` : ''}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 20`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
