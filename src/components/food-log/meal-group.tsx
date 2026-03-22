import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FoodEntry } from '../../types';
import { FoodEntryCard } from './food-entry-card';
import { sumMacros } from '../../utils/macro-calc';

interface MealGroupProps {
  icon: string;
  label: string;
  entries: FoodEntry[];
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
}

export function MealGroup({ icon, label, entries, onEdit, onDelete }: MealGroupProps) {
  const [open, setOpen] = useState(true);
  const totals = sumMacros(entries);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 px-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-gray-400">({entries.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{totals.calories} cal</span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {open && entries.length > 0 && (
        <div>
          {entries.map((entry) => (
            <FoodEntryCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
      {open && entries.length === 0 && (
        <p className="text-xs text-gray-400 py-2 px-3">No entries yet</p>
      )}
    </div>
  );
}
