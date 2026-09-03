import { useState } from 'react';
import { Modal } from '../ui/modal';
import type { MacroGoals } from '../../types';

interface GoalsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (goals: MacroGoals) => void;
  currentGoals: MacroGoals;
}

/** Mounted only while open, so the form below starts fresh (or from the entry) on every open. */
export function GoalsModal(props: GoalsModalProps) {
  if (!props.open) return null;
  return <GoalsForm key={'goals'} {...props} />;
}

function GoalsForm({ open, onClose, onSave, currentGoals }: GoalsModalProps) {
  const [calories, setCalories] = useState(() => String(currentGoals.calories));
  const [protein, setProtein] = useState(() => String(currentGoals.protein));
  const [carbs, setCarbs] = useState(() => String(currentGoals.carbs));
  const [fat, setFat] = useState(() => String(currentGoals.fat));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Daily Goals">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Calories</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="2000"
            min="0"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="150"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">Carbs (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="200"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">Fat (g)</label>
            <input
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="65"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          Save Goals
        </button>
      </form>
    </Modal>
  );
}
