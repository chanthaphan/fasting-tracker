import { useState } from 'react';
import { Camera, Loader2, Sparkles, WifiOff } from 'lucide-react';
import { Modal } from '../ui/modal';
import { ParsedItemsEditor } from './parsed-items-editor';
import { MEAL_TYPES } from '../../constants/meal-types';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';
import { defaultMealType } from '../../utils/meal-time';
import { todayKey } from '../../utils/date-utils';
import type { MealType, ParsedFoodItem } from '../../types';

export type SnapPhase = 'prompt' | 'gate-nokey' | 'offline' | 'analyzing' | 'review' | 'error';

interface SnapMealSheetProps {
  open: boolean;
  phase: SnapPhase;
  preview: string | null;
  items: ParsedFoodItem[];
  error: string | null;
  onItemsChange: (items: ParsedFoodItem[]) => void;
  onOpenCamera: () => void;
  onLog: (items: ParsedFoodItem[], mealType: MealType, date: string) => void;
  onAddManually: () => void;
  onDescribe: () => void;
  onSetupAi: () => void;
  onClose: () => void;
}

const primary = 'w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40';
const secondary = 'w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl';

/**
 * Bottom sheet for the snap-a-meal flow. The parent owns the file input
 * and the AI call; this renders each phase and the review/log step.
 */
export function SnapMealSheet(props: SnapMealSheetProps) {
  const { open, phase, preview, items, error, onItemsChange, onOpenCamera, onLog, onAddManually, onDescribe, onSetupAi, onClose } = props;
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType());
  const [date, setDate] = useState(() => todayKey());
  const [logging, setLogging] = useState(false);

  const title =
    phase === 'review' ? 'Review your meal'
    : phase === 'analyzing' ? 'Analyzing photo…'
    : phase === 'error' ? 'Could not read the meal'
    : 'Snap a meal';

  const totalKcal = items.reduce((s, i) => s + i.calories, 0);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {phase === 'prompt' && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Take a photo of your food and the AI fills in the calories and macros.</p>
          <button type="button" onClick={onOpenCamera} className={primary}>
            <Camera size={18} />
            Open camera
          </button>
          <button type="button" onClick={onAddManually} className={secondary}>Add manually</button>
        </div>
      )}

      {phase === 'gate-nokey' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Photo logging uses the AI assistant, which needs your own Anthropic API key. Set it up once and snapping a meal takes one tap.
          </p>
          <button type="button" onClick={onSetupAi} className={primary}>
            <Sparkles size={18} />
            Set up AI
          </button>
          <button type="button" onClick={onAddManually} className={secondary}>Add manually</button>
        </div>
      )}

      {phase === 'offline' && (
        <div className="space-y-3 text-center">
          <WifiOff size={28} className="mx-auto text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300">You're offline. Photos need a connection to be analysed, but you can still log food by hand.</p>
          <button type="button" onClick={onAddManually} className={primary}>Add manually</button>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="space-y-3 text-center py-2">
          {preview && <img src={preview} alt="Your meal" className="mx-auto h-40 rounded-xl object-cover" />}
          <p className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Identifying the food…
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          {preview && <img src={preview} alt="Your meal" className="mx-auto h-28 rounded-xl object-cover" />}
          <p className="text-sm text-red-500 font-medium">{error ?? 'Something went wrong.'}</p>
          <button type="button" onClick={onOpenCamera} className={primary}>
            <Camera size={18} />
            Retake
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onDescribe} className={secondary}>Describe instead</button>
            <button type="button" onClick={onAddManually} className={secondary}>Add manually</button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {preview && <img src={preview} alt="Your meal" className="h-20 w-20 rounded-xl object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">Meal</p>
              <div className="flex flex-wrap gap-1">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMealType(m.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      mealType === m.value ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              <label className="block mt-2">
                <span className="block text-xs text-gray-400 mb-0.5">Date</span>
                <input
                  type="date"
                  value={date}
                  max={todayKey()}
                  onChange={(e) => setDate(e.target.value || todayKey())}
                  className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </label>
            </div>
          </div>

          <ParsedItemsEditor items={items} onChange={onItemsChange} />

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
            <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
            <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{totalKcal} kcal</span>
          </div>

          <button
            type="button"
            disabled={items.length === 0 || logging}
            onClick={() => {
              setLogging(true);
              onLog(items, mealType, date);
            }}
            className={primary}
          >
            Log {items.length} item{items.length === 1 ? '' : 's'}
          </button>
          <button type="button" onClick={onOpenCamera} className={secondary}>Retake</button>
          <p className="text-[10px] text-gray-400 text-center">{HEALTH_DISCLAIMER.en} · {HEALTH_DISCLAIMER.th}</p>
        </div>
      )}
    </Modal>
  );
}
