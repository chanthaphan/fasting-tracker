import type { FastingSession } from '../types';
import { dateKey } from './date-utils';
import { computeStreaksFromDates } from './streaks';
import { isMeaningfulFast } from './fasting-session';

/** The calendar day a fast belongs to: the one holding the midpoint of the fast. */
export function fastDayKey(session: FastingSession): string {
  const end = session.endTime ?? Date.now();
  return dateKey(new Date(session.startTime + (end - session.startTime) / 2));
}

/**
 * Fasting streak in days. Each completed fast credits exactly one day
 * (an overnight 16:8 no longer counts for both the evening and the
 * morning), so "fast N days in a row" means N fasts on N consecutive days.
 */
export function computeStreaks(sessions: FastingSession[]): { current: number; longest: number } {
  const fastDates = new Set<string>();
  for (const s of sessions) {
    if (!isMeaningfulFast(s)) continue;
    fastDates.add(fastDayKey(s));
  }
  return computeStreaksFromDates(fastDates);
}
