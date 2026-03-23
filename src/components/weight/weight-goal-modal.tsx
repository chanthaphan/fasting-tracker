import { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import type { WeightGoal } from '../../types';
import { todayKey } from '../../utils/date-utils';

interface WeightGoalModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (goal: WeightGoal | null) => void;
  currentGoal: WeightGoal | null;
  currentWeight: number | null;
  currentUnit: 'kg' | 'lbs';
}

export function WeightGoalModal({ open, onClose, onSave, currentGoal, currentWeight, currentUnit }: WeightGoalModalProps) {
  const [targetWeight, setTargetWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(currentUnit);
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (currentGoal) {
      setTargetWeight(String(currentGoal.targetWeight));
      setUnit(currentGoal.unit);
      setTargetDate(currentGoal.targetDate);
    } else {
      setTargetWeight('');
      setUnit(currentUnit);
      // Default target date: 3 months from now
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setTargetDate(d.toISOString().split('T')[0]);
    }
  }, [currentGoal, currentUnit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWeight || !targetDate || currentWeight === null) return;
    onSave({
      targetWeight: Number(targetWeight),
      unit,
      targetDate,
      startWeight: currentGoal?.startWeight ?? currentWeight,
      startDate: currentGoal?.startDate ?? todayKey(),
    });
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500';

  const weightDiff = currentWeight !== null && targetWeight
    ? Number(targetWeight) - currentWeight
    : null;

  return (
    <Modal open={open} onClose={onClose} title="Weight Goal">
      <form onSubmit={handleSubmit} className="space-y-4">
        {currentWeight === null && (
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
            Log your current weight first before setting a goal.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Target Weight</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
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
          {weightDiff !== null && targetWeight && (
            <p className={`text-xs mt-1.5 font-medium ${weightDiff < 0 ? 'text-green-500' : weightDiff > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} {unit} from current weight
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={todayKey()}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={currentWeight === null}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {currentGoal ? 'Update Goal' : 'Set Goal'}
        </button>

        {currentGoal && (
          <button
            type="button"
            onClick={handleClear}
            className="w-full py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Remove Goal
          </button>
        )}
      </form>
    </Modal>
  );
}
