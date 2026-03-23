import { describe, it, expect } from 'vitest';
import { sumMacros } from './macro-calc';
import type { FoodEntry } from '../types';

const entry = (overrides: Partial<FoodEntry>): FoodEntry => ({
  id: '1',
  name: 'Food',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  mealType: 'lunch',
  date: '2025-01-01',
  createdAt: 1,
  ...overrides,
});

describe('sumMacros', () => {
  it('returns zeros for empty array', () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('sums single entry correctly', () => {
    const result = sumMacros([entry({ calories: 500, protein: 20, carbs: 60, fat: 15 })]);
    expect(result).toEqual({ calories: 500, protein: 20, carbs: 60, fat: 15 });
  });

  it('sums multiple entries', () => {
    const entries = [
      entry({ calories: 300, protein: 10, carbs: 40, fat: 8 }),
      entry({ id: '2', calories: 200, protein: 15, carbs: 20, fat: 5 }),
      entry({ id: '3', calories: 100, protein: 5, carbs: 10, fat: 2 }),
    ];
    const result = sumMacros(entries);
    expect(result).toEqual({ calories: 600, protein: 30, carbs: 70, fat: 15 });
  });
});
