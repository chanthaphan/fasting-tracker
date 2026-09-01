import type { FastingSession } from '../types';
import { dateKey } from './date-utils';
import { computeStreaksFromDates } from './streaks';

export function computeStreaks(sessions: FastingSession[]): { current: number; longest: number } {
  // Collect all calendar dates that have a completed fast
  const fastDates = new Set<string>();
  for (const s of sessions) {
    if (s.endTime === null) continue;
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    // Add each day the session spans
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor <= end) {
      fastDates.add(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return computeStreaksFromDates(fastDates);
}
