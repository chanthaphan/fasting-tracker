import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/modal';
import { EXERCISE_PRESET_CATEGORIES, type ExercisePreset } from '../../constants/exercise-presets';
import { useAppState } from '../../context/app-context';
import { todayKey } from '../../utils/date-utils';
import type { ExerciseEntry } from '../../types';

interface AddExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; calories: number; durationMin: number; date: string; note?: string }) => void;
  editEntry?: ExerciseEntry | null;
}

export function AddExerciseModal({ open, onClose, onSave, editEntry }: AddExerciseModalProps) {
  const { state } = useAppState();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [duration, setDuration] = useState('30');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const [showPresets, setShowPresets] = useState(true);

  useEffect(() => {
    if (editEntry) {
      setName(editEntry.name);
      setCalories(String(editEntry.calories));
      setDuration(String(editEntry.durationMin));
      setDate(editEntry.date);
      setNote(editEntry.note ?? '');
      setShowPresets(false);
    } else {
      setName('');
      setCalories('');
      setDuration('30');
      setDate(todayKey());
      setNote('');
      setPresetSearch('');
      setShowPresets(true);
    }
  }, [editEntry, open]);

  const handleSelectPreset = (preset: ExercisePreset) => {
    const dur = Number(duration) || 30;
    const cal = Math.round((preset.caloriesPer30Min / 30) * dur);
    setName(preset.name);
    setCalories(String(cal));
    setShowPresets(false);
  };

  const handleDurationChangeForPreset = (newDur: string) => {
    setDuration(newDur);
    // If we have a selected preset, recalc calories
    const preset = EXERCISE_PRESET_CATEGORIES
      .flatMap((c) => c.items)
      .find((p) => p.name === name);
    if (preset && newDur) {
      const cal = Math.round((preset.caloriesPer30Min / 30) * Number(newDur));
      setCalories(String(cal));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !calories) return;
    onSave({
      name: name.trim(),
      calories: Number(calories) || 0,
      durationMin: Number(duration) || 0,
      date,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const recentExercises = useMemo(() => {
    const seen = new Set<string>();
    return [...state.exerciseEntries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((e) => {
        const key = e.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [state.exerciseEntries]);

  const searchLower = presetSearch.trim().toLowerCase();

  const filteredRecent = searchLower
    ? recentExercises.filter((item) => item.name.toLowerCase().includes(searchLower))
    : recentExercises;

  const filteredCategories = searchLower
    ? EXERCISE_PRESET_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) =>
          item.name.toLowerCase().includes(searchLower)
        ),
      })).filter((cat) => cat.items.length > 0)
    : EXERCISE_PRESET_CATEGORIES;

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit Exercise' : 'Log Exercise'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Pick Presets */}
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
                placeholder="Search exercises..."
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
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setName(item.name);
                          setCalories(String(item.calories));
                          setDuration(String(item.durationMin));
                          setShowPresets(false);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <span>{item.name}</span>
                        <span className="text-gray-400 dark:text-gray-500">{item.calories}cal</span>
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                        <span className="text-gray-400 dark:text-gray-500">{item.caloriesPer30Min}/30m</span>
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

        {/* Manual entry form */}
        {(!showPresets || editEntry) && (
          <>
            {!editEntry && (
              <button
                type="button"
                onClick={() => { setShowPresets(true); setName(''); setCalories(''); setDuration('30'); }}
                className="text-xs text-brand-600 dark:text-brand-400 font-medium"
              >
                ← Back to Quick Pick
              </button>
            )}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Activity Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Run"
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => handleDurationChangeForPreset(e.target.value)}
                  placeholder="30"
                  min="0"
                  className={`${inputClass} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">Calories Burned</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                  min="0"
                  className={`${inputClass} text-sm`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Felt great!"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
            >
              {editEntry ? 'Update' : 'Log Exercise'}
            </button>
          </>
        )}
      </form>
    </Modal>
  );
}
