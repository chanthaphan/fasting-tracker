import type { FoodEntry, FastingSession } from '../types';
import { KEYS, loadFromStorage } from './storage';

interface ExportData {
  version: 1;
  exportedAt: string;
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
}

export function exportData(): void {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    foodEntries: loadFromStorage(KEYS.FOOD_ENTRIES, []),
    fastingSessions: loadFromStorage(KEYS.FASTING_SESSIONS, []),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fasting-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<{ foodEntries: FoodEntry[]; fastingSessions: FastingSession[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        if (!Array.isArray(data.foodEntries) || !Array.isArray(data.fastingSessions)) {
          throw new Error('Invalid backup file format');
        }
        resolve({ foodEntries: data.foodEntries, fastingSessions: data.fastingSessions });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
