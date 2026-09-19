import type { FoodEntry, MacroGoals } from '../types';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** mg */
  sodium: number;
  /** grams */
  sugar: number;
}

/** Thai dietary guidance: no more than 2,000 mg of sodium a day. */
export const DEFAULT_SODIUM_MG = 2000;

/** The sodium goal, for goals saved before sodium tracking existed. */
export function sodiumGoalOf(goals: MacroGoals): number {
  return goals.sodium ?? DEFAULT_SODIUM_MG;
}

/** Thai dietary guidance: no more than 6 teaspoons (24 g) of added sugar a day. */
export const DEFAULT_SUGAR_G = 24;

export function sugarGoalOf(goals: MacroGoals): number {
  return goals.sugar ?? DEFAULT_SUGAR_G;
}

export function sumMacros(entries: FoodEntry[]): MacroTotals {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      sodium: acc.sodium + (e.sodium ?? 0),
      sugar: acc.sugar + (e.sugar ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, sugar: 0 }
  );
}
