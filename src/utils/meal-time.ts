import type { MealType } from '../types';

/** The meal a log made at this time of day most likely belongs to. */
export function defaultMealType(date: Date = new Date()): MealType {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snacks';
}
