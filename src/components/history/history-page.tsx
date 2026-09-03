import { useMemo, useState } from 'react';
import { PageShell } from '../layout/page-shell';
import { CalendarGrid } from './calendar-grid';
import { EditFastingModal } from '../fasting/edit-fasting-modal';
import { AddFoodModal } from '../food-log/add-food-modal';
import { FoodEntryCard } from '../food-log/food-entry-card';
import { useUndo } from '../../hooks/use-undo';
import { UndoToast } from '../ui/undo-toast';
import { useAppState } from '../../context/use-app-state';
import { sumMacros } from '../../utils/macro-calc';
import { formatHoursMinutes, dateKey } from '../../utils/date-utils';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import type { FastingSession, FoodEntry, MealType } from '../../types';

export function HistoryPage() {
  const { state, dispatch } = useAppState();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<FastingSession | null>(null);
  const [editFood, setEditFood] = useState<FoodEntry | null>(null);
  const { pending, offer, undoNow } = useUndo();

  const datesWithFood = useMemo(
    () => new Set(state.foodEntries.map((e) => e.date)),
    [state.foodEntries]
  );

  const datesWithFasting = useMemo(() => {
    const dates = new Set<string>();
    state.fastingSessions.forEach((s) => {
      dates.add(dateKey(new Date(s.startTime)));
      if (s.endTime) dates.add(dateKey(new Date(s.endTime)));
    });
    return dates;
  }, [state.fastingSessions]);

  const selectedEntries = state.foodEntries.filter((e) => e.date === state.selectedDate);
  const selectedTotals = sumMacros(selectedEntries);

  // Fasts that overlap the selected day, so an overnight fast shows on the morning it ended too
  const selectedFasts = useMemo(() => {
    const dayStart = new Date(state.selectedDate + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;
    // An active fast (no end yet) overlaps every day since it started
    return state.fastingSessions.filter((s) => s.startTime < dayEnd && (s.endTime ?? Infinity) >= dayStart);
  }, [state.fastingSessions, state.selectedDate]);

  const completedFasts = state.fastingSessions
    .filter((s) => s.endTime !== null)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 10);

  const handleEditFast = (session: FastingSession) => {
    setEditSession(session);
    setEditModalOpen(true);
  };

  const handleEditSave = (id: string, startTime: number, endTime: number | null) => {
    dispatch({ type: 'EDIT_FAST', payload: { id, startTime, endTime } });
  };

  const handleDeleteFast = (id: string) => {
    const session = state.fastingSessions.find((s) => s.id === id);
    dispatch({ type: 'DELETE_FAST', payload: { id } });
    if (session) offer('Deleted fast', () => dispatch({ type: 'RESTORE_FAST', payload: session }));
  };

  const handleDeleteFood = (id: string) => {
    const entry = state.foodEntries.find((e) => e.id === id);
    dispatch({ type: 'DELETE_FOOD', payload: { id } });
    if (entry) offer(`Deleted ${entry.name}`, () => dispatch({ type: 'RESTORE_FOOD', payload: entry }));
  };

  const handleSaveFood = (data: { name: string; calories: number; protein: number; carbs: number; fat: number; mealType: MealType; date: string }) => {
    if (editFood) dispatch({ type: 'EDIT_FOOD', payload: { ...editFood, ...data } });
    setEditFood(null);
  };

  return (
    <PageShell title="History">
      <CalendarGrid
        selectedDate={state.selectedDate}
        onSelectDate={(d) => dispatch({ type: 'SET_SELECTED_DATE', payload: d })}
        datesWithFood={datesWithFood}
        datesWithFasting={datesWithFasting}
      />

      {/* Selected day detail */}
      <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold mb-3">
          {state.selectedDate === dateKey(new Date()) ? 'Today' : state.selectedDate}
        </h3>

        {selectedEntries.length > 0 ? (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Food ({selectedEntries.length} entries)</p>
            <div className="flex gap-4 text-sm mb-2">
              <span className="font-bold text-brand-600 dark:text-brand-400">{selectedTotals.calories} cal</span>
              <span className="text-gray-500">P {selectedTotals.protein}g</span>
              <span className="text-gray-500">C {selectedTotals.carbs}g</span>
              <span className="text-gray-500">F {selectedTotals.fat}g</span>
            </div>
            <div className="-mx-1">
              {[...selectedEntries].sort((a, b) => a.createdAt - b.createdAt).map((e) => (
                <FoodEntryCard key={e.id} entry={e} onEdit={setEditFood} onDelete={handleDeleteFood} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-3">No food logged</p>
        )}

        {selectedFasts.length > 0 ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">Fasting ({selectedFasts.length} sessions)</p>
            {selectedFasts.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 py-1">
                <span>
                  {s.endTime
                    ? `${formatHoursMinutes(s.endTime - s.startTime)} fast`
                    : 'Currently fasting...'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditFast(s)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteFast(s.id)}
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No fasting sessions</p>
        )}
      </div>

      {/* Recent fasts */}
      {completedFasts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">Recent Fasts</h3>
          <div className="space-y-2">
            {completedFasts.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex-1">
                  <p className="text-sm font-medium">{format(new Date(s.startTime), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(s.startTime), 'h:mm a')} — {s.endTime ? format(new Date(s.endTime), 'h:mm a') : '...'}
                  </p>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mr-2">
                  {s.endTime ? formatHoursMinutes(s.endTime - s.startTime) : '...'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditFast(s)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteFast(s.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditFastingModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditSession(null); }}
        onSave={handleEditSave}
        session={editSession}
      />
      <AddFoodModal open={editFood !== null} onClose={() => setEditFood(null)} onSave={handleSaveFood} editEntry={editFood} />
      <UndoToast pending={pending} onUndo={undoNow} />
    </PageShell>
  );
}
