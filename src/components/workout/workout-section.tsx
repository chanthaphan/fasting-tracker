import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Dumbbell, LayoutTemplate, Play, Trash2, X } from 'lucide-react';
import { useAppState } from '../../context/app-context';
import { sessionSetCount, sessionVolume } from '../../utils/workout-stats';
import { formatHoursMinutes } from '../../utils/date-utils';
import { LiftRecordsModal } from './lift-records-modal';
import { SaveTemplateModal } from './save-template-modal';
import { WorkoutAiCard } from './workout-ai-card';
import type { WorkoutSession, WorkoutTemplate } from '../../types';

export function WorkoutSection() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [templateSource, setTemplateSource] = useState<WorkoutSession | null>(null);

  const activeSession = state.workoutSessions.find((s) => s.id === state.activeWorkoutId) ?? null;

  const recentWorkouts = useMemo(
    () =>
      state.workoutSessions
        .filter((s) => s.endTime !== null)
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 5),
    [state.workoutSessions]
  );

  const startWorkout = (template?: WorkoutTemplate) => {
    if (activeSession) {
      navigate('/workout');
      return;
    }
    dispatch({
      type: 'START_WORKOUT',
      payload: template
        ? {
            name: template.name,
            templateId: template.id,
            exercises: template.exercises.map((ex) => ({
              id: crypto.randomUUID(),
              name: ex.name,
              sets: Array.from({ length: ex.numSets }, () => ({
                id: crypto.randomUUID(),
                weightKg: ex.lastWeightKg ?? 0,
                reps: ex.lastReps ?? 0,
                completed: false,
              })),
            })),
          }
        : undefined,
    });
    navigate('/workout');
  };

  const deleteTemplate = (template: WorkoutTemplate) => {
    if (window.confirm(`Delete template "${template.name}"?`)) {
      dispatch({ type: 'DELETE_TEMPLATE', payload: { id: template.id } });
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <Dumbbell size={14} />
          WORKOUT
        </h2>
        {state.workoutSessions.some((s) => s.endTime !== null) && (
          <button
            onClick={() => setRecordsOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-orange-500"
          >
            <BarChart3 size={13} />
            Records
          </button>
        )}
      </div>

      {activeSession ? (
        <button
          onClick={() => navigate('/workout')}
          className="w-full flex items-center justify-between px-4 py-3 bg-orange-500 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-orange-500/25 mb-2"
        >
          <span>Resume {activeSession.name}</span>
          <span className="text-xs font-normal opacity-80">in progress</span>
        </button>
      ) : (
        <button
          onClick={() => startWorkout()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-orange-500/25 transition-colors mb-2"
        >
          <Play size={16} fill="white" />
          Start Workout
        </button>
      )}

      {state.workoutTemplates.length > 0 && !activeSession && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {state.workoutTemplates.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-xs font-medium text-orange-600 dark:text-orange-400"
            >
              <button onClick={() => startWorkout(t)} className="flex items-center gap-1">
                <LayoutTemplate size={12} />
                {t.name}
              </button>
              <button
                onClick={() => deleteTemplate(t)}
                aria-label={`Delete template ${t.name}`}
                className="p-0.5 rounded hover:text-red-500"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <WorkoutAiCard />

      {recentWorkouts.length > 0 && (
        <div className="space-y-2 mt-2">
          {recentWorkouts.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{w.name}</p>
                <p className="text-xs text-gray-400">
                  {w.date} · {formatHoursMinutes((w.endTime ?? w.startTime) - w.startTime)} · {sessionSetCount(w)} sets · {Math.round(sessionVolume(w)).toLocaleString()} kg
                </p>
              </div>
              <button
                onClick={() => setTemplateSource(w)}
                aria-label={`Save ${w.name} as template`}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <LayoutTemplate size={15} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete this workout?')) {
                    dispatch({ type: 'DELETE_WORKOUT', payload: { id: w.id } });
                  }
                }}
                aria-label={`Delete workout ${w.name}`}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <LiftRecordsModal open={recordsOpen} onClose={() => setRecordsOpen(false)} />
      <SaveTemplateModal open={templateSource !== null} onClose={() => setTemplateSource(null)} session={templateSource} />
    </div>
  );
}
