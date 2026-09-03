import type { PendingUndo } from '../../hooks/use-undo';

interface UndoToastProps {
  pending: PendingUndo | null;
  onUndo: () => void;
}

/** Bottom snackbar shown for a few seconds after a delete. */
export function UndoToast({ pending, onUndo }: UndoToastProps) {
  if (!pending) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-50 flex items-center gap-3 pl-4 pr-2 py-2 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg"
    >
      <span>{pending.label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="px-3 py-1 rounded-full bg-white/15 dark:bg-gray-900/10 text-brand-300 dark:text-brand-700 font-semibold"
      >
        Undo
      </button>
    </div>
  );
}
