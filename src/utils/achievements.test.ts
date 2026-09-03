import { describe, it, expect } from 'vitest';
import { getUnlockedAchievements } from './achievements';
import { ACHIEVEMENTS } from '../constants/achievements';
import { dateKey } from './date-utils';

const hour = 3600000;
const daysAgo = (n: number) => dateKey(new Date(Date.now() - n * 86400000));

const emptyState = {
  fastingSessions: [],
  weightEntries: [],
  weightGoal: null,
  userProfile: null,
  workoutSessions: [],
  gamification: { checkIns: [], seenAchievements: [] },
};

describe('getUnlockedAchievements', () => {
  it('unlocks nothing for an empty state', () => {
    expect(getUnlockedAchievements(emptyState).size).toBe(0);
  });

  it('unlocks fast duration badges', () => {
    const state = {
      ...emptyState,
      fastingSessions: [
        { id: 'a', startTime: 0, endTime: 17 * hour },
        { id: 'b', startTime: 0, endTime: null },
      ],
    };
    const unlocked = getUnlockedAchievements(state);
    expect(unlocked.has('first-fast')).toBe(true);
    expect(unlocked.has('fast-16h')).toBe(true);
    expect(unlocked.has('fast-24h')).toBe(false);
  });

  it('unlocks fasting streak badges from the longest streak', () => {
    // 7 consecutive completed fasts, one per day (a 2h fast would be a false start and not count)
    const sessions = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(daysAgo(i) + 'T08:00:00').getTime();
      return { id: `s${i}`, startTime: dayStart, endTime: dayStart + 5 * hour };
    });
    const unlocked = getUnlockedAchievements({ ...emptyState, fastingSessions: sessions });
    expect(unlocked.has('fast-streak-3')).toBe(true);
    expect(unlocked.has('fast-streak-7')).toBe(true);
    expect(unlocked.has('fast-streak-14')).toBe(false);
  });

  it('unlocks weight badges by distinct days', () => {
    const weightEntries = Array.from({ length: 7 }, (_, i) => ({
      id: `w${i}`, weight: 80 - i, unit: 'kg' as const, date: daysAgo(i), createdAt: i + 1,
    }));
    const unlocked = getUnlockedAchievements({ ...emptyState, weightEntries });
    expect(unlocked.has('first-weight')).toBe(true);
    expect(unlocked.has('weight-7-days')).toBe(true);
  });

  it('unlocks goal badges from progress', () => {
    const goal = { targetWeight: 70, unit: 'kg' as const, targetDate: '2026-06-01', startWeight: 80, startDate: '2026-01-01' };
    const halfway = getUnlockedAchievements({
      ...emptyState,
      weightGoal: goal,
      weightEntries: [{ id: 'w1', weight: 75, unit: 'kg' as const, date: daysAgo(0), createdAt: 1 }],
    });
    expect(halfway.has('goal-halfway')).toBe(true);
    expect(halfway.has('goal-reached')).toBe(false);

    const reached = getUnlockedAchievements({
      ...emptyState,
      weightGoal: goal,
      weightEntries: [{ id: 'w1', weight: 70, unit: 'kg' as const, date: daysAgo(0), createdAt: 1 }],
    });
    expect(reached.has('goal-reached')).toBe(true);
  });

  it('unlocks check-in streak badges', () => {
    const checkIns = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const unlocked = getUnlockedAchievements({
      ...emptyState,
      gamification: { checkIns, seenAchievements: [] },
    });
    expect(unlocked.has('checkin-7')).toBe(true);
    expect(unlocked.has('checkin-30')).toBe(false);
  });

  it('counts a freeze-bridged streak toward check-in badges', () => {
    // 15 days, one missed day (bridged by an earned freeze), 15 more days
    // → freeze-aware longest is 30 even though the raw longest run is 15
    const checkIns = [
      ...Array.from({ length: 15 }, (_, i) => daysAgo(31 - i)),
      ...Array.from({ length: 15 }, (_, i) => daysAgo(15 - i)),
    ];
    const unlocked = getUnlockedAchievements({
      ...emptyState,
      gamification: { checkIns, seenAchievements: [] },
    });
    expect(unlocked.has('checkin-30')).toBe(true);
  });

  it('unlocks first-workout only for finished sessions', () => {
    const active = getUnlockedAchievements({
      ...emptyState,
      workoutSessions: [{ id: 'w1', name: 'Push', date: daysAgo(0), startTime: 1, endTime: null, exercises: [] }],
    });
    expect(active.has('first-workout')).toBe(false);
    const finished = getUnlockedAchievements({
      ...emptyState,
      workoutSessions: [{ id: 'w1', name: 'Push', date: daysAgo(0), startTime: 1, endTime: 100, exercises: [] }],
    });
    expect(finished.has('first-workout')).toBe(true);
  });

  it('every unlockable id exists in the catalog', () => {
    const catalogIds = new Set(ACHIEVEMENTS.map((a) => a.id));
    // Max out everything
    const sessions = Array.from({ length: 30 }, (_, i) => {
      const dayStart = new Date(daysAgo(i) + 'T08:00:00').getTime();
      return { id: `s${i}`, startTime: dayStart, endTime: dayStart + 25 * hour };
    });
    const state = {
      fastingSessions: sessions,
      weightEntries: Array.from({ length: 7 }, (_, i) => ({
        id: `w${i}`, weight: 70, unit: 'kg' as const, date: daysAgo(i), createdAt: i + 1,
      })),
      weightGoal: { targetWeight: 70, unit: 'kg' as const, targetDate: '2026-06-01', startWeight: 80, startDate: '2026-01-01' },
      userProfile: null,
      workoutSessions: [{ id: 'w1', name: 'Push', date: daysAgo(0), startTime: 1, endTime: 100, exercises: [] }],
      gamification: { checkIns: Array.from({ length: 30 }, (_, i) => daysAgo(i)), seenAchievements: [] },
    };
    const unlocked = getUnlockedAchievements(state);
    expect(unlocked.size).toBe(catalogIds.size);
    for (const id of unlocked) expect(catalogIds.has(id)).toBe(true);
  });
});
