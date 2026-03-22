import type { FastingSession } from '../types';
import { dateKey } from './date-utils';

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

  if (fastDates.size === 0) return { current: 0, longest: 0 };

  const sorted = [...fastDates].sort();

  // Compute all streaks
  let longest = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: count backward from today (or yesterday if today has no fast yet)
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  let current = 0;

  let startFrom = '';
  if (fastDates.has(today)) {
    startFrom = today;
  } else if (fastDates.has(yesterday)) {
    startFrom = yesterday;
  }

  if (startFrom) {
    current = 1;
    const d = new Date(startFrom + 'T00:00:00');
    while (true) {
      d.setDate(d.getDate() - 1);
      if (fastDates.has(dateKey(d))) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}
