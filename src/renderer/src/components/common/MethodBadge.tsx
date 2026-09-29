import type { HttpMethod } from '@shared/types';
import styles from './MethodBadge.module.css';

export function methodColor(m: HttpMethod): string {
  return `var(--m-${m.toLowerCase()})`;
}

export function MethodBadge({ method, fixed }: { method: HttpMethod; fixed?: boolean }): JSX.Element {
  return (
    <span className={`${styles.badge} ${fixed ? styles.fixed : ''}`} style={{ color: methodColor(method) }}>
      {method}
    </span>
  );
}
