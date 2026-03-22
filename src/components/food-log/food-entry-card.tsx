import { Pencil, Trash2 } from 'lucide-react';
import type { FoodEntry } from '../../types';

interface FoodEntryCardProps {
  entry: FoodEntry;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
}

export function FoodEntryCard({ entry, onEdit, onDelete }: FoodEntryCardProps) {
  return (
    <div className="flex items-center justify-between py-3 px-3 bg-white dark:bg-gray-900 rounded-xl mb-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{entry.name}</p>
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          <span className="font-semibold text-brand-600 dark:text-brand-400">{entry.calories} cal</span>
          <span>P {entry.protein}g</span>
          <span>C {entry.carbs}g</span>
          <span>F {entry.fat}g</span>
        </div>
      </div>
      <div className="flex gap-1 ml-2">
        <button
          onClick={() => onEdit(entry)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
