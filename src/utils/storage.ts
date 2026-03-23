import { get, set } from 'idb-keyval';
import type { FoodEntry, FastingSession, WeightEntry, ExerciseEntry, MacroGoals, WeightGoal, UserProfile } from '../types';

const KEYS = {
  FOOD_ENTRIES: 'ft_food_entries',
  FASTING_SESSIONS: 'ft_fasting_sessions',
  WEIGHT_ENTRIES: 'ft_weight_entries',
  EXERCISE_ENTRIES: 'ft_exercise_entries',
  SETTINGS: 'ft_settings',
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

export const isSettings: Validator<{
  theme: string;
  activeFastingId: string | null;
  goals: MacroGoals;
  weightGoal: WeightGoal | null;
  userProfile: UserProfile | null;
}> = (
  value: unknown
): value is {
  theme: string;
  activeFastingId: string | null;
  goals: MacroGoals;
  weightGoal: WeightGoal | null;
  userProfile: UserProfile | null;
} =>
  hasKeys(value, 'theme', 'goals');

export { KEYS };
