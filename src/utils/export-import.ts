import type { FoodEntry, FastingSession, WeightEntry, ExerciseEntry } from '../types';
import { KEYS, loadFromStorage } from './storage';

interface ExportData {
  version: 1;
  exportedAt: string;
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries: WeightEntry[];
  exerciseEntries: ExerciseEntry[];
}

export async function exportData(): Promise<void> {
  const [foodEntries, fastingSessions, weightEntries, exerciseEntries] = await Promise.all([
    loadFromStorage<FoodEntry[]>(KEYS.FOOD_ENTRIES, []),
    loadFromStorage<FastingSession[]>(KEYS.FASTING_SESSIONS, []),
    loadFromStorage<WeightEntry[]>(KEYS.WEIGHT_ENTRIES, []),
    loadFromStorage<ExerciseEntry[]>(KEYS.EXERCISE_ENTRIES, []),
  ]);
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    foodEntries,
    fastingSessions,
    weightEntries,
    exerciseEntries,
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
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        if (!Array.isArray(data.foodEntries) || !Array.isArray(data.fastingSessions)) {
          throw new Error('Invalid backup file format');
        }
        resolve({
          foodEntries: data.foodEntries,
          fastingSessions: data.fastingSessions,
          weightEntries: Array.isArray(data.weightEntries) ? data.weightEntries : undefined,
          exerciseEntries: Array.isArray(data.exerciseEntries) ? data.exerciseEntries : undefined,
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
