import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/modal';
import { MEAL_TYPES } from '../../constants/meal-types';
import { FOOD_PRESET_CATEGORIES, type FoodPreset } from '../../constants/food-presets';
import { useAppState } from '../../context/app-context';
import type { FoodEntry, MealType } from '../../types';

interface AddFoodModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; calories: number; protein: number; carbs: number; fat: number; mealType: MealType }) => void;
  editEntry?: FoodEntry | null;
}

export function AddFoodModal({ open, onClose, onSave, editEntry }: AddFoodModalProps) {
  const { state } = useAppState();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [presetSearch, setPresetSearch] = useState('');
  const [showPresets, setShowPresets] = useState(true);

  useEffect(() => {
    if (editEntry) {
      setName(editEntry.name);
      setCalories(String(editEntry.calories));
      setProtein(String(editEntry.protein));
      setCarbs(String(editEntry.carbs));
      setFat(String(editEntry.fat));
      setMealType(editEntry.mealType);
      setShowPresets(false);
    } else {
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setMealType('breakfast');
      setPresetSearch('');
      setShowPresets(true);
    }
  }, [editEntry, open]);

  const handleSelectPreset = (preset: FoodPreset) => {
    setName(preset.name);
    setCalories(String(preset.calories));
    setProtein(String(preset.protein));
    setCarbs(String(preset.carbs));
    setFat(String(preset.fat));
    setShowPresets(false);
  };

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

  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    return [...state.foodEntries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((e) => {
        const key = e.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10)
      .map((e): FoodPreset => ({ name: e.name, emoji: '🕐', calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat }));
  }, [state.foodEntries]);

  const searchLower = presetSearch.trim().toLowerCase();

  const filteredRecent = searchLower
    ? recentFoods.filter((item) => item.name.toLowerCase().includes(searchLower))
    : recentFoods;

  const filteredCategories = searchLower
    ? FOOD_PRESET_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) =>
          item.name.toLowerCase().includes(searchLower)
        ),
      })).filter((cat) => cat.items.length > 0)
    : FOOD_PRESET_CATEGORIES;

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit Food' : 'Add Food'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Pick Presets - shown when adding new food */}
        {!editEntry && showPresets && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Quick Pick</label>
              <button
                type="button"
                onClick={() => setShowPresets(false)}
                className="text-xs text-brand-600 dark:text-brand-400 font-medium"
              >
                Manual entry
              </button>
            </div>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Search Thai dishes..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-3 -mx-1 px-1">
              {filteredRecent.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                    🕐 Recent
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredRecent.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleSelectPreset(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                        <span className="text-gray-400 dark:text-gray-500">{item.calories}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {filteredCategories.map((cat) => (
                <div key={cat.label}>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                    {cat.emoji} {cat.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleSelectPreset(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                        <span className="text-gray-400 dark:text-gray-500">{item.calories}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && filteredRecent.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No matches found</p>
              )}
            </div>
          </div>
        )}

        {/* Manual entry form - shown after picking a preset or switching to manual */}
        {(!showPresets || editEntry) && (
          <>
            {!editEntry && (
              <button
                type="button"
                onClick={() => { setShowPresets(true); setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); }}
                className="text-xs text-brand-600 dark:text-brand-400 font-medium"
              >
                ← Back to Quick Pick
              </button>
            )}
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
          </>
        )}
      </form>
    </Modal>
  );
}
