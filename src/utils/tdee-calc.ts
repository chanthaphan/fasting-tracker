import { linearTrend } from './chart-data';
import { toKg } from './units';
import type { UserProfile, FoodEntry, WeightEntry, ExerciseEntry, ActivityLevel } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (office job)',
  light: 'Lightly Active (1-2x/week)',
  moderate: 'Moderately Active (3-5x/week)',
  active: 'Very Active (6-7x/week)',
  very_active: 'Extra Active (athlete)',
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
const WINDOW_DAYS = 28;
const KCAL_PER_KG = 7700;
const MIN_LOGGED_KCAL = 500;
const MIN_COVERAGE = 0.6;

export function calcBMR(profile: UserProfile, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.gender === 'male' ? base + 5 : base - 161;
}

/**
 * Estimate TDEE from BMR and activity level (formula-based)
 */
export function calcFormulaTDEE(profile: UserProfile, weightKg: number): number {
  const bmr = calcBMR(profile, weightKg);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

/**
 * Data-driven TDEE from the energy balance over a rolling window:
 *   TDEE = average intake − (weight slope in kg/day × 7700 kcal/kg)
 * Exercise is NOT added: whatever was burned already shows up in the
 * weight trend. Uses a least-squares slope over the last 28 days of
 * weigh-ins (never just the two endpoints), needs at least a 7-day span
 * and 7 logged days, and ignores days with under 500 kcal logged, which
 * are almost always incomplete logs rather than real intake.
 */
export function calcDataDrivenTDEE(
  foodEntries: FoodEntry[],
  exerciseEntries: ExerciseEntry[],
  weightEntries: WeightEntry[],
): { tdee: number; confidence: 'low' | 'medium' | 'high'; daysUsed: number } | null {
  void exerciseEntries; // kept for call-site compatibility; see doc comment
  if (weightEntries.length < 2) return null;

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const lastDate = new Date(last.date + 'T00:00:00');
  const windowStart = new Date(lastDate);
  windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);
  let window = sorted.filter((w) => new Date(w.date + 'T00:00:00') >= windowStart);
  if (window.length < 2) window = sorted.slice(-2);
  const first = window[0];

  const firstDate = new Date(first.date + 'T00:00:00');
  const daySpan = Math.round((lastDate.getTime() - firstDate.getTime()) / 86400000);
  if (daySpan < 7) return null;

  const fit = linearTrend(
    window.map((w) => ({
      t: (new Date(w.date + 'T00:00:00').getTime() - firstDate.getTime()) / 86400000,
      v: toKg(w.weight, w.unit),
    }))
  );
  if (!fit) return null;
  const dailyWeightChangeKg = fit.slope;

  // Intake over the same span, counting only days that look fully logged
  const perDay = new Map<string, number>();
  for (const e of foodEntries) {
    if (e.date >= first.date && e.date <= last.date) perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.calories);
  }
  const loggedDays = [...perDay.values()].filter((kcal) => kcal >= MIN_LOGGED_KCAL);
  const daysWithFood = loggedDays.length;
  if (daysWithFood < 7) return null;
  if (daysWithFood / (daySpan + 1) < MIN_COVERAGE) return null;

  const avgDailyCalories = loggedDays.reduce((sum, k) => sum + k, 0) / daysWithFood;
  const tdee = Math.round(avgDailyCalories - dailyWeightChangeKg * KCAL_PER_KG);

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (daySpan >= 28 && daysWithFood >= 21) confidence = 'high';
  else if (daySpan >= 14 && daysWithFood >= 10) confidence = 'medium';

  return { tdee: Math.max(800, tdee), confidence, daysUsed: daysWithFood };
}

/**
 * Get best TDEE estimate: data-driven if available, formula-based as fallback
 */
export function getTDEE(
  profile: UserProfile | null,
  weightKg: number | null,
  foodEntries: FoodEntry[],
  exerciseEntries: ExerciseEntry[],
  weightEntries: WeightEntry[],
): { tdee: number; method: 'data' | 'formula'; confidence?: 'low' | 'medium' | 'high'; daysUsed?: number } | null {
  // Try data-driven first
  const dataResult = calcDataDrivenTDEE(foodEntries, exerciseEntries, weightEntries);
  if (dataResult) {
    return { tdee: dataResult.tdee, method: 'data', confidence: dataResult.confidence, daysUsed: dataResult.daysUsed };
  }

  // Fall back to formula
  if (profile && weightKg) {
    return { tdee: calcFormulaTDEE(profile, weightKg), method: 'formula' };
  }

  return null;
}
