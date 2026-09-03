import { get, set } from 'idb-keyval';
import type {
  FoodEntry, FastingSession, WeightEntry, ExerciseEntry, MacroGoals, WeightGoal, UserProfile,
  AiSettings, ChatMessageRecord, DailyDigestCache, FastPlanCache,
  WorkoutSession, WorkoutTemplate, TrainingGoal, WeeklyPlanCache, WeeklyPlanDay,
  GamificationData,
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
  GAMIFICATION: 'ft_gamification',
} as const;

/**
 * A type guard, optionally able to salvage a partially valid value
 * (for arrays: keep the well-formed rows, drop the rest).
 */
type Validator<T> = ((value: unknown) => value is T) & { repair?: (value: unknown) => T | null };

/**
 * Never silently throw away what a user logged: when stored data fails
 * validation, keep the raw value under a side key so it can be recovered,
 * then use the repaired value if the validator can salvage one.
 */
function salvage<T>(key: string, raw: unknown, validator: Validator<T>, backend: 'idb' | 'local'): T | null {
  console.warn(`[storage] ${backend} data for "${key}" failed validation; quarantining`);
  const quarantineKey = `${key}__corrupt_${Date.now()}`;
  try {
    if (backend === 'idb') set(quarantineKey, raw).catch(() => {});
    else localStorage.setItem(quarantineKey, typeof raw === 'string' ? raw : JSON.stringify(raw));
  } catch {
    // quarantine is best-effort
  }
  return validator.repair ? validator.repair(raw) : null;
}

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
      const repaired = salvage(key, idbValue, validator, 'idb');
      if (repaired !== null) return repaired;
    }
  } catch {
    console.warn(`[storage] Failed to read "${key}" from IndexedDB`);
  }

  // Fallback to localStorage (handles migration from old storage)
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      const repaired = salvage(key, raw, validator, 'local');
      return repaired ?? fallback;
    }

    // Migrate to IndexedDB
    set(key, parsed).catch(() => {});
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** One warning per backend per session, so a failing IndexedDB doesn't re-fire on every save. */
const warned = { idb: false, local: false };

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/**
 * Save to IndexedDB (primary) and localStorage (backup).
 * Dual-write ensures fast synchronous reads on cold start while
 * IndexedDB provides the larger, more reliable store.
 */
export function saveToStorage(key: string, value: unknown): void {
  // Async write to IndexedDB (primary)
  set(key, value).catch((err) => {
    if (!warned.idb) {
      warned.idb = true;
      console.error('[storage] IndexedDB write failed:', err);
      window.dispatchEvent(new CustomEvent('storage-full'));
    }
  });

  // Sync write to localStorage (backup / fast cold-start reads)
  try {
    localStorage.setItem(key, JSON.stringify(value));
    warned.local = false;
  } catch (err) {
    if (!warned.local && isQuotaError(err)) {
      warned.local = true;
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
    if (validator && !validator(parsed)) {
      const repaired = salvage(key, raw, validator, 'local');
      return repaired ?? fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

// --- Validators for each data type ---

/** Array validator that can also repair by keeping only the well-formed rows. */
function isArrayOf<T>(check: (item: unknown) => boolean): Validator<T[]> {
  const validator = ((value: unknown): value is T[] =>
    Array.isArray(value) && (value.length === 0 || value.every(check))) as Validator<T[]>;
  validator.repair = (value: unknown) => (Array.isArray(value) ? (value.filter(check) as T[]) : null);
  return validator;
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

export const isGamificationData: Validator<GamificationData> = (
  value: unknown
): value is GamificationData =>
  hasKeys(value, 'checkIns', 'seenAchievements') &&
  Array.isArray((value as GamificationData).checkIns) &&
  (value as GamificationData).checkIns.every((d) => typeof d === 'string') &&
  Array.isArray((value as GamificationData).seenAchievements) &&
  (value as GamificationData).seenAchievements.every((id) => typeof id === 'string');

export { KEYS };
