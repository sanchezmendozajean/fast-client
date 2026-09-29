import { useEffect, useRef, useState } from 'react';
import styles from './InlineRename.module.css';

export interface InlineRenameProps {
  value: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
  className?: string;
}

/** Enter confirms, Esc cancels, blur confirms; an empty name restores the previous one (caller trims). */
export function InlineRename({ value, onCommit, onCancel, className }: InlineRenameProps): JSX.Element {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (commit: boolean): void => {
    if (done.current) return;
    done.current = true;
    if (commit) onCommit(text);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      className={`${styles.input} ${className ?? ''}`}
      value={text}
      spellCheck={false}
      aria-label="Nombre"
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}
