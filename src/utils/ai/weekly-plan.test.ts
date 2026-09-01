import { describe, it, expect } from 'vitest';
import { validateWeeklyPlan } from './weekly-plan';
import { dateKey } from '../date-utils';

const START = new Date('2025-06-02T00:00:00'); // a Monday

function day(offset: number): string {
  return dateKey(new Date(START.getTime() + offset * 86400000));
}

const workoutDay = (name: string) => ({
  date: 'ignored-by-validator',
  type: 'workout',
  name,
  exercises: [{ name: 'Bench Press', sets: 3, targetWeightKg: 60, targetReps: 8 }],
  note: 'eat first',
});

describe('validateWeeklyPlan', () => {
  it('returns 7 sequential days from startDate regardless of model dates', () => {
    const days = validateWeeklyPlan(
      { days: Array.from({ length: 7 }, (_, i) => (i % 2 === 0 ? workoutDay(`Day ${i}`) : { type: 'rest' })) },
      START
    )!;
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.date)).toEqual([0, 1, 2, 3, 4, 5, 6].map(day));
    expect(days[0].type).toBe('workout');
    expect(days[1].type).toBe('rest');
  });

  it('pads missing days as rest and degrades malformed days to rest', () => {
    const days = validateWeeklyPlan({ days: [workoutDay('A'), 'garbage', null] }, START)!;
    expect(days).toHaveLength(7);
    expect(days[0].type).toBe('workout');
    expect(days[1].type).toBe('rest');
    expect(days[6].type).toBe('rest');
  });

  it('turns a workout day without valid exercises into rest', () => {
    const days = validateWeeklyPlan({ days: [{ type: 'workout', name: 'Empty', exercises: [] }] }, START)!;
    expect(days[0].type).toBe('rest');
    expect(days[0].exercises).toBeUndefined();
  });

  it('clamps exercise numbers and drops nameless items', () => {
    const days = validateWeeklyPlan(
      {
        days: [
          {
            type: 'workout',
            exercises: [
              { name: 'Squat', sets: 99, targetWeightKg: -10, targetReps: 0.4 },
              { name: '', sets: 3, targetWeightKg: 10, targetReps: 5 },
            ],
          },
        ],
      },
      START
    )!;
    const ex = days[0].exercises!;
    expect(ex).toHaveLength(1);
    expect(ex[0].sets).toBe(6);
    expect(ex[0].targetWeightKg).toBe(0);
    expect(ex[0].targetReps).toBe(1);
  });

  it('returns null for unusable payloads', () => {
    expect(validateWeeklyPlan(null, START)).toBeNull();
    expect(validateWeeklyPlan({}, START)).toBeNull();
    expect(validateWeeklyPlan({ days: [] }, START)).toBeNull();
  });
});
