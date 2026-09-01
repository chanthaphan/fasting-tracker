import { describe, it, expect } from 'vitest';
import { computeXp, getLevelInfo, XP_RULES, LEVEL_TITLES } from './xp';

const emptyState = {
  fastingSessions: [],
  weightEntries: [],
  foodEntries: [],
  workoutSessions: [],
  gamification: { checkIns: [], seenAchievements: [] },
};

describe('computeXp', () => {
  it('returns 0 for empty state', () => {
    expect(computeXp(emptyState)).toBe(0);
  });

  it('awards XP per check-in date', () => {
    const state = { ...emptyState, gamification: { checkIns: ['2025-01-01', '2025-01-02'], seenAchievements: [] } };
    expect(computeXp(state)).toBe(2 * XP_RULES.checkIn);
  });

  it('awards XP for completed fasts and a bonus when target is met', () => {
    const hour = 3600000;
    const state = {
      ...emptyState,
      fastingSessions: [
        { id: 'a', startTime: 0, endTime: 16 * hour, targetHours: 16 }, // target met
        { id: 'b', startTime: 0, endTime: 10 * hour, targetHours: 16 }, // target missed
        { id: 'c', startTime: 0, endTime: 5 * hour }, // no target
        { id: 'd', startTime: 0, endTime: null }, // active — no XP
      ],
    };
    expect(computeXp(state)).toBe(3 * XP_RULES.fastCompleted + XP_RULES.fastTargetMet);
  });

  it('counts logging days, not entries', () => {
    const state = {
      ...emptyState,
      foodEntries: [
        { id: 'f1', name: 'Rice', calories: 250, protein: 5, carbs: 55, fat: 1, mealType: 'lunch' as const, date: '2025-01-01', createdAt: 1 },
        { id: 'f2', name: 'Soup', calories: 100, protein: 8, carbs: 10, fat: 3, mealType: 'dinner' as const, date: '2025-01-01', createdAt: 2 },
      ],
      weightEntries: [
        { id: 'w1', weight: 75, unit: 'kg' as const, date: '2025-01-01', createdAt: 1 },
        { id: 'w2', weight: 74.8, unit: 'kg' as const, date: '2025-01-01', createdAt: 2 },
        { id: 'w3', weight: 74.5, unit: 'kg' as const, date: '2025-01-02', createdAt: 3 },
      ],
    };
    expect(computeXp(state)).toBe(XP_RULES.foodLogDay + 2 * XP_RULES.weightLogDay);
  });

  it('awards XP only for finished workouts', () => {
    const state = {
      ...emptyState,
      workoutSessions: [
        { id: 'w1', name: 'Push', date: '2025-01-01', startTime: 1, endTime: 100, exercises: [] },
        { id: 'w2', name: 'Pull', date: '2025-01-02', startTime: 1, endTime: null, exercises: [] },
      ],
    };
    expect(computeXp(state)).toBe(XP_RULES.workoutFinished);
  });
});

describe('getLevelInfo', () => {
  it('starts at level 1 with 100 XP to level 2', () => {
    expect(getLevelInfo(0)).toEqual({ level: 1, title: 'Beginner', xpIntoLevel: 0, xpForLevel: 100, totalXp: 0 });
  });

  it('levels up at 100 XP and costs grow by 50', () => {
    expect(getLevelInfo(99).level).toBe(1);
    expect(getLevelInfo(100).level).toBe(2);
    expect(getLevelInfo(100).xpIntoLevel).toBe(0);
    expect(getLevelInfo(100).xpForLevel).toBe(150);
    expect(getLevelInfo(250).level).toBe(3);
  });

  it('clamps negative XP to 0', () => {
    expect(getLevelInfo(-50)).toEqual(getLevelInfo(0));
  });

  it('advances the title every 3 levels and clamps at the last title', () => {
    expect(getLevelInfo(0).title).toBe('Beginner');
    expect(getLevelInfo(450).level).toBe(4); // 100+150+200 = 450
    expect(getLevelInfo(450).title).toBe('Starter');
    // Very large XP → clamped to the final title, no crash
    expect(getLevelInfo(10_000_000).title).toBe(LEVEL_TITLES[LEVEL_TITLES.length - 1]);
  });
});
