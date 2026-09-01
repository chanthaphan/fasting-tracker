import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useAppState } from '../../context/app-context';
import { LIFT_PRESET_CATEGORIES } from '../../constants/lift-presets';
import { listLifts } from '../../utils/workout-stats';
import { DAY_NAMES } from '../../utils/ai/context-builder';
import type { LiftTarget } from '../../types';

interface TrainingGoalModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after saving (e.g. to kick off plan generation). */
  onSaved?: () => void;
}

/** Mounted fresh on each open so state prefills without sync effects. */
export function TrainingGoalModal({ open, onClose, onSaved }: TrainingGoalModalProps) {
  if (!open) return null;
  return <TrainingGoalForm onClose={onClose} onSaved={onSaved} />;
}

const SESSION_LENGTHS = [30, 45, 60, 90];

function TrainingGoalForm({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { state, dispatch } = useAppState();
  const goal = state.trainingGoal;
  const [targets, setTargets] = useState<LiftTarget[]>(goal?.targetLifts ?? []);
  const [days, setDays] = useState<number[]>(goal?.preferredDays ?? [1, 3, 5]);
  const [minutes, setMinutes] = useState(goal?.sessionMinutes ?? 60);

  const liftOptions = useMemo(() => {
    const names = new Set<string>();
    for (const lift of listLifts(state.workoutSessions)) names.add(lift.name);
    for (const cat of LIFT_PRESET_CATEGORIES) for (const item of cat.items) names.add(item.name);
    return [...names];
  }, [state.workoutSessions]);

  const updateTarget = (index: number, changes: Partial<LiftTarget>) => {
    setTargets((prev) => prev.map((t, i) => (i === index ? { ...t, ...changes } : t)));
  };

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleSave = () => {
    dispatch({
      type: 'SET_TRAINING_GOAL',
      payload: {
        targetLifts: targets.filter((t) => t.name.trim() && t.targetWeightKg > 0),
        preferredDays: days,
        sessionMinutes: minutes,
      },
    });
    onClose();
    onSaved?.();
  };

  return (
    <Modal open onClose={onClose} title="Training Goal">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Target weights (kg)</label>
          <div className="space-y-2">
            {targets.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={t.name}
                  onChange={(e) => updateTarget(i, { name: e.target.value })}
                  className="flex-1 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Choose lift…</option>
                  {liftOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="2.5"
                  value={t.targetWeightKg > 0 ? t.targetWeightKg : ''}
                  onChange={(e) => updateTarget(i, { targetWeightKg: Number(e.target.value) || 0 })}
                  placeholder="kg"
                  className="w-20 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setTargets((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove target"
                  className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTargets((prev) => [...prev, { name: '', targetWeightKg: 0 }])}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-orange-500"
          >
            <Plus size={13} />
            Add target lift
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Preferred training days</label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name, d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  days.includes(d)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {name.slice(0, 2)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Session length</label>
          <div className="grid grid-cols-4 gap-2">
            {SESSION_LENGTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                  minutes === m
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={days.length === 0}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
        >
          Save Goal
        </button>
      </div>
    </Modal>
  );
}
