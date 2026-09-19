import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { useUndo } from '../../hooks/use-undo';
import { UndoToast } from '../ui/undo-toast';
import { DayPicker } from '../ui/day-picker';
import { PageShell } from '../layout/page-shell';
import { DailyBars } from '../charts/daily-bars';
import { lastNDays, dailyMacros } from '../../utils/chart-data';
import { MealGroup } from './meal-group';
import { AddFoodModal, type FoodDraft } from './add-food-modal';
import { useAppState } from '../../context/use-app-state';
import { MEAL_TYPES } from '../../constants/meal-types';
import { sumMacros, sodiumGoalOf } from '../../utils/macro-calc';
import { todayKey } from '../../utils/date-utils';
import { localizeDays, useT } from '../../i18n';
import type { FoodEntry } from '../../types';

export function FoodLogPage() {
  const { state, dispatch } = useAppState();
  const { t, lang, fmtDate, isThai } = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<'presets' | 'ai' | 'manual'>('presets');
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null);

  // ?add=manual|ai opens the modal on that tab (used by the snap-a-meal fallbacks)
  const [params, setParams] = useSearchParams();
  const addParam = params.get('add');
  const [handledAdd, setHandledAdd] = useState<string | null>(null);
  if ((addParam === 'manual' || addParam === 'ai') && handledAdd !== addParam) {
    setHandledAdd(addParam);
    setInitialMode(addParam);
    setEditEntry(null);
    setModalOpen(true);
  }
  if (!addParam && handledAdd !== null) setHandledAdd(null);
  useEffect(() => {
    if (addParam) setParams((p) => { p.delete('add'); return p; }, { replace: true });
  }, [addParam, setParams]);

  // The page shows one day; ‹ › move it, and adds go to that day
  const day = state.selectedDate;
  const isToday = day === todayKey();
  const setDay = (next: string) => dispatch({ type: 'SET_SELECTED_DATE', payload: next });
  const dayEntries = state.foodEntries.filter((e) => e.date === day);
  const totals = sumMacros(dayEntries);
  const sodiumGoal = sodiumGoalOf(state.goals);
  const sodiumOver = totals.sodium > sodiumGoal;
  const { pending, offer, undoNow } = useUndo();

  const week = useMemo(() => localizeDays(lastNDays(7), lang), [lang]);
  const weekMacros = useMemo(() => dailyMacros(state.foodEntries, week), [state.foodEntries, week]);

  const handleSave = (data: FoodDraft) => {
    if (editEntry) {
      dispatch({ type: 'EDIT_FOOD', payload: { ...editEntry, ...data } });
    } else {
      dispatch({ type: 'ADD_FOOD', payload: data });
      if (data.date !== day) setDay(data.date);
    }
    setEditEntry(null);
  };

  const handleEdit = (entry: FoodEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const entry = state.foodEntries.find((e) => e.id === id);
    dispatch({ type: 'DELETE_FOOD', payload: { id } });
    if (entry) offer(t('food.deleted', { name: entry.name }), () => dispatch({ type: 'RESTORE_FOOD', payload: entry }));
  };

  return (
    <PageShell
      title={t('food.title')}
      action={
        <button
          onClick={() => { setEditEntry(null); setModalOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          {t('common.add')}
        </button>
      }
    >
      <DayPicker day={day} onChange={setDay} />

      {dayEntries.length === 0 ? (
        <button
          onClick={() => { setEditEntry(null); setInitialMode('presets'); setModalOpen(true); }}
          className="w-full text-center py-10 mb-3 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400"
        >
          <UtensilsCrossed size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">{isToday ? t('food.emptyToday') : t('food.emptyDay')}</p>
          <p className="text-xs mt-1">{isThai ? t('food.emptyHintSimple') : t('food.emptyHint')}</p>
        </button>
      ) : (
        MEAL_TYPES.map((m) => {
          const entries = dayEntries.filter((e) => e.mealType === m.value);
          return entries.length > 0 ? (
            <MealGroup key={m.value} icon={m.icon} label={t(m.labelKey)} entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
          ) : null;
        })
      )}

      {/* Daily totals bar */}
      <div className="sticky bottom-16 mt-4 p-3 pr-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{isToday ? t('food.todayTotal') : t('food.dayTotal', { date: fmtDate(day, 'dayMonth') })}</span>
          <span className="font-bold text-brand-600 dark:text-brand-400">{totals.calories} {t('common.cal')}</span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-gray-500">
          <span>{t('common.protein')}: <b className="text-blue-500">{totals.protein}g</b></span>
          <span>{t('common.carbs')}: <b className="text-amber-500">{totals.carbs}g</b></span>
          <span>{t('common.fat')}: <b className="text-rose-500">{totals.fat}g</b></span>
        </div>
        <div className="mt-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-gray-500">
            <span>{t('common.sodium')}: <b className={sodiumOver ? 'text-red-500' : 'text-teal-600 dark:text-teal-400'}>{totals.sodium.toLocaleString()}</b> / {sodiumGoal.toLocaleString()} {t('common.mg')}</span>
            {sodiumOver && <span className="text-red-500 font-medium">{t('food.sodiumOver')}</span>}
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${sodiumOver ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${Math.min((totals.sodium / Math.max(sodiumGoal, 1)) * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Last 7 days of macros */}
      {weekMacros.calories.some((v) => v > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mt-4 border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 mb-1">{t('food.macros7')}</p>
          <DailyBars
            slots={week}
            series={[
              { name: t('common.carbs'), fill: 'fill-amber-600 dark:fill-amber-600' },
              { name: t('common.protein'), fill: 'fill-blue-600 dark:fill-blue-500' },
              { name: t('common.fat'), fill: 'fill-rose-600 dark:fill-rose-500' },
            ]}
            values={[weekMacros.carbs, weekMacros.protein, weekMacros.fat]}
            unit="g"
            emphasisKey={todayKey()}
            ariaLabel={t('food.macros7Aria')}
            tableCaption={t('common.showValues')}
            dayHeading={t('common.day')}
          />
        </div>
      )}

      <AddFoodModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
        initialMode={initialMode}
        date={day}
      />
      <UndoToast pending={pending} onUndo={undoNow} />
    </PageShell>
  );
}
