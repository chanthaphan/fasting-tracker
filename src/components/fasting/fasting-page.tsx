import { useState, useMemo } from 'react';
import { PageShell } from '../layout/page-shell';
import { FastingRing } from './fasting-ring';
import { PhaseTimeline } from './phase-timeline';
import { EditFastingModal } from './edit-fasting-modal';
import { useFastingTimer } from '../../hooks/use-fasting-timer';
import { useAppState } from '../../context/app-context';
import { computeStreaks } from '../../utils/fasting-streak';
import { getFastingInsights } from '../../utils/fasting-science';
import { getDynamicPhases, getDynamicPhaseForElapsed, getFactorSummary, type FastingFactors } from '../../utils/dynamic-phases';
import { todayKey } from '../../utils/date-utils';
import { Play, Square, Pencil, Flame, Trophy, ChevronDown, ChevronUp, Zap, Droplets, Moon, Coffee } from 'lucide-react';
import type { FastingSession } from '../../types';

const FASTING_TARGETS = [
  { hours: 12, label: '12h', description: 'Beginner' },
  { hours: 16, label: '16:8', description: 'Popular' },
  { hours: 18, label: '18:6', description: 'Moderate' },
  { hours: 20, label: '20:4', description: 'Warrior' },
  { hours: 24, label: '24h', description: 'OMAD' },
  { hours: 36, label: '36h', description: 'Extended' },
  { hours: 48, label: '48h', description: 'Autophagy' },
  { hours: 72, label: '72h', description: 'Prolonged' },
];

export function FastingPage() {
  const { isActive, activeFast, elapsedMs, startFast, stopFast } = useFastingTimer();
  const { state, dispatch } = useAppState();
  const streaks = useMemo(() => computeStreaks(state.fastingSessions), [state.fastingSessions]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<FastingSession | null>(null);
  const [selectedTarget, setSelectedTarget] = useState(16);
  const [showFactors, setShowFactors] = useState(false);

  // Factor states
  const [sleepHours, setSleepHours] = useState(7);
  const [hydration, setHydration] = useState<'low' | 'normal' | 'high'>('normal');
  const [caffeine, setCaffeine] = useState(false);

  // Get today's exercise data from app state
  const today = todayKey();
  const todayExercise = useMemo(
    () => state.exerciseEntries.filter((e) => e.date === today),
    [state.exerciseEntries, today],
  );

  // Compute dynamic phases
  const factors: FastingFactors = useMemo(
    () => ({ exerciseEntries: todayExercise, sleepHours, hydration, caffeine }),
    [todayExercise, sleepHours, hydration, caffeine],
  );

  const dynamicPhases = useMemo(() => getDynamicPhases(factors), [factors]);
  const currentPhase = useMemo(
    () => (activeFast ? getDynamicPhaseForElapsed(elapsedMs, dynamicPhases) : null),
    [activeFast, elapsedMs, dynamicPhases],
  );
  const factorEffects = useMemo(() => getFactorSummary(factors), [factors]);

  const totalExerciseCals = todayExercise.reduce((s, e) => s + e.calories, 0);

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
        <FastingRing
          elapsedMs={elapsedMs}
          phase={currentPhase}
          isActive={isActive}
          targetHours={activeFast?.targetHours ?? selectedTarget}
          phases={dynamicPhases}
          startTime={activeFast?.startTime}
        />

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

        {/* Fasting Factors panel */}
        <div className="w-full">
          <button
            onClick={() => setShowFactors((v) => !v)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Zap size={14} />
              Dynamic Factors
              {factorEffects.length > 0 && (
                <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {factorEffects.length} active
                </span>
              )}
            </span>
            {showFactors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFactors && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
              {/* Exercise (auto-detected) */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap size={14} className="text-orange-500" />
                  <span className="text-xs font-semibold">Exercise Today</span>
                  <span className="text-[10px] text-gray-400 ml-auto">auto-detected</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {totalExerciseCals > 0 ? (
                    <span>{totalExerciseCals} cal burned · {todayExercise.length} session{todayExercise.length !== 1 ? 's' : ''}</span>
                  ) : (
                    <span className="text-gray-400">No exercise logged today</span>
                  )}
                </div>
              </div>

              {/* Sleep */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Moon size={14} className="text-indigo-500" />
                  <span className="text-xs font-semibold">Sleep Last Night</span>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-auto">{sleepHours}h</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                </div>
              </div>

              {/* Hydration */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Droplets size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold">Hydration</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'normal', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setHydration(level)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                        hydration === level
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {level === 'low' ? '🏜️ Low' : level === 'normal' ? '💧 Normal' : '🌊 High'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caffeine */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee size={14} className="text-amber-600" />
                  <span className="text-xs font-semibold">Caffeine Today</span>
                </div>
                <button
                  onClick={() => setCaffeine((v) => !v)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${
                    caffeine ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                      caffeine ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Effect summary */}
              {factorEffects.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1">
                  {factorEffects.map((effect) => (
                    <p key={effect} className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-brand-500 shrink-0" />
                      {effect}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fasting target picker (only when not fasting) */}
        {!isActive && (
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Choose Your Target</p>
            <div className="grid grid-cols-4 gap-2">
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

        {/* Science insights */}
        {isActive && (
          <div className="w-full">
            <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">What's Happening in Your Body</h3>
            <div className="space-y-2">
              {getFastingInsights(elapsedMs).map((insight) => (
                <div
                  key={insight.label}
                  className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {insight.icon} {insight.label}
                    </span>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{insight.value}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{insight.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="w-full mt-2">
          <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">Fasting Phases</h3>
          <PhaseTimeline elapsedMs={elapsedMs} isActive={isActive} phases={dynamicPhases} />
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
