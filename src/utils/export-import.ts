import type {
  FoodEntry, FastingSession, WeightEntry, ExerciseEntry, WorkoutSession, WorkoutTemplate, GamificationData,
  ImportedSettings, ImportPayload,
} from '../types';
import {
  KEYS, loadFromStorage,
  isFoodEntryArray, isFastingSessionArray, isWeightEntryArray, isExerciseEntryArray,
  isWorkoutSessionArray, isWorkoutTemplateArray, isGamificationData, isSettings, type StoredSettings,
} from './storage';

interface ExportData {
  version: 2;
  exportedAt: string;
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries: WeightEntry[];
  exerciseEntries: ExerciseEntry[];
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
  gamification?: GamificationData;
  /** Profile, macro goals, weight goal and training goal. AI settings (the API key) are deliberately excluded. */
  settings?: ImportedSettings;
}

export async function exportData(): Promise<void> {
  const [foodEntries, fastingSessions, weightEntries, exerciseEntries, workoutSessions, workoutTemplates, gamification, stored] = await Promise.all([
    loadFromStorage<FoodEntry[]>(KEYS.FOOD_ENTRIES, []),
    loadFromStorage<FastingSession[]>(KEYS.FASTING_SESSIONS, []),
    loadFromStorage<WeightEntry[]>(KEYS.WEIGHT_ENTRIES, []),
    loadFromStorage<ExerciseEntry[]>(KEYS.EXERCISE_ENTRIES, []),
    loadFromStorage<WorkoutSession[]>(KEYS.WORKOUT_SESSIONS, []),
    loadFromStorage<WorkoutTemplate[]>(KEYS.WORKOUT_TEMPLATES, []),
    loadFromStorage<GamificationData>(KEYS.GAMIFICATION, { checkIns: [], seenAchievements: [] }),
    loadFromStorage<StoredSettings | null>(KEYS.SETTINGS, null, isSettings as (v: unknown) => v is StoredSettings | null),
  ]);
  const data: ExportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    foodEntries,
    fastingSessions,
    weightEntries,
    exerciseEntries,
    workoutSessions,
    workoutTemplates,
    gamification,
    settings: stored
      ? {
          userProfile: stored.userProfile ?? null,
          goals: stored.goals,
          weightGoal: stored.weightGoal ?? null,
          trainingGoal: stored.trainingGoal ?? null,
        }
      : undefined,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fasting-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** What a backup contains, for the confirmation step before it is applied. */
export interface ImportSummary {
  version: number;
  exportedAt: string | null;
  counts: { food: number; fasts: number; weights: number; exercise: number; workouts: number };
  dateRange: { from: string; to: string } | null;
  hasSettings: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function readSettings(raw: unknown): ImportedSettings | undefined {
  if (!isRecord(raw)) return undefined;
  const out: ImportedSettings = {};
  const profile = raw.userProfile;
  if (profile === null) out.userProfile = null;
  else if (isRecord(profile) && typeof profile.heightCm === 'number' && typeof profile.age === 'number' && (profile.gender === 'male' || profile.gender === 'female')) {
    out.userProfile = profile as unknown as ImportedSettings['userProfile'];
  }
  const goals = raw.goals;
  if (isRecord(goals) && typeof goals.calories === 'number') out.goals = goals as unknown as ImportedSettings['goals'];
  const weightGoal = raw.weightGoal;
  if (weightGoal === null) out.weightGoal = null;
  else if (isRecord(weightGoal) && typeof weightGoal.targetWeight === 'number' && typeof weightGoal.targetDate === 'string') {
    out.weightGoal = weightGoal as unknown as ImportedSettings['weightGoal'];
  }
  const trainingGoal = raw.trainingGoal;
  if (trainingGoal === null) out.trainingGoal = null;
  else if (isRecord(trainingGoal)) out.trainingGoal = trainingGoal as unknown as ImportedSettings['trainingGoal'];
  return Object.keys(out).length > 0 ? out : undefined;
}

export function summarizeImport(payload: ImportPayload, version: number, exportedAt: string | null): ImportSummary {
  const dates = [
    ...payload.foodEntries.map((e) => e.date),
    ...(payload.weightEntries ?? []).map((e) => e.date),
    ...(payload.exerciseEntries ?? []).map((e) => e.date),
    ...payload.fastingSessions.map((s) => new Date(s.startTime).toISOString().slice(0, 10)),
  ].filter((d) => typeof d === 'string' && d.length >= 10).sort();
  return {
    version,
    exportedAt,
    counts: {
      food: payload.foodEntries.length,
      fasts: payload.fastingSessions.length,
      weights: payload.weightEntries?.length ?? 0,
      exercise: payload.exerciseEntries?.length ?? 0,
      workouts: payload.workoutSessions?.length ?? 0,
    },
    dateRange: dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
    hasSettings: payload.settings !== undefined,
  };
}

/**
 * Parse and validate a backup file. Every array is run through the same
 * validators the app uses for its own storage, so a malformed file can't
 * reach the reducer. Rows that fail validation are dropped, not the file.
 */
export function parseImportFile(file: File): Promise<{ payload: ImportPayload; summary: ImportSummary }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!isRecord(data)) throw new Error('Invalid backup file format');
        const version = typeof data.version === 'number' ? data.version : 0;
        if (version > 2) throw new Error('This backup was made by a newer version of the app');
        const food = isFoodEntryArray(data.foodEntries) ? data.foodEntries : isFoodEntryArray.repair?.(data.foodEntries);
        const fasts = isFastingSessionArray(data.fastingSessions) ? data.fastingSessions : isFastingSessionArray.repair?.(data.fastingSessions);
        if (!food || !fasts) throw new Error('Invalid backup file format');
        const optional = <T>(value: unknown, validator: typeof isWeightEntryArray | typeof isExerciseEntryArray | typeof isWorkoutSessionArray | typeof isWorkoutTemplateArray): T | undefined => {
          if (value === undefined) return undefined;
          if (validator(value)) return value as unknown as T;
          return (validator.repair?.(value) as unknown as T | null) ?? undefined;
        };
        const payload: ImportPayload = {
          foodEntries: food,
          fastingSessions: fasts,
          weightEntries: optional<WeightEntry[]>(data.weightEntries, isWeightEntryArray),
          exerciseEntries: optional<ExerciseEntry[]>(data.exerciseEntries, isExerciseEntryArray),
          workoutSessions: optional<WorkoutSession[]>(data.workoutSessions, isWorkoutSessionArray),
          workoutTemplates: optional<WorkoutTemplate[]>(data.workoutTemplates, isWorkoutTemplateArray),
          gamification: isGamificationData(data.gamification) ? data.gamification : undefined,
          settings: readSettings(data.settings),
        };
        resolve({
          payload,
          summary: summarizeImport(payload, version, typeof data.exportedAt === 'string' ? data.exportedAt : null),
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
