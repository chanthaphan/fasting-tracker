import { useState, useMemo } from 'react';
import { PageShell } from '../layout/page-shell';
import { FastingRing } from './fasting-ring';
import { PhaseTimeline } from './phase-timeline';
import { EditFastingModal } from './edit-fasting-modal';
import { useFastingTimer } from '../../hooks/use-fasting-timer';
import { useAppState } from '../../context/app-context';
import { computeStreaks } from '../../utils/fasting-streak';
import { Play, Square, Pencil, Flame, Trophy } from 'lucide-react';
import type { FastingSession } from '../../types';

const FASTING_TARGETS = [
  { hours: 12, label: '12h', description: 'Beginner' },
  { hours: 14, label: '14h', description: 'Light' },
  { hours: 16, label: '16:8', description: 'Popular' },
  { hours: 18, label: '18:6', description: 'Moderate' },
  { hours: 20, label: '20:4', description: 'Warrior' },
  { hours: 24, label: '24h', description: 'OMAD' },
];

export function FastingPage() {
  const { isActive, activeFast, elapsedMs, currentPhase, startFast, stopFast } = useFastingTimer();
  const { state, dispatch } = useAppState();
  const streaks = useMemo(() => computeStreaks(state.fastingSessions), [state.fastingSessions]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<FastingSession | null>(null);
  const [selectedTarget, setSelectedTarget] = useState(16);

  const handleEditSave = (id: string, startTime: number, endTime: number | null) => {
    dispatch({ type: 'EDIT_FAST', payload: { id, startTime, endTime } });
  };

  const targetMs = activeFast?.targetHours ? activeFast.targetHours * 3600000 : selectedTarget * 3600000;
  const progressPercent = isActive ? Math.min((elapsedMs / targetMs) * 100, 100) : 0;

  return (
    <PageShell
      title="Fasting Timer"
      action={
        isActive && activeFast ? (
          <button
            onClick={() => {
              setEditSession(activeFast);
              setEditModalOpen(true);
            }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Pencil size={18} className="text-gray-500" />
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center gap-6">
        <FastingRing elapsedMs={elapsedMs} phase={currentPhase} isActive={isActive} />

        {/* Target progress */}
        {isActive && (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Target: {activeFast?.targetHours ?? selectedTarget}h</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Fasting target picker (only when not fasting) */}
        {!isActive && (
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Choose Your Target</p>
            <div className="grid grid-cols-3 gap-2">
              {FASTING_TARGETS.map((t) => (
                <button
                  key={t.hours}
                  onClick={() => setSelectedTarget(t.hours)}
                  className={`py-2.5 px-2 rounded-xl text-center transition-all ${
                    selectedTarget === t.hours
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                      : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="block text-sm font-bold">{t.label}</span>
                  <span className={`text-[10px] ${selectedTarget === t.hours ? 'text-white/80' : 'text-gray-400'}`}>{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => (isActive ? stopFast() : startFast(selectedTarget))}
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
              Start {selectedTarget}h Fast
            </>
          )}
        </button>

        {/* Streak card */}
        {(streaks.current > 0 || streaks.longest > 0) && (
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-center">
              <Flame size={18} className="mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{streaks.current}</p>
              <p className="text-xs text-gray-400">Current Streak</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-center">
              <Trophy size={18} className="mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{streaks.longest}</p>
              <p className="text-xs text-gray-400">Longest Streak</p>
            </div>
          </div>
        )}

        <div className="w-full mt-2">
          <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">Fasting Phases</h3>
          <PhaseTimeline elapsedMs={elapsedMs} isActive={isActive} />
        </div>
      </div>

      <EditFastingModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditSession(null); }}
        onSave={handleEditSave}
        session={editSession}
      />
    </PageShell>
  );
}
