import { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import type { WeightEntry } from '../../types';
import { todayKey } from '../../utils/date-utils';

interface AddWeightModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { weight: number; unit: 'kg' | 'lbs'; date: string; note?: string }) => void;
  editEntry?: WeightEntry | null;
}

export function AddWeightModal({ open, onClose, onSave, editEntry }: AddWeightModalProps) {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editEntry) {
      setWeight(String(editEntry.weight));
      setUnit(editEntry.unit);
      setDate(editEntry.date);
      setNote(editEntry.note ?? '');
    } else {
      setWeight('');
      setUnit('kg');
      setDate(todayKey());
      setNote('');
    }
  }, [editEntry, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    onSave({
      weight: Number(weight),
      unit,
      date,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit Weight' : 'Log Weight'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Weight</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
              className={`${inputClass} flex-1`}
              autoFocus
            />
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {(['kg', 'lbs'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    unit === u
                      ? 'bg-brand-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
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
            placeholder="e.g. After workout"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          {editEntry ? 'Update' : 'Log Weight'}
        </button>
      </form>
    </Modal>
  );
}
