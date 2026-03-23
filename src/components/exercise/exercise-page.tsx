import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Flame } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { AddExerciseModal } from './add-exercise-modal';
import { useAppState } from '../../context/app-context';
import { todayKey } from '../../utils/date-utils';
import { format } from 'date-fns';
import type { ExerciseEntry } from '../../types';

export function ExercisePage() {
  const { state, dispatch } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ExerciseEntry | null>(null);

  const todayEntries = useMemo(
    () => state.exerciseEntries
      .filter((e) => e.date === todayKey())
      .sort((a, b) => b.createdAt - a.createdAt),
    [state.exerciseEntries]
  );

  const allEntries = useMemo(
    () => [...state.exerciseEntries].sort((a, b) => b.createdAt - a.createdAt),
    [state.exerciseEntries]
  );

  const todayTotals = useMemo(
    () => todayEntries.reduce(
      (acc, e) => ({ calories: acc.calories + e.calories, duration: acc.duration + e.durationMin }),
      { calories: 0, duration: 0 }
    ),
    [todayEntries]
  );

  // Group non-today entries by date
  const pastEntries = useMemo(
    () => allEntries.filter((e) => e.date !== todayKey()),
    [allEntries]
  );

  const handleSave = (data: { name: string; calories: number; durationMin: number; date: string; note?: string }) => {
    if (editEntry) {
      dispatch({ type: 'EDIT_EXERCISE', payload: { ...editEntry, ...data } });
    } else {
      dispatch({ type: 'ADD_EXERCISE', payload: data });
    }
    setEditEntry(null);
  };

  const handleEdit = (entry: ExerciseEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_EXERCISE', payload: { id } });
  };

  return (
    <PageShell
      title="Exercise"
      action={
        <button
          onClick={() => { setEditEntry(null); setModalOpen(true); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      }
    >
      {/* Today's summary */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-400 mb-1">Today's Exercise</p>
        <div className="flex items-end gap-4">
          <div>
            <div className="flex items-end gap-1">
              <Flame size={20} className="text-orange-500 mb-0.5" />
              <span className="text-3xl font-bold text-orange-500">{todayTotals.calories}</span>
              <span className="text-sm text-gray-500 mb-1">cal burned</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{todayTotals.duration}</span>
            <span className="text-xs text-gray-400 ml-1">min</span>
          </div>
        </div>
      </div>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-2">Today</p>
          <div className="space-y-2">
            {todayEntries.map((entry) => (
              <ExerciseCard key={entry.id} entry={entry} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {todayEntries.length === 0 && pastEntries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No exercises logged yet</p>
          <p className="text-xs mt-1">Tap "Add" to log your workout</p>
        </div>
      )}

      {/* Past entries */}
      {pastEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">History</p>
          <div className="space-y-2">
            {pastEntries.slice(0, 20).map((entry) => (
              <ExerciseCard key={entry.id} entry={entry} onEdit={handleEdit} onDelete={handleDelete} showDate />
            ))}
          </div>
        </div>
      )}

      <AddExerciseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
        onSave={handleSave}
        editEntry={editEntry}
      />
    </PageShell>
  );
}

function ExerciseCard({
  entry,
  onEdit,
  onDelete,
  showDate,
}: {
  entry: ExerciseEntry;
  onEdit: (e: ExerciseEntry) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{entry.name}</span>
          <span className="text-xs font-medium text-orange-500">{entry.calories} cal</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {entry.durationMin} min
          {showDate && <span className="ml-2">· {format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}</span>}
          {entry.note && <span className="ml-2 text-gray-500">· {entry.note}</span>}
        </p>
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
