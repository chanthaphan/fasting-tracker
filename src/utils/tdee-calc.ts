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
 * Estimate TDEE from actual weight change and calorie intake data.
 *
 * Logic: If you eat X calories/day and lose Y kg/week,
 * then TDEE = X + (Y × 7700 / 7) kcal/day
 * (7700 kcal ≈ 1 kg of body fat)
 *
 * Requires at least 14 days of data for a meaningful estimate.
 */
export function calcDataDrivenTDEE(
  foodEntries: FoodEntry[],
  exerciseEntries: ExerciseEntry[],
  weightEntries: WeightEntry[],
): { tdee: number; confidence: 'low' | 'medium' | 'high'; daysUsed: number } | null {
  if (weightEntries.length < 2) return null;

  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const firstDate = new Date(first.date + 'T00:00:00');
  const lastDate = new Date(last.date + 'T00:00:00');
  const daySpan = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daySpan < 7) return null;

  // Convert to kg if needed
  const toKg = (w: number, unit: string) => unit === 'lbs' ? w * 0.453592 : w;
  const weightChangeKg = toKg(last.weight, last.unit) - toKg(first.weight, first.unit);

  // Average daily weight change in kg
  const dailyWeightChangeKg = weightChangeKg / daySpan;

  // Get food entries in the date range
  const foodInRange = foodEntries.filter((e) => e.date >= first.date && e.date <= last.date);
  const exerciseInRange = exerciseEntries.filter((e) => e.date >= first.date && e.date <= last.date);

  // Count days with food logged
  const daysWithFood = new Set(foodInRange.map((e) => e.date)).size;
  if (daysWithFood < 7) return null;

  // Average daily calories consumed
  const totalFoodCalories = foodInRange.reduce((sum, e) => sum + e.calories, 0);
  const avgDailyCalories = totalFoodCalories / daysWithFood;

  // Average daily exercise calories
  const totalExerciseCalories = exerciseInRange.reduce((sum, e) => sum + e.calories, 0);
  const avgDailyExercise = totalExerciseCalories / daysWithFood;

  // TDEE = calories_in + exercise_burned - (weight_change_per_day × 7700)
  // Negative weight change (loss) means TDEE > intake, so we subtract the negative
  const tdee = Math.round(avgDailyCalories + avgDailyExercise - dailyWeightChangeKg * 7700);

  // Confidence based on data quality
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
