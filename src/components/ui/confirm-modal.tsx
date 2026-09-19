import { Modal } from './modal';
import { useT } from '../../i18n';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive confirms are styled red */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** In-app replacement for window.confirm, styled like the rest of the app. */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const { t } = useT();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <div className="grid grid-cols-2 gap-2 mt-5">
        <button
          type="button"
          onClick={onClose}
          className="py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200"
        >
          {cancelLabel ?? t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          className={`py-2.5 rounded-xl text-sm font-semibold text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}`}
        >
          {confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}
