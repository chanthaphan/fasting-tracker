import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { MealGroup } from './meal-group';
import { AddFoodModal } from './add-food-modal';
import { useAppState } from '../../context/app-context';
import { MEAL_TYPES } from '../../constants/meal-types';
import { sumMacros } from '../../utils/macro-calc';
import { todayKey } from '../../utils/date-utils';
import type { FoodEntry, MealType } from '../../types';

export function FoodLogPage() {
  const { state, dispatch } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null);

  const todayEntries = state.foodEntries.filter((e) => e.date === todayKey());
  const totals = sumMacros(todayEntries);

  const handleSave = (data: { name: string; calories: number; protein: number; carbs: number; fat: number; mealType: MealType }) => {
    if (editEntry) {
      dispatch({ type: 'EDIT_FOOD', payload: { ...editEntry, ...data } });
    } else {
      dispatch({ type: 'ADD_FOOD', payload: { ...data, date: todayKey() } });
    }
    setEditEntry(null);
  };

  const handleEdit = (entry: FoodEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_FOOD', payload: { id } });
  };

  return (
    <PageShell
      title="Food Log"
      action={
        <button
          onClick={() => { setEditEntry(null); setModalOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      }
    >
      {MEAL_TYPES.map((m) => (
        <MealGroup
          key={m.value}
          icon={m.icon}
          label={m.label}
          entries={todayEntries.filter((e) => e.mealType === m.value)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}

      {/* Daily totals bar */}
      <div className="sticky bottom-16 mt-4 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Today's Total</span>
          <span className="font-bold text-brand-600 dark:text-brand-400">{totals.calories} cal</span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-gray-500">
          <span>Protein: <b className="text-blue-500">{totals.protein}g</b></span>
          <span>Carbs: <b className="text-amber-500">{totals.carbs}g</b></span>
          <span>Fat: <b className="text-rose-500">{totals.fat}g</b></span>
        </div>
      </div>

      <AddFoodModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
      />
    </PageShell>
  );
}
