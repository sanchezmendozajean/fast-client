import { useUiStore } from '../../store/ui-store';
import { FloatingMenu } from './Menu';

export function ContextMenuHost(): JSX.Element | null {
  const menu = useUiStore((s) => s.contextMenu);
  const close = useUiStore((s) => s.closeContextMenu);
  if (!menu) return null;
  return <FloatingMenu key={`${menu.x},${menu.y}`} entries={menu.entries} x={menu.x} y={menu.y} onClose={close} minWidth={220} />;
}
