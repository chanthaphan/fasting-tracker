import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, Play, RefreshCw, Settings2, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/use-app-state';
import { useAiReady } from '../../hooks/use-ai';
import { useWeeklyPlan } from '../../hooks/use-weekly-plan';
import { TrainingGoalModal } from './training-goal-modal';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';
import { DAY_NAMES, todayKey } from '../../utils/date-utils';

/**
 * AI weekly training plan: 7-day strip scheduled around the user's
 * preferred days, lift targets, and fasting pattern.
 */
export function WeeklyPlanCard() {
  const ready = useAiReady();
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const { plan, loading, error, getPlan } = useWeeklyPlan();
  const [goalOpen, setGoalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!ready) return null;

  const goal = state.trainingGoal;
  const today = todayKey();
  // A cached plan whose week has fully passed (long-lived tab) renders as "no plan"
  const currentPlan = plan && plan.days.some((d) => d.date === today) ? plan : null;
  // A selection from a regenerated/previous plan falls back to today
  const activeDate = selectedDate && currentPlan?.days.some((d) => d.date === selectedDate) ? selectedDate : today;
  const selectedDay = currentPlan?.days.find((d) => d.date === activeDate) ?? null;

  const startPlannedWorkout = () => {
    if (!selectedDay?.exercises || state.activeWorkoutId) return;
    dispatch({
      type: 'START_WORKOUT',
      payload: {
        name: selectedDay.name ?? 'AI Workout',
        exercises: selectedDay.exercises.map((ex) => ({
          id: crypto.randomUUID(),
          name: ex.name,
          sets: Array.from({ length: ex.sets }, () => ({
            id: crypto.randomUUID(),
            weightKg: ex.targetWeightKg,
            reps: ex.targetReps,
            completed: false,
          })),
        })),
      },
    });
    navigate('/workout');
  };

  return (
    <div className="mb-2">
      {!goal && (
        <button
          onClick={() => setGoalOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white dark:bg-gray-900 border border-dashed border-orange-200 dark:border-orange-800 rounded-xl text-xs font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          <Sparkles size={14} />
          Set up your training plan (targets, days, fasting-aware)
        </button>
      )}

      {goal && !currentPlan && (
        <button
          onClick={() => getPlan()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white dark:bg-gray-900 border border-dashed border-orange-200 dark:border-orange-800 rounded-xl text-xs font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
          {loading ? 'Planning your week…' : 'Plan my week (AI)'}
        </button>
      )}

      {goal && currentPlan && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-orange-100 dark:border-orange-900/50">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <Sparkles size={14} className="text-orange-500" />
              This week's plan
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setGoalOpen(true)}
                aria-label="Edit training goal"
                className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500"
              >
                <Settings2 size={14} />
              </button>
              <button
                onClick={() => getPlan(true)}
                disabled={loading}
                aria-label="Regenerate plan"
                className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 disabled:opacity-40"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* 7-day strip */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {currentPlan.days.map((d) => {
              const isSelected = d.date === activeDate;
              const isToday = d.date === today;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
                    isSelected ? 'bg-orange-50 dark:bg-orange-900/25' : ''
                  } ${isToday ? 'ring-1 ring-orange-400' : ''}`}
                >
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {DAY_NAMES[new Date(d.date + 'T00:00:00').getDay()].slice(0, 2)}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      d.type === 'workout' ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Selected day details */}
          {selectedDay && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
              {selectedDay.type === 'workout' ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{selectedDay.name ?? 'Workout'}</p>
                    {selectedDay.date === today && !state.activeWorkoutId && (
                      <button
                        onClick={startPlannedWorkout}
                        className="flex items-center gap-1 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Play size={11} fill="white" />
                        Start
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {selectedDay.exercises?.map((ex, i) => (
                      <p key={`${ex.name}-${i}`} className="text-sm text-gray-700 dark:text-gray-300">
                        {ex.name}
                        <span className="text-xs text-gray-400">
                          {' '}· {ex.sets}×{ex.targetReps}{ex.targetWeightKg > 0 ? ` @ ${ex.targetWeightKg}kg` : ''}
                        </span>
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Rest day</p>
              )}
              {selectedDay.note && <p className="text-[11px] text-gray-400 mt-1.5">{selectedDay.note}</p>}
            </div>
          )}

          {currentPlan.reason && <p className="text-[11px] text-gray-400 mt-2">{currentPlan.reason}</p>}
          <p className="text-[10px] text-gray-400 mt-1.5">{HEALTH_DISCLAIMER.en} · {HEALTH_DISCLAIMER.th}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium mt-1.5">{error}</p>}

      <TrainingGoalModal open={goalOpen} onClose={() => setGoalOpen(false)} onSaved={(saved) => getPlan(true, saved)} />
    </div>
  );
}
