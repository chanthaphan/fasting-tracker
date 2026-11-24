import { subDays } from 'date-fns';
import { dateKey } from './date-utils';
import type { BloodPressureEntry } from '../types';

/**
 * Adult blood pressure categories as in the AHA/ACC guideline. A reading takes
 * the highest category either number reaches ("or", not "and"), except that
 * "normal" and "elevated" both need the diastolic number to be under 80.
 */
export type BpCategory = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';

export function classifyBp(systolic: number, diastolic: number): BpCategory {
  if (systolic > 180 || diastolic > 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'stage2';
  if (systolic >= 130 || diastolic >= 80) return 'stage1';
  if (systolic >= 120) return 'elevated';
  return 'normal';
}

/** Tailwind classes per category: a chip (badge) and a text colour. Labels carry the meaning too, never colour alone. */
export const BP_STYLE: Record<BpCategory, { chip: string; text: string }> = {
  normal: { chip: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300', text: 'text-green-600 dark:text-green-400' },
  elevated: { chip: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300', text: 'text-yellow-600 dark:text-yellow-400' },
  stage1: { chip: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-400' },
  stage2: { chip: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300', text: 'text-red-600 dark:text-red-400' },
  crisis: { chip: 'bg-red-600 text-white', text: 'text-red-700 dark:text-red-400' },
};

/** Plausible human ranges; anything outside is almost certainly a typo. */
export const BP_LIMITS = {
  systolic: { min: 60, max: 260 },
  diastolic: { min: 30, max: 160 },
  pulse: { min: 30, max: 220 },
} as const;

export type BpError = 'systolic' | 'diastolic' | 'pulse' | 'order';

/** What is wrong with a reading, if anything. Pulse is optional (null/undefined skips it). */
export function validateBp(systolic: number, diastolic: number, pulse?: number | null): BpError | null {
  const inRange = (v: number, r: { min: number; max: number }) => Number.isFinite(v) && v >= r.min && v <= r.max;
  if (!inRange(systolic, BP_LIMITS.systolic)) return 'systolic';
  if (!inRange(diastolic, BP_LIMITS.diastolic)) return 'diastolic';
  if (pulse !== null && pulse !== undefined && !inRange(pulse, BP_LIMITS.pulse)) return 'pulse';
  if (systolic <= diastolic) return 'order';
  return null;
}

/** Newest first, by the day and time of the reading (not when it was typed in). */
export function sortBpNewestFirst(entries: BloodPressureEntry[]): BloodPressureEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '') || b.createdAt - a.createdAt
  );
}

export interface BpAverage {
  systolic: number;
  diastolic: number;
  /** null when no reading in the window has a pulse */
  pulse: number | null;
  count: number;
}

/** Mean of the readings from the last `days` days (today included), or null when there are none. */
export function averageBp(entries: BloodPressureEntry[], days: number, today: Date = new Date()): BpAverage | null {
  const from = dateKey(subDays(today, days - 1));
  const to = dateKey(today);
  const inWindow = entries.filter((e) => e.date >= from && e.date <= to);
  if (inWindow.length === 0) return null;
  const mean = (values: number[]) => Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  const pulses = inWindow.map((e) => e.pulse).filter((p): p is number => typeof p === 'number');
  return {
    systolic: mean(inWindow.map((e) => e.systolic)),
    diastolic: mean(inWindow.map((e) => e.diastolic)),
    pulse: pulses.length > 0 ? mean(pulses) : null,
    count: inWindow.length,
  };
}
