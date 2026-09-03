import { useState } from 'react';
import { Modal } from '../ui/modal';
import { useAppState } from '../../context/use-app-state';
import type { WorkoutSession, WorkoutTemplateExercise } from '../../types';

interface SaveTemplateModalProps {
  open: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
}

/** Outer wrapper mounts the form fresh each time it opens, so the name
 *  prefills from the session without any state-syncing effect. */
export function SaveTemplateModal({ open, onClose, session }: SaveTemplateModalProps) {
  if (!open || !session) return null;
  return <SaveTemplateForm onClose={onClose} session={session} />;
}

function SaveTemplateForm({ onClose, session }: { onClose: () => void; session: WorkoutSession }) {
  const { dispatch } = useAppState();
  const [name, setName] = useState(session.name !== 'Workout' ? session.name : '');

  const handleSave = () => {
    if (!name.trim()) return;
    const exercises: WorkoutTemplateExercise[] = session.exercises
      .filter((ex) => ex.sets.length > 0)
      .map((ex) => {
        const completed = ex.sets.filter((s) => s.completed);
        const top = completed.reduce(
          (best, s) => (best === null || s.weightKg > best.weightKg ? s : best),
          null as (typeof completed)[number] | null
        );
        return {
          name: ex.name,
          numSets: ex.sets.length,
          lastWeightKg: top?.weightKg,
          lastReps: top?.reps,
        };
      });
    if (exercises.length === 0) return;
    dispatch({ type: 'SAVE_TEMPLATE', payload: { name: name.trim(), exercises } });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Save as Template">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <p className="text-xs text-gray-400">
          {session.exercises.length} exercise{session.exercises.length === 1 ? '' : 's'} will be saved with their set counts and last weights.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
        >
          Save Template
        </button>
      </div>
    </Modal>
  );
}
