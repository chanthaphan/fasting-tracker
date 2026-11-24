import { describe, it, expect } from 'vitest';
import { classifyBp, validateBp, sortBpNewestFirst, averageBp } from './blood-pressure';
import type { BloodPressureEntry } from '../types';

const entry = (over: Partial<BloodPressureEntry>): BloodPressureEntry => ({
  id: 'x', systolic: 120, diastolic: 80, date: '2026-03-10', time: '08:00', createdAt: 1, ...over,
});

describe('classifyBp', () => {
  it.each([
    [118, 76, 'normal'],
    [119, 79, 'normal'],
    [125, 78, 'elevated'],
    [129, 79, 'elevated'],
    [118, 80, 'stage1'], // diastolic alone is enough
    [130, 70, 'stage1'], // systolic alone is enough
    [139, 89, 'stage1'],
    [140, 70, 'stage2'],
    [125, 90, 'stage2'],
    [180, 120, 'stage2'], // the crisis range starts above 180 / 120
    [181, 100, 'crisis'],
    [150, 121, 'crisis'],
  ] as const)('%i/%i is %s', (sys, dia, expected) => {
    expect(classifyBp(sys, dia)).toBe(expected);
  });
});

describe('validateBp', () => {
  it('accepts an ordinary reading, with or without a pulse', () => {
    expect(validateBp(120, 80)).toBeNull();
    expect(validateBp(120, 80, 72)).toBeNull();
    expect(validateBp(120, 80, null)).toBeNull();
  });

  it('flags out-of-range and non-numeric values', () => {
    expect(validateBp(30, 80)).toBe('systolic');
    expect(validateBp(Number.NaN, 80)).toBe('systolic');
    expect(validateBp(120, 200)).toBe('diastolic');
    expect(validateBp(120, 80, 400)).toBe('pulse');
  });

  it('flags a bottom number that is not lower than the top one', () => {
    expect(validateBp(80, 80)).toBe('order');
    expect(validateBp(80, 100)).toBe('order');
  });
});

describe('sortBpNewestFirst', () => {
  it('orders by the day and time of the reading, not by when it was entered', () => {
    const a = entry({ id: 'a', date: '2026-03-10', time: '08:00', createdAt: 9 });
    const b = entry({ id: 'b', date: '2026-03-10', time: '20:00', createdAt: 1 });
    const c = entry({ id: 'c', date: '2026-03-09', time: '23:00', createdAt: 99 });
    expect(sortBpNewestFirst([a, c, b]).map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not change the list it is given', () => {
    const list = [entry({ id: 'a', date: '2026-03-01' }), entry({ id: 'b', date: '2026-03-02' })];
    sortBpNewestFirst(list);
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('averageBp', () => {
  const today = new Date(2026, 2, 10); // 10 Mar 2026
  const entries = [
    entry({ id: '1', date: '2026-03-10', systolic: 130, diastolic: 84, pulse: 70 }),
    entry({ id: '2', date: '2026-03-08', systolic: 120, diastolic: 80 }),
    entry({ id: '3', date: '2026-03-01', systolic: 150, diastolic: 96, pulse: 80 }),
    entry({ id: '4', date: '2026-03-11', systolic: 200, diastolic: 120 }), // in the future: ignored
  ];

  it('averages the window including today', () => {
    expect(averageBp(entries, 7, today)).toEqual({ systolic: 125, diastolic: 82, pulse: 70, count: 2 });
  });

  it('widens with the window', () => {
    expect(averageBp(entries, 30, today)).toMatchObject({ systolic: 133, diastolic: 87, pulse: 75, count: 3 });
  });

  it('is null when nothing falls in the window, and has no pulse when none was logged', () => {
    expect(averageBp([], 7, today)).toBeNull();
    expect(averageBp([entry({ date: '2026-03-09' })], 7, today)?.pulse).toBeNull();
  });
});
