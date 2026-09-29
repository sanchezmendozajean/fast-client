import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './TooltipLayer.module.css';

interface TipState {
  text: string;
  x: number;
  y: number;
  above: boolean;
}

const DELAY_MS = 500;
const EDGE = 8;

/** Global tooltip: any element with `data-tooltip` gets one after 500 ms of hover. */
export function TooltipLayer(): JSX.Element | null {
  const [tip, setTip] = useState<TipState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Clamp using the measured width so the tip is never squeezed against the window edge.
  useLayoutEffect(() => {
    const node = tipRef.current;
    if (!tip || !node) return;
    const w = node.offsetWidth;
    const left = Math.max(Math.min(tip.x - w / 2, window.innerWidth - EDGE - w), EDGE);
    node.style.left = `${left}px`;
    node.style.visibility = 'visible';
  }, [tip]);

  useEffect(() => {
    const hide = (): void => {
      window.clearTimeout(timer.current);
      current.current = null;
      setTip(null);
    };
    const over = (e: MouseEvent): void => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tooltip]') ?? null;
      if (el === current.current) return;
      hide();
      if (!el) return;
      current.current = el;
      timer.current = window.setTimeout(() => {
        const text = el.dataset.tooltip;
        if (!text || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        const above = r.bottom + 40 > window.innerHeight;
        setTip({ text, x: r.left + r.width / 2, y: above ? r.top - 6 : r.bottom + 6, above });
      }, DELAY_MS);
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('blur', hide);
    document.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mousedown', hide, true);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('blur', hide);
      document.removeEventListener('scroll', hide, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      ref={tipRef}
      role="tooltip"
      className={`${styles.tip} ${tip.above ? styles.above : ''}`}
      style={{ left: 0, top: tip.y, visibility: 'hidden' }}
    >
      {tip.text}
    </div>
  );
}
