import { useUiStore } from '../../store/ui-store';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import styles from './DialogHost.module.css';

/** Renders the confirmation dialog requested through `useUiStore().ask()`. */
export function DialogHost(): JSX.Element | null {
  const dialog = useUiStore((s) => s.dialog);
  const close = useUiStore((s) => s.closeDialog);
  if (!dialog) return null;
  const danger = dialog.tone === 'danger';
  return (
    <Modal
      title={dialog.title}
      icon={danger ? 'report' : 'help'}
      iconTone={danger ? 'danger' : 'accent'}
      width={dialog.buttons.length > 2 ? 520 : 440}
      onClose={() => close(dialog.cancelValue)}
      onEnter={() => close(dialog.primaryValue)}
      closeButton={false}
      footer={
        <div className={styles.buttons}>
          {dialog.buttons.map((b) => (
            <Button
              key={b.value}
              variant={b.variant}
              icon={b.icon}
              data-primary={b.value === dialog.primaryValue ? true : undefined}
              onClick={() => close(b.value)}
            >
              {b.label}
            </Button>
          ))}
        </div>
      }
    >
      <p className={styles.text}>{dialog.text}</p>
      {dialog.detail && <p className={styles.detail}>{dialog.detail}</p>}
    </Modal>
  );
}
