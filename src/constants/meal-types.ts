import type { MealType } from '../types';
import type { MessageKey } from '../i18n/messages';

export const MEAL_TYPES: { value: MealType; labelKey: MessageKey; icon: string }[] = [
  { value: 'breakfast', labelKey: 'meal.breakfast', icon: '🌅' },
  { value: 'lunch', labelKey: 'meal.lunch', icon: '☀️' },
  { value: 'dinner', labelKey: 'meal.dinner', icon: '🌙' },
  { value: 'snacks', labelKey: 'meal.snacks', icon: '🍿' },
];
