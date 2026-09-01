import { describe, it, expect } from 'vitest';
import { estimateBodyFatPct, bodyFatToFatLevel, getAvatarModel } from './body-avatar';

const profile = { gender: 'male' as const, age: 30, heightCm: 175, activityLevel: 'moderate' as const };
const weightAt = (weight: number, unit: 'kg' | 'lbs' = 'kg', createdAt = 1) => ({
  id: `w${createdAt}`, weight, unit, date: '2025-01-01', createdAt,
});
const goal = { targetWeight: 70, unit: 'kg' as const, targetDate: '2025-06-01', startWeight: 80, startDate: '2025-01-01' };

describe('estimateBodyFatPct', () => {
  it('matches the Deurenberg formula for a known male case', () => {
    // BMI 25, age 30, male: 1.2*25 + 0.23*30 - 10.8 - 5.4 = 20.7
    expect(estimateBodyFatPct(25, 30, 'male')).toBeCloseTo(20.7, 5);
  });

  it('matches the Deurenberg formula for a known female case', () => {
    // BMI 22, age 40, female: 1.2*22 + 0.23*40 - 5.4 = 30.2
    expect(estimateBodyFatPct(22, 40, 'female')).toBeCloseTo(30.2, 5);
  });
});

describe('bodyFatToFatLevel', () => {
  it('clamps at both ends', () => {
    expect(bodyFatToFatLevel(5, 'male')).toBe(0);
    expect(bodyFatToFatLevel(50, 'male')).toBe(1);
  });

  it('maps gender-specific ranges linearly', () => {
    expect(bodyFatToFatLevel(8, 'male')).toBe(0);
    expect(bodyFatToFatLevel(35, 'male')).toBe(1);
    expect(bodyFatToFatLevel(21.5, 'male')).toBeCloseTo(0.5, 5);
    expect(bodyFatToFatLevel(16, 'female')).toBe(0);
    expect(bodyFatToFatLevel(42, 'female')).toBe(1);
  });
});

describe('getAvatarModel', () => {
  it('returns no-weight status with no entries', () => {
    const model = getAvatarModel({ weightEntries: [], weightGoal: null, userProfile: null });
    expect(model.status).toBe('no-weight');
    expect(model.currentWeightKg).toBeNull();
    expect(model.goalFatLevel).toBeNull();
  });

  it('returns no-goal status with weight but no goal', () => {
    const model = getAvatarModel({ weightEntries: [weightAt(80)], weightGoal: null, userProfile: profile });
    expect(model.status).toBe('no-goal');
    expect(model.currentWeightKg).toBe(80);
    expect(model.goalFatLevel).toBeNull();
    expect(model.progress).toBe(0);
  });

  it('uses the latest weight by createdAt and converts lbs to kg', () => {
    const model = getAvatarModel({
      weightEntries: [weightAt(80, 'kg', 1), weightAt(165, 'lbs', 2)],
      weightGoal: goal,
      userProfile: null,
    });
    expect(model.currentWeightKg).toBeCloseTo(74.84, 1);
  });

  it('computes progress toward the goal and clamps it', () => {
    const halfway = getAvatarModel({ weightEntries: [weightAt(75)], weightGoal: goal, userProfile: null });
    expect(halfway.progress).toBeCloseTo(0.5, 5);
    expect(halfway.mood).toBe('smile');

    const overshoot = getAvatarModel({ weightEntries: [weightAt(65)], weightGoal: goal, userProfile: null });
    expect(overshoot.progress).toBe(1);
    expect(overshoot.mood).toBe('joy');

    const regressed = getAvatarModel({ weightEntries: [weightAt(85)], weightGoal: goal, userProfile: null });
    expect(regressed.progress).toBe(0);
    expect(regressed.mood).toBe('neutral');
  });

  it('interpolates fallback fat level without a profile', () => {
    const start = getAvatarModel({ weightEntries: [weightAt(80)], weightGoal: goal, userProfile: null });
    expect(start.currentFatLevel).toBeCloseTo(0.8, 5);
    const done = getAvatarModel({ weightEntries: [weightAt(70)], weightGoal: goal, userProfile: null });
    expect(done.currentFatLevel).toBeCloseTo(0.35, 5);
    expect(done.goalFatLevel).toBeCloseTo(0.35, 5);
  });

  it('derives fat levels from body-fat estimate when a profile exists', () => {
    const model = getAvatarModel({ weightEntries: [weightAt(80)], weightGoal: goal, userProfile: profile });
    // BMI 80/1.75^2 = 26.12 → BF ~22.1% → level (22.1-8)/27 ~ 0.52
    expect(model.currentFatLevel).toBeGreaterThan(0.45);
    expect(model.currentFatLevel).toBeLessThan(0.6);
    expect(model.goalFatLevel).not.toBeNull();
    expect(model.goalFatLevel!).toBeLessThan(model.currentFatLevel);
  });

  it('guards against startWeight equal to targetWeight', () => {
    const degenerate = { ...goal, startWeight: 70, targetWeight: 70 };
    const model = getAvatarModel({ weightEntries: [weightAt(70)], weightGoal: degenerate, userProfile: null });
    expect(model.progress).toBe(0);
  });
});
