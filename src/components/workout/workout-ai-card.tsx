import { Loader2, Play, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/app-context';
import { useAiReady } from '../../hooks/use-ai';
import { useWorkoutAi } from '../../hooks/use-workout-ai';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';

/**
 * AI next-workout suggestion — hidden without an API key (the CTA for
 * setting one up lives on the dashboard); cached per day.
 */
export function WorkoutAiCard() {
  const ready = useAiReady();
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const { plan, loading, error, getPlan } = useWorkoutAi();

  if (!ready) return null;

  const hasHistory = state.workoutSessions.some((s) => s.endTime !== null);
  if (!hasHistory && !plan) return null;

  const startPlannedWorkout = () => {
    if (!plan || state.activeWorkoutId) return;
    dispatch({
      type: 'START_WORKOUT',
      payload: {
        name: 'AI Workout',
        exercises: plan.exercises.map((ex) => ({
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
      {!plan && (
        <button
          onClick={getPlan}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white dark:bg-gray-900 border border-dashed border-orange-200 dark:border-orange-800 rounded-xl text-xs font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Planning…' : 'Suggest next workout (AI)'}
        </button>
      )}

      {plan && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-orange-100 dark:border-orange-900/50">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <Sparkles size={14} className="text-orange-500" />
              Suggested workout
            </p>
            {!state.activeWorkoutId && (
              <button
                onClick={startPlannedWorkout}
                className="flex items-center gap-1 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Play size={11} fill="white" />
                Start
              </button>
            )}
          </div>
          <div className="space-y-1">
            {plan.exercises.map((ex, i) => (
              <p key={`${ex.name}-${i}`} className="text-sm text-gray-700 dark:text-gray-300">
                {ex.name}
                <span className="text-xs text-gray-400">
                  {' '}· {ex.sets}×{ex.targetReps}{ex.targetWeightKg > 0 ? ` @ ${ex.targetWeightKg}kg` : ''}
                </span>
              </p>
            ))}
          </div>
          {plan.reason && <p className="text-[11px] text-gray-400 mt-1.5">{plan.reason}</p>}
          <p className="text-[10px] text-gray-400 mt-1.5">{HEALTH_DISCLAIMER.en} · {HEALTH_DISCLAIMER.th}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium mt-1.5">{error}</p>}
    </div>
  );
}
