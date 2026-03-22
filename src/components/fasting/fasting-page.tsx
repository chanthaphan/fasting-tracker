import { PageShell } from '../layout/page-shell';
import { FastingRing } from './fasting-ring';
import { PhaseTimeline } from './phase-timeline';
import { useFastingTimer } from '../../hooks/use-fasting-timer';
import { Play, Square } from 'lucide-react';

export function FastingPage() {
  const { isActive, elapsedMs, currentPhase, startFast, stopFast } = useFastingTimer();

  return (
    <PageShell title="Fasting Timer">
      <div className="flex flex-col items-center gap-6">
        <FastingRing elapsedMs={elapsedMs} phase={currentPhase} isActive={isActive} />

        <button
          onClick={() => (isActive ? stopFast() : startFast())}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold text-white transition-all shadow-lg active:scale-95 ${
            isActive
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
              : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/25'
          }`}
        >
          {isActive ? (
            <>
              <Square size={18} fill="white" />
              Stop Fast
            </>
          ) : (
            <>
              <Play size={18} fill="white" />
              Start Fast
            </>
          )}
        </button>

        <div className="w-full mt-2">
          <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">Fasting Phases</h3>
          <PhaseTimeline elapsedMs={elapsedMs} isActive={isActive} />
        </div>
      </div>
    </PageShell>
  );
}
