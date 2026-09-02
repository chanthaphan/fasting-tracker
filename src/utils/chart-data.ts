import { addDays, format, parseISO, startOfDay } from 'date-fns';
import type { FoodEntry, FastingSession } from '../types';

/** One x-axis slot on a daily chart. */
export interface DayBucket {
  key: string; // 'YYYY-MM-DD'
  label: string; // short axis label
}

const DAY_MS = 86400000;

/** The last `n` calendar days ending today, oldest first. */
export function lastNDays(n: number, today: Date = new Date()): DayBucket[] {
  const start = startOfDay(today);
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(start, i - (n - 1));
    return { key: format(d, 'yyyy-MM-dd'), label: format(d, n <= 7 ? 'EEE' : 'd') };
  });
}

/** Sum `value(entry)` per day bucket, matching on the entry's 'YYYY-MM-DD' date. */
export function dailyTotals<T extends { date: string }>(
  entries: T[],
  days: DayBucket[],
  value: (entry: T) => number
): number[] {
  const index = new Map(days.map((d, i) => [d.key, i]));
  const totals = days.map(() => 0);
  for (const e of entries) {
    const i = index.get(e.date);
    if (i !== undefined) totals[i] += value(e);
  }
  return totals;
}

export interface DailyMacros {
  calories: number[];
  protein: number[];
  carbs: number[];
  fat: number[];
}

export function dailyMacros(entries: FoodEntry[], days: DayBucket[]): DailyMacros {
  return {
    calories: dailyTotals(entries, days, (e) => e.calories),
    protein: dailyTotals(entries, days, (e) => e.protein),
    carbs: dailyTotals(entries, days, (e) => e.carbs),
    fat: dailyTotals(entries, days, (e) => e.fat),
  };
}

/**
 * Hours spent fasting on each day. A fast that spans midnight is split
 * across the days it covers, so a 16h overnight fast credits both days.
 * An active fast counts up to `now`.
 */
export function dailyFastingHours(
  sessions: FastingSession[],
  days: DayBucket[],
  now: number = Date.now()
): number[] {
  const hours = days.map(() => 0);
  const bounds = days.map((d) => {
    const start = startOfDay(parseISO(d.key)).getTime();
    return [start, start + DAY_MS] as const;
  });
  for (const s of sessions) {
    const end = s.endTime ?? now;
    if (end <= s.startTime) continue;
    bounds.forEach(([dayStart, dayEnd], i) => {
      const overlap = Math.min(end, dayEnd) - Math.max(s.startTime, dayStart);
      if (overlap > 0) hours[i] += overlap / 3600000;
    });
  }
  return hours.map((h) => Math.round(h * 10) / 10);
}

/**
 * Clean axis ticks covering [min, max]: picks a 1/2/2.5/5 × 10^k step so
 * the labels read as round numbers, and widens the domain to whole steps.
 */
export function niceTicks(min: number, max: number, target = 4): { ticks: number[]; min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0], min: 0, max: 1 };
  if (max <= min) max = min + 1;
  const raw = (max - min) / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { ticks, min: lo, max: hi };
}

/** Least-squares line through (t, v) points; null when fewer than 2 distinct t. */
export function linearTrend(points: { t: number; v: number }[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  const mt = points.reduce((s, p) => s + p.t, 0) / n;
  const mv = points.reduce((s, p) => s + p.v, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.t - mt) * (p.v - mv);
    den += (p.t - mt) * (p.t - mt);
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: mv - slope * mt };
}
