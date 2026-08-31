import { Check, Trash2 } from 'lucide-react';
import type { WorkoutSet } from '../../types';

interface WorkoutSetRowProps {
  index: number;
  set: WorkoutSet;
  previous: WorkoutSet | null;
  onCommit: (changes: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
}

const inputClass =
  'w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

/**
 * Inputs are uncontrolled and keyed by the stored value: typing stays
 * local, blur commits to the store, and store-side changes (e.g. tick
 * auto-fill) remount the input with the fresh value.
 */
export function WorkoutSetRow({ index, set, previous, onCommit, onToggleComplete, onRemove }: WorkoutSetRowProps) {
  return (
    <div className={`grid grid-cols-[2rem_1fr_4.5rem_4rem_2.25rem_2rem] items-center gap-1.5 rounded-lg px-1 py-1 ${set.completed ? 'bg-green-50 dark:bg-green-900/15' : ''}`}>
      <span className="text-xs font-semibold text-gray-400 text-center">{index + 1}</span>
      <span className="text-xs text-gray-400 truncate">
        {previous ? `${previous.weightKg}×${previous.reps}` : '—'}
      </span>
      <input
        key={`w-${set.weightKg}`}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        defaultValue={set.weightKg > 0 ? set.weightKg : ''}
        onBlur={(e) => onCommit({ weightKg: Number(e.target.value) || 0 })}
        placeholder={previous ? String(previous.weightKg) : 'kg'}
        className={inputClass}
        aria-label={`Set ${index + 1} weight`}
      />
      <input
        key={`r-${set.reps}`}
        type="number"
        inputMode="numeric"
        min="0"
        defaultValue={set.reps > 0 ? set.reps : ''}
        onBlur={(e) => onCommit({ reps: Math.round(Number(e.target.value)) || 0 })}
        placeholder={previous ? String(previous.reps) : 'reps'}
        className={inputClass}
        aria-label={`Set ${index + 1} reps`}
      />
      <button
        type="button"
        onClick={onToggleComplete}
        aria-label={set.completed ? `Set ${index + 1} done` : `Mark set ${index + 1} done`}
        className={`h-8 rounded-lg flex items-center justify-center transition-colors ${
          set.completed
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <Check size={15} strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove set ${index + 1}`}
        className="h-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
