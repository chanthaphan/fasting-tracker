import { describe, it, expect } from 'vitest';
import { calcBMR, calcFormulaTDEE, calcDataDrivenTDEE, getTDEE } from './tdee-calc';
import type { UserProfile, FoodEntry, WeightEntry, ExerciseEntry } from '../types';

const maleProfile: UserProfile = {
  gender: 'male',
  age: 30,
  heightCm: 175,
  activityLevel: 'moderate',
};

const femaleProfile: UserProfile = {
  gender: 'female',
  age: 25,
  heightCm: 160,
  activityLevel: 'light',
};

describe('calcBMR', () => {
  it('calculates BMR for male using Mifflin-St Jeor', () => {
    // BMR = 10 × 75 + 6.25 × 175 - 5 × 30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    const bmr = calcBMR(maleProfile, 75);
    expect(bmr).toBeCloseTo(1698.75, 1);
  });

  it('calculates BMR for female using Mifflin-St Jeor', () => {
    // BMR = 10 × 55 + 6.25 × 160 - 5 × 25 - 161 = 550 + 1000 - 125 - 161 = 1264
    const bmr = calcBMR(femaleProfile, 55);
    expect(bmr).toBeCloseTo(1264, 1);
  });

  it('returns higher BMR for heavier person', () => {
    expect(calcBMR(maleProfile, 90)).toBeGreaterThan(calcBMR(maleProfile, 70));
  });
});

describe('calcFormulaTDEE', () => {
  it('applies correct activity multiplier for moderate activity', () => {
    const bmr = calcBMR(maleProfile, 75);
    const tdee = calcFormulaTDEE(maleProfile, 75);
    expect(tdee).toBe(Math.round(bmr * 1.55));
  });

  it('sedentary has lower TDEE than active', () => {
    const sedentary = calcFormulaTDEE({ ...maleProfile, activityLevel: 'sedentary' }, 75);
    const active = calcFormulaTDEE({ ...maleProfile, activityLevel: 'active' }, 75);
    expect(active).toBeGreaterThan(sedentary);
  });

  it('returns reasonable TDEE range (1200-4000)', () => {
    const tdee = calcFormulaTDEE(maleProfile, 75);
    expect(tdee).toBeGreaterThan(1200);
    expect(tdee).toBeLessThan(4000);
  });
});

describe('calcDataDrivenTDEE', () => {
  function makeFoodEntries(days: number, caloriesPerDay: number): FoodEntry[] {
    const entries: FoodEntry[] = [];
    const start = new Date('2025-01-01');
    for (let d = 0; d < days; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      entries.push({
        id: `f-${d}`,
        name: 'Food',
        calories: caloriesPerDay,
        protein: 50,
        carbs: 200,
        fat: 50,
        mealType: 'lunch',
        date: dateStr,
        createdAt: date.getTime(),
      });
    }
    return entries;
  }

  function makeWeightEntries(startWeight: number, endWeight: number, days: number): WeightEntry[] {
    const start = new Date('2025-01-01');
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return [
      { id: 'w1', weight: startWeight, unit: 'kg' as const, date: start.toISOString().split('T')[0], createdAt: start.getTime() },
      { id: 'w2', weight: endWeight, unit: 'kg' as const, date: end.toISOString().split('T')[0], createdAt: end.getTime() },
    ];
  }

  it('returns null with fewer than 2 weight entries', () => {
    const result = calcDataDrivenTDEE([], [], []);
    expect(result).toBeNull();
  });

  it('returns null with less than 7 days span', () => {
    const weights = makeWeightEntries(80, 79.5, 5);
    const foods = makeFoodEntries(5, 2000);
    expect(calcDataDrivenTDEE(foods, [], weights)).toBeNull();
  });

  it('returns null with fewer than 7 days of food data', () => {
    const weights = makeWeightEntries(80, 79, 14);
    const foods = makeFoodEntries(5, 2000);
    expect(calcDataDrivenTDEE(foods, [], weights)).toBeNull();
  });

  it('estimates TDEE from weight loss and calorie intake', () => {
    // Eating 1500 cal/day, lost 1kg over 14 days
    // Weight change rate: -1/14 kg/day
    // TDEE = 1500 - (-1/14 × 7700) = 1500 + 550 = 2050
    const weights = makeWeightEntries(80, 79, 14);
    const foods = makeFoodEntries(14, 1500);
    const result = calcDataDrivenTDEE(foods, [], weights);
    expect(result).not.toBeNull();
    expect(result!.tdee).toBeGreaterThan(1900);
    expect(result!.tdee).toBeLessThan(2200);
  });

  it('estimates TDEE from weight gain and calorie intake', () => {
    // Eating 3000 cal/day, gained 1kg over 14 days
    // Weight change rate: +1/14 kg/day
    // TDEE = 3000 - (1/14 × 7700) = 3000 - 550 = 2450
    const weights = makeWeightEntries(80, 81, 14);
    const foods = makeFoodEntries(14, 3000);
    const result = calcDataDrivenTDEE(foods, [], weights);
    expect(result).not.toBeNull();
    expect(result!.tdee).toBeGreaterThan(2300);
    expect(result!.tdee).toBeLessThan(2600);
  });

  it('accounts for exercise calories', () => {
    const weights = makeWeightEntries(80, 79, 14);
    const foods = makeFoodEntries(14, 1500);
    const exercise: ExerciseEntry[] = foods.map((f, i) => ({
      id: `e-${i}`,
      name: 'Run',
      calories: 300,
      durationMin: 30,
      date: f.date,
      createdAt: f.createdAt,
    }));
    const result = calcDataDrivenTDEE(foods, exercise, weights);
    const resultNoExercise = calcDataDrivenTDEE(foods, [], weights);
    expect(result!.tdee).toBeGreaterThan(resultNoExercise!.tdee);
  });

  it('returns low confidence for 7-13 day range', () => {
    const weights = makeWeightEntries(80, 79.5, 10);
    const foods = makeFoodEntries(10, 2000);
    const result = calcDataDrivenTDEE(foods, [], weights);
    expect(result!.confidence).toBe('low');
  });

  it('returns medium confidence for 14-27 day range', () => {
    const weights = makeWeightEntries(80, 79, 20);
    const foods = makeFoodEntries(15, 2000);
    const result = calcDataDrivenTDEE(foods, [], weights);
    expect(result!.confidence).toBe('medium');
  });

  it('returns high confidence for 28+ days', () => {
    const weights = makeWeightEntries(80, 78, 30);
    const foods = makeFoodEntries(25, 2000);
    const result = calcDataDrivenTDEE(foods, [], weights);
    expect(result!.confidence).toBe('high');
  });

  it('never returns TDEE below 800', () => {
    // Extreme case: very low calories, weight gain
    const weights = makeWeightEntries(80, 85, 14);
    const foods = makeFoodEntries(14, 500);
    const result = calcDataDrivenTDEE(foods, [], weights);
    expect(result).not.toBeNull();
    expect(result!.tdee).toBeGreaterThanOrEqual(800);
  });
});

describe('getTDEE', () => {
  it('returns null when no profile and no data', () => {
    expect(getTDEE(null, null, [], [], [])).toBeNull();
  });

  it('returns formula-based when profile exists but insufficient data', () => {
    const result = getTDEE(maleProfile, 75, [], [], []);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('formula');
  });

  it('prefers data-driven when sufficient data exists', () => {
    const start = new Date('2025-01-01');
    const foods: FoodEntry[] = [];
    for (let d = 0; d < 14; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + d);
      foods.push({
        id: `f-${d}`,
        name: 'Food',
        calories: 1800,
        protein: 50,
        carbs: 200,
        fat: 50,
        mealType: 'lunch',
        date: date.toISOString().split('T')[0],
        createdAt: date.getTime(),
      });
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    const weights: WeightEntry[] = [
      { id: 'w1', weight: 80, unit: 'kg', date: '2025-01-01', createdAt: start.getTime() },
      { id: 'w2', weight: 79, unit: 'kg', date: end.toISOString().split('T')[0], createdAt: end.getTime() },
    ];

    const result = getTDEE(maleProfile, 80, foods, [], weights);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('data');
  });
});
