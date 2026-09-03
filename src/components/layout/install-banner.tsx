import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/use-install-prompt';

/** Dismissible "Add to Home Screen" card shown when the browser offers installation. */
export function InstallBanner() {
  const { available, install, dismiss } = useInstallPrompt();
  if (!available) return null;
  return (
    <div className="flex items-center gap-3 mb-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/50">
      <Download size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Install the app</p>
        <p className="text-xs text-brand-600/80 dark:text-brand-400/80">Full-screen, works offline, opens from your home screen.</p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
      >
        Install
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="p-1 rounded-lg text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-900/40">
        <X size={16} />
      </button>
    </div>
  );
}
