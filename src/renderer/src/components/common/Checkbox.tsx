import { Icon } from '../Icon/Icon';
import styles from './Checkbox.module.css';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Checkbox({ checked, onChange, label }: CheckboxProps): JSX.Element {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.box} ${checked ? styles.on : ''}`}
      onClick={() => onChange(!checked)}
    >
      {checked && <Icon name="check" size={13} weight={600} />}
    </button>
  );
}
