import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/modal';
import { MEAL_TYPES } from '../../constants/meal-types';
import { FOOD_PRESET_CATEGORIES, type FoodPreset } from '../../constants/food-presets';
import { useAppState } from '../../context/use-app-state';
import { AiGate } from '../ai/ai-gate';
import { AiFoodInput } from './ai-food-input';
import type { FoodEntry, MealType, ParsedFoodItem } from '../../types';
import { todayKey } from '../../utils/date-utils';
import { useT } from '../../i18n';

type EntryMode = 'presets' | 'ai' | 'manual';

/** What the form hands back; sodium is omitted when the user left it blank. */
export interface FoodDraft {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium?: number;
  sugar?: number;
  mealType: MealType;
  date: string;
}

interface AddFoodModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FoodDraft) => void;
  editEntry?: FoodEntry | null;
  /** Tab to open on when adding (ignored while editing) */
  initialMode?: EntryMode;
  /** Day the entry is logged to when adding; defaults to today */
  date?: string;
}

/** Mounted only while open, so the form below starts fresh (or from the entry) on every open. */
export function AddFoodModal(props: AddFoodModalProps) {
  if (!props.open) return null;
  return <AddFoodForm key={props.editEntry?.id ?? `new-${props.initialMode ?? 'presets'}`} {...props} />;
}

function AddFoodForm({ open, onClose, onSave, editEntry, initialMode = 'presets', date: defaultDate }: AddFoodModalProps) {
  const { state } = useAppState();
  const { t, isThai } = useT();
  // The adult mode keeps things simple: no AI entry
  const aiAvailable = state.appMode !== 'adult';
  const [name, setName] = useState(() => editEntry?.name ?? '');
  const [calories, setCalories] = useState(() => (editEntry ? String(editEntry.calories) : ''));
  const [protein, setProtein] = useState(() => (editEntry ? String(editEntry.protein) : ''));
  const [carbs, setCarbs] = useState(() => (editEntry ? String(editEntry.carbs) : ''));
  const [fat, setFat] = useState(() => (editEntry ? String(editEntry.fat) : ''));
  const [sodium, setSodium] = useState(() => (editEntry?.sodium !== undefined ? String(editEntry.sodium) : ''));
  const [sugar, setSugar] = useState(() => (editEntry?.sugar !== undefined ? String(editEntry.sugar) : ''));
  const [mealType, setMealType] = useState<MealType>(() => editEntry?.mealType ?? 'breakfast');
  const [presetSearch, setPresetSearch] = useState('');
  const [mode, setMode] = useState<EntryMode>(() => (editEntry ? 'manual' : initialMode === 'ai' && !aiAvailable ? 'presets' : initialMode));
  const [date, setDate] = useState(() => editEntry?.date ?? defaultDate ?? todayKey());

  const displayName = (preset: FoodPreset) => (isThai && preset.nameTh ? preset.nameTh : preset.name);

  const handleSelectPreset = (preset: FoodPreset) => {
    setName(displayName(preset));
    setCalories(String(preset.calories));
    setProtein(String(preset.protein));
    setCarbs(String(preset.carbs));
    setFat(String(preset.fat));
    setSodium(preset.sodium !== undefined ? String(preset.sodium) : '');
    setSugar(preset.sugar !== undefined ? String(preset.sugar) : '');
    setMode('manual');
  };

  const handleAiAddItems = (items: ParsedFoodItem[]) => {
    for (const item of items) onSave({ ...item, date });
    onClose();
  };

  const handleAiEditItem = (item: ParsedFoodItem) => {
    setName(item.name);
    setCalories(String(item.calories));
    setProtein(String(item.protein));
    setCarbs(String(item.carbs));
    setFat(String(item.fat));
    setSodium(item.sodium !== undefined ? String(item.sodium) : '');
    setSugar(item.sugar !== undefined ? String(item.sugar) : '');
    setMealType(item.mealType);
    setMode('manual');
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
      ...(sodium.trim() !== '' ? { sodium: Math.max(0, Number(sodium) || 0) } : {}),
      ...(sugar.trim() !== '' ? { sugar: Math.max(0, Number(sugar) || 0) } : {}),
      mealType,
      date,
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
      .map((e): FoodPreset => ({ name: e.name, emoji: '🕐', calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat, sodium: e.sodium, sugar: e.sugar }));
  }, [state.foodEntries]);

  const searchLower = presetSearch.trim().toLowerCase();
  const matches = (item: FoodPreset) =>
    item.name.toLowerCase().includes(searchLower) || (item.nameTh?.toLowerCase().includes(searchLower) ?? false);

  const filteredRecent = searchLower ? recentFoods.filter(matches) : recentFoods;

  const filteredCategories = searchLower
    ? FOOD_PRESET_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(matches),
      })).filter((cat) => cat.items.length > 0)
    : FOOD_PRESET_CATEGORIES;

  const modes: { v: EntryMode; label: string }[] = [
    { v: 'presets', label: t('food.quickPick') },
    ...(aiAvailable ? [{ v: 'ai' as const, label: t('food.ai') }] : []),
    { v: 'manual', label: t('food.manual') },
  ];

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? t('food.editFood') : t('food.addFood')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode switcher - shown when adding new food */}
        {!editEntry && (
          <div className={`grid ${modes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl`}>
            {modes.map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mode === v
                    ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* AI entry */}
        {!editEntry && mode === 'ai' && aiAvailable && (
          <AiGate feature={t('food.aiFeature')}>
            <AiFoodInput onAddItems={handleAiAddItems} onEditItem={handleAiEditItem} />
          </AiGate>
        )}

        {/* Quick Pick Presets - shown when adding new food */}
        {!editEntry && mode === 'presets' && (
          <div>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder={t('food.search')}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-3 -mx-1 px-1">
              {filteredRecent.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                    🕐 {t('food.recent')}
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
                    {cat.emoji} {isThai && cat.labelTh ? cat.labelTh : cat.label}
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
                        <span>{displayName(item)}</span>
                        <span className="text-gray-400 dark:text-gray-500">{item.calories}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && filteredRecent.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">{t('food.noMatches')}</p>
              )}
            </div>
          </div>
        )}

        {/* Manual entry form - shown after picking a preset or switching to manual */}
        {(mode === 'manual' || editEntry) && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{t('food.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('food.namePlaceholder')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">{t('food.meal')}</label>
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
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{t('common.calories')}</label>
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
                <label className="block text-xs font-medium mb-1 text-gray-500">{t('food.proteinG')}</label>
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
                <label className="block text-xs font-medium mb-1 text-gray-500">{t('food.carbsG')}</label>
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
                <label className="block text-xs font-medium mb-1 text-gray-500">{t('food.fatG')}</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{t('food.sodiumMg')}</label>
                <input
                  type="number"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  placeholder="0"
                  min="0"
                  inputMode="numeric"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{t('food.sugarG')}</label>
                <input
                  type="number"
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value)}
                  placeholder="0"
                  min="0"
                  inputMode="decimal"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
              <p className="col-span-2 text-[11px] text-gray-400 -mt-1">{t('food.sodiumHint')} · {t('food.sugarHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{t('common.date')}</label>
              <input
                type="date"
                value={date}
                max={todayKey()}
                onChange={(e) => setDate(e.target.value || todayKey())}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
            >
              {editEntry ? t('common.update') : t('food.addFood')}
            </button>
          </>
        )}
      </form>
    </Modal>
  );
}
