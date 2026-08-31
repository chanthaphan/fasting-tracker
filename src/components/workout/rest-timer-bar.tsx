import { useEffect, useState } from 'react';
import { Timer, X } from 'lucide-react';
import { DEFAULT_REST_SECONDS } from '../../constants/lift-presets';

interface RestTimerBarProps {
  endsAt: number; // Unix ms
  onAdjust: (newEndsAt: number | null) => void;
}

/**
 * Countdown driven by timestamp math, so it stays correct across
 * navigation and reloads (endsAt is persisted on the session).
 */
export function RestTimerBar({ endsAt, onAdjust }: RestTimerBarProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const timeout = setTimeout(update, 0);
    const interval = setInterval(update, 500);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  if (now === 0) return null; // first paint, before the clock effect runs
  const remainingMs = endsAt - now;
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  const progress = Math.min(remainingMs / (DEFAULT_REST_SECONDS * 1000), 1);

  return (
    <div className="sticky top-0 z-20 mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-2.5">
      <div className="flex items-center gap-2">
        <Timer size={16} className="text-orange-500 shrink-0" />
        <span className="text-lg font-bold font-mono text-orange-600 dark:text-orange-400 tabular-nums">
          {mm}:{ss}
        </span>
        <span className="text-xs text-gray-400">rest</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onAdjust(endsAt - 15000)}
          className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300"
        >
          −15s
        </button>
        <button
          type="button"
          onClick={() => onAdjust(endsAt + 15000)}
          className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300"
        >
          +15s
        </button>
        <button
          type="button"
          onClick={() => onAdjust(null)}
          aria-label="Skip rest"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500"
        >
          <X size={15} />
        </button>
      </div>
      <div className="mt-1.5 h-1 bg-orange-100 dark:bg-orange-900/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
