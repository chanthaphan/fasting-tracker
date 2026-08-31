import { describe, it, expect } from 'vitest';
import {
  epley1Rm, getPreviousSets, computeLiftRecords, sessionVolume, sessionSetCount, detectPrs, listLifts,
} from './workout-stats';
import type { WorkoutSession, WorkoutSet } from '../types';

let setId = 0;
function set(weightKg: number, reps: number, completed = true): WorkoutSet {
  return { id: `s${setId++}`, weightKg, reps, completed };
}

function session(
  id: string,
  startTime: number,
  exercises: { name: string; sets: WorkoutSet[] }[],
  endTime: number | null = startTime + 3600000
): WorkoutSession {
  return {
    id,
    name: 'Workout',
    date: new Date(startTime).toISOString().slice(0, 10),
    startTime,
    endTime,
    exercises: exercises.map((ex, i) => ({ id: `${id}-e${i}`, ...ex })),
  };
}

const T0 = new Date('2025-06-01T10:00:00Z').getTime();
const DAY = 86400000;

describe('epley1Rm', () => {
  it('returns 0 for non-positive reps or weight', () => {
    expect(epley1Rm(60, 0)).toBe(0);
    expect(epley1Rm(0, 5)).toBe(0);
  });
  it('returns the weight itself for a single rep', () => {
    expect(epley1Rm(100, 1)).toBe(100);
  });
  it('applies the Epley formula for multiple reps', () => {
    expect(epley1Rm(60, 8)).toBeCloseTo(76);
  });
});

describe('getPreviousSets', () => {
  const sessions = [
    session('w1', T0, [{ name: 'Bench Press', sets: [set(50, 10), set(50, 8)] }]),
    session('w2', T0 + DAY, [{ name: 'Bench Press', sets: [set(60, 8)] }]),
    session('w3', T0 + 2 * DAY, [{ name: 'Squat', sets: [set(80, 5)] }], null), // active — must be ignored
  ];

  it('returns the most recent finished session sets, case-insensitive', () => {
    const prev = getPreviousSets(sessions, 'bench press');
    expect(prev).toHaveLength(1);
    expect(prev![0].weightKg).toBe(60);
  });

  it('ignores active sessions', () => {
    expect(getPreviousSets(sessions, 'Squat')).toBeNull();
  });

  it('returns null when the lift was never performed', () => {
    expect(getPreviousSets(sessions, 'Deadlift')).toBeNull();
  });

  it('ignores uncompleted sets', () => {
    const s = [session('w1', T0, [{ name: 'Curl', sets: [set(20, 10, false)] }])];
    expect(getPreviousSets(s, 'Curl')).toBeNull();
  });
});

describe('computeLiftRecords', () => {
  const sessions = [
    session('w1', T0, [{ name: 'Bench Press', sets: [set(50, 10), set(55, 6)] }]),
    session('w2', T0 + DAY, [{ name: 'Bench Press', sets: [set(60, 3), set(52.5, 12, false)] }]),
  ];

  it('computes best weight, best 1RM, and per-session history', () => {
    const records = computeLiftRecords(sessions, 'Bench Press');
    expect(records.bestWeightKg).toBe(60);
    // w1 best 1RM: 50×10 → 66.7 beats 55×6 → 66; w2: 60×3 → 66
    expect(records.best1RmKg).toBeCloseTo(66.7);
    expect(records.history).toHaveLength(2);
    expect(records.history[0].volume).toBe(50 * 10 + 55 * 6);
    expect(records.history[1].topWeightKg).toBe(60); // uncompleted 52.5×12 excluded
  });

  it('returns zeros for an unknown lift', () => {
    const records = computeLiftRecords(sessions, 'Squat');
    expect(records.bestWeightKg).toBe(0);
    expect(records.history).toHaveLength(0);
  });
});

describe('session aggregates', () => {
  const s = session('w1', T0, [
    { name: 'Bench Press', sets: [set(60, 8), set(60, 8, false)] },
    { name: 'Squat', sets: [set(80, 5)] },
  ]);

  it('sessionVolume sums completed sets only', () => {
    expect(sessionVolume(s)).toBe(60 * 8 + 80 * 5);
  });

  it('sessionSetCount counts completed sets', () => {
    expect(sessionSetCount(s)).toBe(2);
  });
});

describe('detectPrs', () => {
  const prior = [session('w1', T0, [{ name: 'Bench Press', sets: [set(60, 5)] }])];

  it('detects a weight PR', () => {
    const current = session('w2', T0 + DAY, [{ name: 'Bench Press', sets: [set(65, 3)] }]);
    const prs = detectPrs(current, [...prior, current]);
    expect(prs).toEqual([{ name: 'Bench Press', kind: 'weight', value: 65 }]);
  });

  it('detects a 1RM PR at equal weight with more reps', () => {
    const current = session('w2', T0 + DAY, [{ name: 'Bench Press', sets: [set(60, 10)] }]);
    const prs = detectPrs(current, [...prior, current]);
    expect(prs).toHaveLength(1);
    expect(prs[0].kind).toBe('1rm');
  });

  it('reports nothing when no PR', () => {
    const current = session('w2', T0 + DAY, [{ name: 'Bench Press', sets: [set(50, 3)] }]);
    expect(detectPrs(current, [...prior, current])).toHaveLength(0);
  });
});

describe('listLifts', () => {
  it('dedupes case-insensitively, most recent first, requires a completed set', () => {
    const sessions = [
      session('w1', T0, [{ name: 'Bench Press', sets: [set(50, 10)] }]),
      session('w2', T0 + DAY, [
        { name: 'bench press', sets: [set(60, 8)] },
        { name: 'Squat', sets: [set(80, 5)] },
        { name: 'Curl', sets: [set(20, 10, false)] },
      ]),
    ];
    const lifts = listLifts(sessions);
    expect(lifts.map((l) => l.name)).toEqual(['bench press', 'Squat']);
  });
});
