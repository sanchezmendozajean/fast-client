import { useState } from 'react';
import type { Id, KeyValue } from '@shared/types';
import { t } from '../../i18n/es';
import { useProfileStore } from '../../store/profile-store';
import { Button } from '../common/Button';
import { KeyValueTable } from '../common/KeyValueTable';
import { Modal } from '../common/Modal';
import styles from './VariablesDialog.module.css';

export function VariablesDialog({ collectionId, onClose }: { collectionId: Id; onClose: () => void }): JSX.Element | null {
  const col = useProfileStore((s) => s.profile?.collections.find((c) => c.id === collectionId));
  const [draft, setDraft] = useState<KeyValue[]>(() => col?.variables ?? []);
  if (!col) return null;
  const save = (): void => {
    useProfileStore.getState().setCollectionVariables(collectionId, draft.filter((v) => v.key.trim() !== '' || v.value !== ''));
    onClose();
  };
  return (
    <Modal
      title={t.dialogs.variablesTitle(col.name)}
      icon="data_object"
      width={640}
      onClose={onClose}
      footer={
        <>
          <span className={styles.spacer} />
          <Button variant="secondary" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" onClick={save} data-primary>
            {t.actions.save}
          </Button>
        </>
      }
    >
      <p className={styles.hint}>{t.dialogs.variablesHint}</p>
      <KeyValueTable
        label={t.ctx.variables}
        rows={draft}
        onChange={setDraft}
        createRow={(id, key, value) => ({ id, key, value, enabled: true })}
        keyPlaceholder="Nombre"
        valuePlaceholder="Valor"
      />
    </Modal>
  );
}
