import type { FoodEntry, FastingSession, WeightEntry, MacroGoals } from '../types';

const KEYS = {
  FOOD_ENTRIES: 'ft_food_entries',
  FASTING_SESSIONS: 'ft_fasting_sessions',
  WEIGHT_ENTRIES: 'ft_weight_entries',
  SETTINGS: 'ft_settings',
} as const;

const BACKUP_SUFFIX = '_bak';

/**
 * Validate that a value matches expected shape before trusting it.
 * Returns true if value passes the validator, false otherwise.
 */
type Validator<T> = (value: unknown) => value is T;

export function loadFromStorage<T>(key: string, fallback: T, validator?: Validator<T>): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    // If a validator is provided, check the parsed data
    if (validator && !validator(parsed)) {
      console.warn(`[storage] Data for "${key}" failed validation, trying backup`);
      return loadBackup(key, fallback, validator);
    }

    return parsed as T;
  } catch {
    console.warn(`[storage] Failed to parse "${key}", trying backup`);
    return loadBackup(key, fallback, validator);
  }
}

function loadBackup<T>(key: string, fallback: T, validator?: Validator<T>): T {
  try {
    const raw = localStorage.getItem(key + BACKUP_SUFFIX);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) return fallback;

    // Restore good backup to primary
    localStorage.setItem(key, raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Track whether we've already warned the user this session */
let hasWarnedStorageFull = false;

export function saveToStorage(key: string, value: unknown): void {
  try {
    const json = JSON.stringify(value);

    // Save current value as backup before overwriting
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        localStorage.setItem(key + BACKUP_SUFFIX, existing);
      } catch {
        // If we can't save backup, still try to save primary
      }
    }

    localStorage.setItem(key, json);
    hasWarnedStorageFull = false;
  } catch (err) {
    if (!hasWarnedStorageFull && err instanceof DOMException && err.name === 'QuotaExceededError') {
      hasWarnedStorageFull = true;
      window.dispatchEvent(new CustomEvent('storage-full'));
    }
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

export const isSettings: Validator<{ theme: string; activeFastingId: string | null; goals: MacroGoals }> = (
  value: unknown
): value is { theme: string; activeFastingId: string | null; goals: MacroGoals } =>
  hasKeys(value, 'theme', 'goals');

export { KEYS };
