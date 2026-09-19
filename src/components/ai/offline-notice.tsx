import { WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/use-online';
import { useT } from '../../i18n';

/** Small inline note for AI features while the device has no connection. */
export function OfflineNotice({ className = '' }: { className?: string }) {
  const online = useOnline();
  const { t } = useT();
  if (online) return null;
  return (
    <p role="status" className={`flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <WifiOff size={13} className="shrink-0" />
      {t('ai.offline')}
    </p>
  );
}
