import { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { MEAL_TYPES } from '../../constants/meal-types';
import type { FoodEntry, MealType } from '../../types';

interface AddFoodModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; calories: number; protein: number; carbs: number; fat: number; mealType: MealType }) => void;
  editEntry?: FoodEntry | null;
}

export function AddFoodModal({ open, onClose, onSave, editEntry }: AddFoodModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');

  useEffect(() => {
    if (editEntry) {
      setName(editEntry.name);
      setCalories(String(editEntry.calories));
      setProtein(String(editEntry.protein));
      setCarbs(String(editEntry.carbs));
      setFat(String(editEntry.fat));
      setMealType(editEntry.mealType);
    } else {
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setMealType('breakfast');
    }
  }, [editEntry, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !calories) return;
    onSave({
      name: name.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      mealType,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit Food' : 'Add Food'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Food Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grilled Chicken"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">Meal</label>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMealType(m.value)}
                className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                  mealType === m.value
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="block text-base mb-0.5">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Calories</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="0"
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
              placeholder="0"
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
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          {editEntry ? 'Update' : 'Add Food'}
        </button>
      </form>
    </Modal>
  );
}
