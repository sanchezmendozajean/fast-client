import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './TextInput.module.css';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  invalid?: boolean;
  /** Unit or trailing element shown inside the box (e.g. "s", "MB", a toggle button). */
  suffix?: ReactNode;
  boxClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { mono, invalid, suffix, boxClassName, className, ...rest },
  ref,
) {
  return (
    <span className={`${styles.box} ${invalid ? styles.invalid : ''} ${boxClassName ?? ''}`}>
      <input
        ref={ref}
        spellCheck={false}
        aria-invalid={invalid || undefined}
        className={`${styles.input} ${mono ? styles.mono : ''} ${className ?? ''}`}
        {...rest}
      />
      {suffix !== undefined && <span className={styles.suffix}>{suffix}</span>}
    </span>
  );
});
