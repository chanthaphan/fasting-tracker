import { useMemo } from 'react';
import { PageShell } from '../layout/page-shell';
import { CalendarGrid } from './calendar-grid';
import { useAppState } from '../../context/app-context';
import { sumMacros } from '../../utils/macro-calc';
import { formatHoursMinutes, dateKey } from '../../utils/date-utils';
import { format } from 'date-fns';

export function HistoryPage() {
  const { state, dispatch } = useAppState();

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

  const selectedFasts = state.fastingSessions.filter((s) => {
    const d = dateKey(new Date(s.startTime));
    return d === state.selectedDate;
  });

  const completedFasts = state.fastingSessions
    .filter((s) => s.endTime !== null)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 10);

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
            <div className="flex gap-4 text-sm">
              <span className="font-bold text-brand-600 dark:text-brand-400">{selectedTotals.calories} cal</span>
              <span className="text-gray-500">P {selectedTotals.protein}g</span>
              <span className="text-gray-500">C {selectedTotals.carbs}g</span>
              <span className="text-gray-500">F {selectedTotals.fat}g</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-3">No food logged</p>
        )}

        {selectedFasts.length > 0 ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">Fasting ({selectedFasts.length} sessions)</p>
            {selectedFasts.map((s) => (
              <div key={s.id} className="text-sm text-gray-600 dark:text-gray-400">
                {s.endTime
                  ? `${formatHoursMinutes(s.endTime - s.startTime)} fast`
                  : 'Currently fasting...'}
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
                <div>
                  <p className="text-sm font-medium">{format(new Date(s.startTime), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(s.startTime), 'h:mm a')} — {s.endTime ? format(new Date(s.endTime), 'h:mm a') : '...'}
                  </p>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {s.endTime ? formatHoursMinutes(s.endTime - s.startTime) : '...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
