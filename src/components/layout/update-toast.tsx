import { RefreshCw, X } from 'lucide-react';
import { useServiceWorker } from '../../hooks/use-service-worker';

/** "New version available" snackbar driven by the service worker. */
export function UpdateToast() {
  const { needRefresh, update, dismiss } = useServiceWorker();
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-50 flex items-center gap-2 pl-4 pr-1.5 py-2 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg"
    >
      <span>New version available</span>
      <button
        type="button"
        onClick={update}
        className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 dark:bg-gray-900/10 text-brand-300 dark:text-brand-700 font-semibold"
      >
        <RefreshCw size={14} />
        Reload
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="p-1 rounded-full text-gray-400 hover:text-white dark:hover:text-gray-900">
        <X size={14} />
      </button>
    </div>
  );
}
