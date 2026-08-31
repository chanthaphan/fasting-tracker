import { useState } from 'react';
import { Info, Plus, X } from 'lucide-react';
import { WorkoutSetRow } from './workout-set-row';
import { ExerciseInfoModal } from './exercise-info-modal';
import { getExerciseInfo } from '../../constants/exercise-info';
import type { WorkoutExercise, WorkoutSet } from '../../types';

interface WorkoutExerciseBlockProps {
  exercise: WorkoutExercise;
  previousSets: WorkoutSet[] | null;
  /** setJustCompleted lets the parent start the rest timer in the SAME
   *  state update — two separate dispatches would clobber each other. */
  onChange: (exercise: WorkoutExercise, opts?: { setJustCompleted?: boolean }) => void;
  onRemove: () => void;
}

export function WorkoutExerciseBlock({ exercise, previousSets, onChange, onRemove }: WorkoutExerciseBlockProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const hasInfo = getExerciseInfo(exercise.name) !== undefined;
  const prevFor = (i: number): WorkoutSet | null =>
    previousSets ? previousSets[i] ?? previousSets[previousSets.length - 1] ?? null : null;

  const updateSet = (id: string, changes: Partial<WorkoutSet>) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map((s) => (s.id === id ? { ...s, ...changes } : s)),
    });
  };

  const toggleComplete = (set: WorkoutSet, index: number) => {
    const nowCompleted = !set.completed;
    const prev = prevFor(index);
    onChange(
      {
        ...exercise,
        sets: exercise.sets.map((s) =>
          s.id === set.id
            ? {
                ...s,
                completed: nowCompleted,
                // Ticking an empty row adopts the placeholder values
                weightKg: nowCompleted && s.weightKg <= 0 && prev ? prev.weightKg : s.weightKg,
                reps: nowCompleted && s.reps <= 0 && prev ? prev.reps : s.reps,
              }
            : s
        ),
      },
      { setJustCompleted: nowCompleted }
    );
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({
      ...exercise,
      sets: [
        ...exercise.sets,
        {
          id: crypto.randomUUID(),
          weightKg: last?.weightKg ?? 0,
          reps: last?.reps ?? 0,
          completed: false,
        },
      ],
    });
  };

  const removeSet = (id: string) => {
    onChange({ ...exercise, sets: exercise.sets.filter((s) => s.id !== id) });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 min-w-0">
          <h3 className="text-sm font-semibold text-orange-500 truncate">{exercise.name}</h3>
          {hasInfo && (
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label={`How to do ${exercise.name}`}
              className="p-1 rounded-lg text-gray-400 hover:text-orange-500 shrink-0"
            >
              <Info size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${exercise.name}`}
          className="p-1 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-[2rem_1fr_4.5rem_4rem_2.25rem_2rem] gap-1.5 px-1 mb-1 text-[10px] font-semibold text-gray-400 uppercase">
        <span className="text-center">Set</span>
        <span>Previous</span>
        <span className="text-center">kg</span>
        <span className="text-center">Reps</span>
        <span className="text-center">✓</span>
        <span />
      </div>

      <div className="space-y-1">
        {exercise.sets.map((set, i) => (
          <WorkoutSetRow
            key={set.id}
            index={i}
            set={set}
            previous={prevFor(i)}
            onCommit={(changes) => updateSet(set.id, changes)}
            onToggleComplete={() => toggleComplete(set, i)}
            onRemove={() => removeSet(set.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Plus size={13} />
        Add Set
      </button>

      <ExerciseInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} liftName={exercise.name} />
    </div>
  );
}
