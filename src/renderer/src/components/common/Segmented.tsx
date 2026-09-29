import { Icon } from '../Icon/Icon';
import styles from './Segmented.module.css';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: string;
}

export interface SegmentedProps<V extends string> {
  value: V;
  options: readonly SegmentOption<V>[];
  onChange: (v: V) => void;
  label: string;
  /** Background of the track: surface-1 (editor toolbars) or surface-2 (modals). */
  surface?: 1 | 2;
  size?: 'sm' | 'md';
}

export function Segmented<V extends string>({
  value,
  options,
  onChange,
  label,
  surface = 1,
  size = 'sm',
}: SegmentedProps<V>): JSX.Element {
  const move = (dir: 1 | -1): void => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    if (next) onChange(next.value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${styles.group} ${surface === 2 ? styles.s2 : ''} ${size === 'md' ? styles.md : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1);
        else if (e.key === 'ArrowLeft') move(-1);
        else return;
        e.preventDefault();
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={`${styles.item} ${on ? styles.on : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <Icon name={o.icon} size={15} />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
