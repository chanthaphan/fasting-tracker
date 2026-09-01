import { get, set } from 'idb-keyval';
import type {
  FoodEntry, FastingSession, WeightEntry, ExerciseEntry, MacroGoals, WeightGoal, UserProfile,
  AiSettings, ChatMessageRecord, DailyDigestCache, FastPlanCache,
  WorkoutSession, WorkoutTemplate, TrainingGoal, WeeklyPlanCache, WeeklyPlanDay,
} from '../types';

const KEYS = {
  FOOD_ENTRIES: 'ft_food_entries',
  FASTING_SESSIONS: 'ft_fasting_sessions',
  WEIGHT_ENTRIES: 'ft_weight_entries',
  EXERCISE_ENTRIES: 'ft_exercise_entries',
  SETTINGS: 'ft_settings',
  AI_CHAT: 'ft_ai_chat',
  AI_DIGEST: 'ft_ai_digest',
  AI_FAST_PLAN: 'ft_ai_fast_plan',
  WORKOUT_SESSIONS: 'ft_workout_sessions',
  WORKOUT_TEMPLATES: 'ft_workout_templates',
  AI_WEEKLY_PLAN: 'ft_ai_weekly_plan',
} as const;

type Validator<T> = (value: unknown) => value is T;

/**
 * Load from IndexedDB (primary) with localStorage fallback.
 * On first load after migration, IndexedDB may be empty — we read
 * localStorage and migrate the data over.
 */
export async function loadFromStorage<T>(key: string, fallback: T, validator?: Validator<T>): Promise<T> {
  // Try IndexedDB first
  try {
    const idbValue = await get<T>(key);
    if (idbValue !== undefined) {
      if (!validator || validator(idbValue)) return idbValue;
      console.warn(`[storage] IndexedDB data for "${key}" failed validation`);
    }
  } catch {
    console.warn(`[storage] Failed to read "${key}" from IndexedDB`);
  }

  // Fallback to localStorage (handles migration from old storage)
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) return fallback;

    // Migrate to IndexedDB
    set(key, parsed).catch(() => {});
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Track whether we've already warned the user this session */
let hasWarnedStorageFull = false;

/**
 * Save to IndexedDB (primary) and localStorage (backup).
 * Dual-write ensures fast synchronous reads on cold start while
 * IndexedDB provides the larger, more reliable store.
 */
export function saveToStorage(key: string, value: unknown): void {
  // Async write to IndexedDB (primary)
  set(key, value).catch((err) => {
    if (!hasWarnedStorageFull) {
      hasWarnedStorageFull = true;
      console.error('[storage] IndexedDB write failed:', err);
      window.dispatchEvent(new CustomEvent('storage-full'));
    }
  });

  // Sync write to localStorage (backup / fast cold-start reads)
  try {
    localStorage.setItem(key, JSON.stringify(value));
    hasWarnedStorageFull = false;
  } catch (err) {
    if (!hasWarnedStorageFull && err instanceof DOMException && err.name === 'QuotaExceededError') {
      hasWarnedStorageFull = true;
      window.dispatchEvent(new CustomEvent('storage-full'));
    }
  }
}

// --- Synchronous load for initial render (reads localStorage only) ---

export function loadFromStorageSync<T>(key: string, fallback: T, validator?: Validator<T>): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

// --- Validators for each data type ---

function isArrayOf<T>(check: (item: unknown) => boolean): Validator<T[]> {
  return (value: unknown): value is T[] =>
    Array.isArray(value) && (value.length === 0 || value.every(check));
}

const hasKeys = (v: unknown, ...keys: string[]): boolean =>
  typeof v === 'object' && v !== null && keys.every((k) => k in v);

export const isFoodEntryArray: Validator<FoodEntry[]> = isArrayOf<FoodEntry>(
  (v) => hasKeys(v, 'id', 'name', 'calories', 'date')
);

export const isFastingSessionArray: Validator<FastingSession[]> = isArrayOf<FastingSession>(
  (v) => hasKeys(v, 'id', 'startTime')
);

export const isWeightEntryArray: Validator<WeightEntry[]> = isArrayOf<WeightEntry>(
  (v) => hasKeys(v, 'id', 'weight', 'date')
);

export const isExerciseEntryArray: Validator<ExerciseEntry[]> = isArrayOf<ExerciseEntry>(
  (v) => hasKeys(v, 'id', 'name', 'calories', 'date')
);

export interface StoredSettings {
  theme: string;
  activeFastingId: string | null;
  goals: MacroGoals;
  weightGoal: WeightGoal | null;
  userProfile: UserProfile | null;
  aiSettings?: AiSettings;
  activeWorkoutId?: string | null;
  trainingGoal?: TrainingGoal | null;
}

export const isSettings: Validator<StoredSettings> = (
  value: unknown
): value is StoredSettings =>
  hasKeys(value, 'theme', 'goals');

export const isChatHistory: Validator<ChatMessageRecord[]> = isArrayOf<ChatMessageRecord>(
  (v) =>
    hasKeys(v, 'role', 'content') &&
    ((v as ChatMessageRecord).role === 'user' || (v as ChatMessageRecord).role === 'assistant') &&
    typeof (v as ChatMessageRecord).content === 'string'
);

export const isDigestCache: Validator<DailyDigestCache> = (value: unknown): value is DailyDigestCache =>
  hasKeys(value, 'dateKey', 'content');

export const isFastPlanCache: Validator<FastPlanCache> = (value: unknown): value is FastPlanCache =>
  hasKeys(value, 'dateKey', 'targetHours');

export const isWorkoutSessionArray: Validator<WorkoutSession[]> = isArrayOf<WorkoutSession>(
  (v) => hasKeys(v, 'id', 'date', 'startTime', 'exercises') && Array.isArray((v as WorkoutSession).exercises)
);

export const isWorkoutTemplateArray: Validator<WorkoutTemplate[]> = isArrayOf<WorkoutTemplate>(
  (v) => hasKeys(v, 'id', 'name', 'exercises') && Array.isArray((v as WorkoutTemplate).exercises)
);

export const isWeeklyPlanCache: Validator<WeeklyPlanCache> = (value: unknown): value is WeeklyPlanCache =>
  hasKeys(value, 'startDate', 'days') &&
  Array.isArray((value as WeeklyPlanCache).days) &&
  (value as WeeklyPlanCache).days.every(
    (d: unknown) =>
      hasKeys(d, 'date', 'type') &&
      typeof (d as WeeklyPlanDay).date === 'string' &&
      ((d as WeeklyPlanDay).type === 'workout' || (d as WeeklyPlanDay).type === 'rest')
  );

export { KEYS };
