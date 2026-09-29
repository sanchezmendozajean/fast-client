import styles from './Highlight.module.css';

/** Highlights case-insensitive matches of `query` inside `text`. */
export function Highlight({ text, query }: { text: string; query: string }): JSX.Element {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const parts: JSX.Element[] = [];
  const lower = text.toLowerCase();
  let i = 0;
  let k = 0;
  for (;;) {
    const at = lower.indexOf(q, i);
    if (at < 0) break;
    if (at > i) parts.push(<span key={k++}>{text.slice(i, at)}</span>);
    parts.push(
      <mark key={k++} className={styles.mark}>
        {text.slice(at, at + q.length)}
      </mark>,
    );
    i = at + q.length;
  }
  if (i < text.length) parts.push(<span key={k}>{text.slice(i)}</span>);
  return <>{parts}</>;
}
