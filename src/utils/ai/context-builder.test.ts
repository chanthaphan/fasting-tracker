import { describe, it, expect } from 'vitest';
import { buildHealthContext, dataLooksThai } from './context-builder';
import { dateKey } from '../date-utils';
import type { AppState, FoodEntry, FastingSession, WeightEntry } from '../../types';

const NOW = new Date('2025-06-30T12:00:00');

function dayKey(daysAgo: number): string {
  return dateKey(new Date(NOW.getTime() - daysAgo * 86400000));
}

const emptyState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  exerciseEntries: [],
  workoutSessions: [],
  workoutTemplates: [],
  activeWorkoutId: null,
  activeFastingId: null,
  selectedDate: dayKey(0),
  theme: 'system',
  goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
  weightGoal: null,
  userProfile: null,
  aiSettings: { apiKey: '', model: 'claude-opus-5', language: 'auto' },
  trainingGoal: null,
  hydrated: true,
};

function makeFood(daysAgo: number, name = 'Rice'): FoodEntry {
  return {
    id: `f${daysAgo}-${name}`,
    name,
    calories: 500,
    protein: 20,
    carbs: 60,
    fat: 15,
    mealType: 'lunch',
    date: dayKey(daysAgo),
    createdAt: NOW.getTime() - daysAgo * 86400000,
  };
}

function makeFast(daysAgo: number, hours: number, targetHours?: number): FastingSession {
  const start = NOW.getTime() - daysAgo * 86400000;
  return { id: `s${daysAgo}`, startTime: start, endTime: start + hours * 3600000, targetHours };
}

function makeWeight(daysAgo: number, weight: number): WeightEntry {
  return { id: `w${daysAgo}`, weight, unit: 'kg', date: dayKey(daysAgo), createdAt: NOW.getTime() - daysAgo * 86400000 };
}

describe('buildHealthContext', () => {
  it('handles an empty state without throwing', () => {
    const out = buildHealthContext(emptyState, NOW);
    expect(out).toContain('Daily goals: 2000 kcal');
    expect(out).toContain(dayKey(0));
  });

  it('windows food history to the last 14 days', () => {
    const state = {
      ...emptyState,
      foodEntries: [makeFood(2), makeFood(13), makeFood(20), makeFood(40)],
    };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain(dayKey(2));
    expect(out).toContain(dayKey(13));
    expect(out).not.toContain(`${dayKey(20)}:`);
    expect(out).not.toContain(`${dayKey(40)}:`);
  });

  it('caps completed fasts at 10 and includes streaks', () => {
    const fasts = Array.from({ length: 15 }, (_, i) => makeFast(i + 1, 16, 16));
    const state = { ...emptyState, fastingSessions: fasts };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain('Fasting streak:');
    const fastLine = out.split('\n').find((l) => l.startsWith('Recent fasts:'))!;
    expect(fastLine.split(', ')).toHaveLength(10);
  });

  it('caps recent weigh-ins at 8 and reports 30-day change', () => {
    const weights = Array.from({ length: 12 }, (_, i) => makeWeight(i * 4, 80 - i * 0.5));
    const state = { ...emptyState, weightEntries: weights };
    const out = buildHealthContext(state, NOW);
    const weighLine = out.split('\n').find((l) => l.startsWith('Recent weigh-ins:'))!;
    expect(weighLine.split(', ')).toHaveLength(8);
    expect(out).toContain('30-day change');
  });

  it('caps today food list at 15 items', () => {
    const foods = Array.from({ length: 20 }, (_, i) => ({ ...makeFood(0, `Food${i}`), id: `t${i}` }));
    const state = { ...emptyState, foodEntries: foods };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain('+5 more');
  });

  it('includes the active fast', () => {
    const active: FastingSession = {
      id: 'a1',
      startTime: NOW.getTime() - 10 * 3600000,
      endTime: null,
      targetHours: 16,
    };
    const state = { ...emptyState, fastingSessions: [active], activeFastingId: 'a1' };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain('Currently fasting: 10h elapsed of 16h target');
  });

  it('stays within a bounded size even with years of data', () => {
    const state = {
      ...emptyState,
      foodEntries: Array.from({ length: 2000 }, (_, i) => makeFood(i % 400, `Food${i}`)),
      fastingSessions: Array.from({ length: 400 }, (_, i) => makeFast(i + 1, 16, 16)),
      weightEntries: Array.from({ length: 300 }, (_, i) => makeWeight(i, 80)),
    };
    const out = buildHealthContext(state, NOW);
    expect(out.length).toBeLessThan(4000);
  });
});

describe('buildHealthContext - workouts', () => {
  function workout(id: string, daysAgo: number, endOffsetMs: number | null = 3600000) {
    const start = NOW.getTime() - daysAgo * 86400000;
    return {
      id,
      name: 'Push Day',
      date: dayKey(daysAgo),
      startTime: start,
      endTime: endOffsetMs === null ? null : start + endOffsetMs,
      exercises: [
        {
          id: `${id}-e1`,
          name: 'Bench Press',
          sets: [{ id: `${id}-s1`, weightKg: 60, reps: 8, completed: true }],
        },
      ],
    };
  }

  it('includes workout lines with top sets and lift bests', () => {
    const state = { ...emptyState, workoutSessions: [workout('w1', 1)] };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain('Recent weight-training workouts:');
    expect(out).toContain('Bench Press 60kgx8');
    expect(out).toContain('Lift bests: Bench Press 60kg (1RM 76)');
  });

  it('excludes active workouts and caps at 8', () => {
    const sessions = [
      workout('active', 0, null),
      ...Array.from({ length: 12 }, (_, i) => workout(`w${i}`, i + 1)),
    ];
    const state = { ...emptyState, workoutSessions: sessions };
    const out = buildHealthContext(state, NOW);
    const workoutLines = out.split('\n').filter((l) => l.includes('Push Day'));
    expect(workoutLines).toHaveLength(8);
    expect(out).not.toContain(dayKey(0) + ' Push Day');
  });

  it('omits the section when there are no workouts', () => {
    const out = buildHealthContext(emptyState, NOW);
    expect(out).not.toContain('weight-training');
  });
});

describe('summarizeFastingPattern / goal context', () => {
  function fast(daysAgo: number, hours: number, startHour = 20): FastingSession {
    const d = new Date(NOW.getTime() - daysAgo * 86400000);
    d.setHours(startHour, 0, 0, 0);
    return { id: `f${daysAgo}`, startTime: d.getTime(), endTime: d.getTime() + hours * 3600000 };
  }

  it('summarizes duration, start hour, and recent weekdays', () => {
    const state = { ...emptyState, fastingSessions: [fast(1, 16), fast(2, 16), fast(4, 17), fast(9, 15)] };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain('Fasting pattern: ~16h fasts usually starting ~20:00');
    expect(out).toMatch(/fasted .+ in the last week/);
  });

  it('omits the pattern with fewer than 3 finished fasts', () => {
    const state = { ...emptyState, fastingSessions: [fast(1, 16), fast(2, 16)] };
    expect(buildHealthContext(state, NOW)).not.toContain('Fasting pattern');
  });

  it('includes the training goal line', () => {
    const state = {
      ...emptyState,
      trainingGoal: {
        targetLifts: [{ name: 'Bench Press', targetWeightKg: 80 }],
        preferredDays: [1, 3, 5],
        sessionMinutes: 60,
      },
    };
    const out = buildHealthContext(state, NOW);
    expect(out).toContain('Training goal: targets Bench Press 80kg; prefers Mon/Wed/Fri; 60min sessions');
  });
});

describe('dataLooksThai', () => {
  it('detects Thai food names', () => {
    const state = { ...emptyState, foodEntries: [{ ...makeFood(0), name: 'ผัดกะเพราไก่' }] };
    expect(dataLooksThai(state)).toBe(true);
  });

  it('returns false for English-only data', () => {
    const state = { ...emptyState, foodEntries: [makeFood(0, 'Fried Rice')] };
    expect(dataLooksThai(state)).toBe(false);
  });
});
