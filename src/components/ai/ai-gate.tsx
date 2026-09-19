import { useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { useAiReady } from '../../hooks/use-ai';
import { AiSettingsModal } from './ai-settings-modal';
import { OfflineNotice } from './offline-notice';
import { useT } from '../../i18n';

interface AiGateProps {
  /** Short description shown on the CTA card, e.g. "get a daily check-in" */
  feature: string;
  children: ReactNode;
}

/**
 * Renders children when an API key is configured; otherwise a
 * call-to-action card that opens the AI settings modal.
 */
export function AiGate({ feature, children }: AiGateProps) {
  const ready = useAiReady();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useT();

  if (ready) return <><OfflineNotice className="mb-2 px-1" />{children}</>;

  return (
    <>
      <button
        onClick={() => setSettingsOpen(true)}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-dashed border-gray-200 dark:border-gray-700 text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
      >
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
          <Sparkles size={15} className="text-brand-500" />
          {t('ai.setup')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {t('ai.setupHint', { feature })}
        </p>
      </button>
      <AiSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
