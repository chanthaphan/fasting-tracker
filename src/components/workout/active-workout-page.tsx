import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useAppState } from '../../context/app-context';
import { WorkoutExerciseBlock } from './workout-exercise-block';
import { RestTimerBar } from './rest-timer-bar';
import { AddLiftModal } from './add-lift-modal';
import { WorkoutSummaryModal } from './workout-summary-modal';
import { getPreviousSets } from '../../utils/workout-stats';
import { formatDuration } from '../../utils/date-utils';
import { DEFAULT_REST_SECONDS } from '../../constants/lift-presets';
import type { WorkoutExercise, WorkoutSession } from '../../types';

export function ActiveWorkoutPage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [addLiftOpen, setAddLiftOpen] = useState(false);
  const [finishedSession, setFinishedSession] = useState<WorkoutSession | null>(null);
  const [now, setNow] = useState(0);

  const session = state.workoutSessions.find((s) => s.id === state.activeWorkoutId) ?? null;

  // Clock for the elapsed display and rest-timer visibility
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timeout = setTimeout(update, 0);
    const interval = setInterval(update, 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const previousByLift = useMemo(() => {
    if (!session) return new Map<string, ReturnType<typeof getPreviousSets>>();
    const others = state.workoutSessions.filter((s) => s.id !== session.id);
    const map = new Map<string, ReturnType<typeof getPreviousSets>>();
    for (const ex of session.exercises) {
      map.set(ex.id, getPreviousSets(others, ex.name));
    }
    return map;
  }, [state.workoutSessions, session]);

  if (!session) {
    if (finishedSession) {
      return (
        <div className="flex-1">
          <WorkoutSummaryModal
            open
            onClose={() => { setFinishedSession(null); navigate('/exercise'); }}
            session={finishedSession}
          />
        </div>
      );
    }
    return <Navigate to="/exercise" replace />;
  }

  const update = (changes: Partial<WorkoutSession>) => {
    dispatch({ type: 'UPDATE_WORKOUT', payload: { ...session, ...changes } });
  };

  const updateExercise = (exercise: WorkoutExercise, opts?: { setJustCompleted?: boolean }) => {
    update({
      exercises: session.exercises.map((ex) => (ex.id === exercise.id ? exercise : ex)),
      ...(opts?.setJustCompleted ? { restTimerEndsAt: Date.now() + DEFAULT_REST_SECONDS * 1000 } : {}),
    });
  };

  const addExercise = (name: string) => {
    const previous = getPreviousSets(state.workoutSessions.filter((s) => s.id !== session.id), name);
    const numSets = previous?.length ?? 3;
    update({
      exercises: [
        ...session.exercises,
        {
          id: crypto.randomUUID(),
          name,
          sets: Array.from({ length: numSets }, () => ({
            id: crypto.randomUUID(),
            weightKg: 0,
            reps: 0,
            completed: false,
          })),
        },
      ],
    });
  };

  const handleFinish = () => {
    const endTime = Date.now();
    setFinishedSession({ ...session, endTime, restTimerEndsAt: null });
    dispatch({ type: 'FINISH_WORKOUT', payload: { id: session.id, endTime } });
  };

  const handleCancel = () => {
    if (!window.confirm('Discard this workout? Logged sets will be lost.')) return;
    dispatch({ type: 'CANCEL_WORKOUT', payload: { id: session.id } });
    navigate('/exercise');
  };

  const hasCompletedSet = session.exercises.some((ex) => ex.sets.some((s) => s.completed));

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleCancel}
            aria-label="Cancel workout"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={session.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full bg-transparent text-lg font-bold focus:outline-none"
              aria-label="Workout name"
            />
            <p className="text-xs text-gray-400 font-mono">{now > 0 ? formatDuration(now - session.startTime) : '—'}</p>
          </div>
          <button
            onClick={handleFinish}
            disabled={!hasCompletedSet}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
          >
            Finish
          </button>
        </div>

        {session.restTimerEndsAt != null && now > 0 && session.restTimerEndsAt > now && (
          <RestTimerBar
            endsAt={session.restTimerEndsAt}
            onAdjust={(newEndsAt) => update({ restTimerEndsAt: newEndsAt })}
          />
        )}

        <div className="space-y-3">
          {session.exercises.map((ex) => (
            <WorkoutExerciseBlock
              key={ex.id}
              exercise={ex}
              previousSets={previousByLift.get(ex.id) ?? null}
              onChange={updateExercise}
              onRemove={() => update({ exercises: session.exercises.filter((e) => e.id !== ex.id) })}
            />
          ))}
        </div>

        <button
          onClick={() => setAddLiftOpen(true)}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-dashed border-orange-300 dark:border-orange-800 text-sm font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          <Plus size={16} />
          Add Exercise
        </button>

        <textarea
          value={session.note ?? ''}
          onChange={(e) => update({ note: e.target.value || undefined })}
          placeholder="Workout notes..."
          rows={2}
          className="w-full mt-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none"
        />
      </div>

      <AddLiftModal open={addLiftOpen} onClose={() => setAddLiftOpen(false)} onSelect={addExercise} />
    </div>
  );
}
