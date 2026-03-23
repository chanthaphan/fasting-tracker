import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp, Minus, Target } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { AddWeightModal } from './add-weight-modal';
import { WeightGoalModal } from './weight-goal-modal';
import { WeightChart } from './weight-chart';
import { useAppState } from '../../context/app-context';
import { format, differenceInDays, parseISO } from 'date-fns';
import type { WeightEntry, WeightGoal } from '../../types';

export function WeightPage() {
  const { state, dispatch } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null);

  const sortedEntries = useMemo(
    () => [...state.weightEntries].sort((a, b) => b.createdAt - a.createdAt),
    [state.weightEntries]
  );

  const latestWeight = sortedEntries[0]?.weight ?? null;
  const previousWeight = sortedEntries[1]?.weight ?? null;
  const weightDiff = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null;
  const latestUnit = sortedEntries[0]?.unit ?? 'kg';

  const handleSave = (data: { weight: number; unit: 'kg' | 'lbs'; date: string; note?: string }) => {
    if (editEntry) {
      dispatch({ type: 'EDIT_WEIGHT', payload: { ...editEntry, ...data } });
    } else {
      dispatch({ type: 'ADD_WEIGHT', payload: data });
    }
    setEditEntry(null);
  };

  const handleEdit = (entry: WeightEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_WEIGHT', payload: { id } });
  };

  const handleSaveGoal = (goal: WeightGoal | null) => {
    dispatch({ type: 'SET_WEIGHT_GOAL', payload: goal });
  };

  const goal = state.weightGoal;

  // Goal progress calculation
  const goalProgress = useMemo(() => {
    if (!goal || latestWeight === null) return null;
    const totalChange = goal.targetWeight - goal.startWeight;
    if (totalChange === 0) return { percent: 100, remaining: 0, daysLeft: 0, onTrack: true };

    const currentChange = latestWeight - goal.startWeight;
    const percent = Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    const remaining = goal.targetWeight - latestWeight;
    const daysLeft = differenceInDays(parseISO(goal.targetDate), new Date());

    // Expected progress based on time elapsed
    const totalDays = differenceInDays(parseISO(goal.targetDate), parseISO(goal.startDate));
    const daysElapsed = totalDays - daysLeft;
    const expectedPercent = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 100;
    const onTrack = totalChange < 0 ? percent >= expectedPercent - 10 : percent >= expectedPercent - 10;

    return { percent, remaining, daysLeft, onTrack };
  }, [goal, latestWeight]);

  return (
    <PageShell
      title="Weight Log"
      action={
        <div className="flex gap-2">
          <button
            onClick={() => setGoalModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Target size={16} />
            Goal
          </button>
          <button
            onClick={() => { setEditEntry(null); setModalOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      }
    >
      {/* Summary card */}
      {latestWeight !== null && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 mb-1">Current Weight</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">
              {latestWeight}
            </span>
            <span className="text-sm text-gray-500 mb-1">{latestUnit}</span>
            {weightDiff !== null && (
              <span className={`flex items-center gap-0.5 text-sm font-medium ml-auto mb-1 ${
                weightDiff < 0 ? 'text-green-500' : weightDiff > 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {weightDiff < 0 ? <TrendingDown size={14} /> : weightDiff > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
                {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} {latestUnit}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Goal progress card */}
      {goal && goalProgress && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400">Goal Progress</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              goalProgress.onTrack
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              {goalProgress.onTrack ? 'On Track' : 'Behind'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-brand-500 dark:bg-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${goalProgress.percent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-400">Target</p>
              <p className="text-sm font-bold">{goal.targetWeight} {goal.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Remaining</p>
              <p className="text-sm font-bold">{goalProgress.remaining > 0 ? '+' : ''}{goalProgress.remaining.toFixed(1)} {goal.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Days Left</p>
              <p className="text-sm font-bold">{Math.max(0, goalProgress.daysLeft)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weight trend chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-400 mb-2">Trend</p>
        <WeightChart entries={state.weightEntries} weightGoal={goal} />
      </div>

      {/* Weight history */}
      {sortedEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No weight entries yet</p>
          <p className="text-xs mt-1">Tap "Add" to log your weight</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map((entry, i) => {
            const prev = sortedEntries[i + 1];
            const diff = prev ? entry.weight - prev.weight : null;
            return (
              <div key={entry.id} className="flex items-center justify-between py-3 px-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{entry.weight} {entry.unit}</span>
                    {diff !== null && (
                      <span className={`text-xs font-medium ${
                        diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}
                    {entry.note && <span className="ml-2 text-gray-500">· {entry.note}</span>}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddWeightModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
      />

      <WeightGoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onSave={handleSaveGoal}
        currentGoal={goal}
        currentWeight={latestWeight}
        currentUnit={latestUnit}
      />
    </PageShell>
  );
}
