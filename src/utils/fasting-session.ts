import type { FastingSession } from '../types';

const HOUR = 3600000;
/** A fast shorter than this (and short of half its target) is a false start, not a completed fast. */
export const MIN_MEANINGFUL_FAST_MS = 4 * HOUR;

export function fastDurationMs(session: FastingSession, now: number = Date.now()): number {
  return (session.endTime ?? now) - session.startTime;
}

/**
 * Whether an ended session counts as a completed fast for XP, badges and
 * streaks: at least 4 hours, or at least half of its own target.
 */
export function isMeaningfulFast(session: FastingSession): boolean {
  if (session.endTime === null) return false;
  const duration = fastDurationMs(session);
  if (duration >= MIN_MEANINGFUL_FAST_MS) return true;
  return session.targetHours !== undefined && duration >= 0.5 * session.targetHours * HOUR;
}
