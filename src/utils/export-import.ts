import type { FoodEntry, FastingSession, WeightEntry, ExerciseEntry, WorkoutSession, WorkoutTemplate } from '../types';
import {
  KEYS, loadFromStorage,
  isFoodEntryArray, isFastingSessionArray, isWeightEntryArray, isExerciseEntryArray,
  isWorkoutSessionArray, isWorkoutTemplateArray,
} from './storage';

interface ExportData {
  version: 1;
  exportedAt: string;
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries: WeightEntry[];
  exerciseEntries: ExerciseEntry[];
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
}

export async function exportData(): Promise<void> {
  const [foodEntries, fastingSessions, weightEntries, exerciseEntries, workoutSessions, workoutTemplates] = await Promise.all([
    loadFromStorage<FoodEntry[]>(KEYS.FOOD_ENTRIES, []),
    loadFromStorage<FastingSession[]>(KEYS.FASTING_SESSIONS, []),
    loadFromStorage<WeightEntry[]>(KEYS.WEIGHT_ENTRIES, []),
    loadFromStorage<ExerciseEntry[]>(KEYS.EXERCISE_ENTRIES, []),
    loadFromStorage<WorkoutSession[]>(KEYS.WORKOUT_SESSIONS, []),
    loadFromStorage<WorkoutTemplate[]>(KEYS.WORKOUT_TEMPLATES, []),
  ]);
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    foodEntries,
    fastingSessions,
    weightEntries,
    exerciseEntries,
    workoutSessions,
    workoutTemplates,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fasting-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<{
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries?: WeightEntry[];
  exerciseEntries?: ExerciseEntry[];
  workoutSessions?: WorkoutSession[];
  workoutTemplates?: WorkoutTemplate[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!isFoodEntryArray(data.foodEntries) || !isFastingSessionArray(data.fastingSessions)) {
          throw new Error('Invalid backup file format');
        }
        resolve({
          foodEntries: data.foodEntries,
          fastingSessions: data.fastingSessions,
          weightEntries: isWeightEntryArray(data.weightEntries) ? data.weightEntries : undefined,
          exerciseEntries: isExerciseEntryArray(data.exerciseEntries) ? data.exerciseEntries : undefined,
          workoutSessions: isWorkoutSessionArray(data.workoutSessions) ? data.workoutSessions : undefined,
          workoutTemplates: isWorkoutTemplateArray(data.workoutTemplates) ? data.workoutTemplates : undefined,
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
