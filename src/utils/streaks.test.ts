import { describe, it, expect } from 'vitest';
import { computeStreaksFromDates, computeStreaksWithFreeze } from './streaks';
import { dateKey } from './date-utils';

const daysAgo = (n: number) => dateKey(new Date(Date.now() - n * 86400000));
// consecutive check-in days from daysAgo(from) down to daysAgo(to)
const range = (from: number, to: number) =>
  Array.from({ length: from - to + 1 }, (_, i) => daysAgo(from - i));

describe('computeStreaksFromDates', () => {
  it('returns zeros for no dates', () => {
    expect(computeStreaksFromDates([])).toEqual({ current: 0, longest: 0 });
  });

  it('counts a single day today as a 1-day current streak', () => {
    expect(computeStreaksFromDates([daysAgo(0)])).toEqual({ current: 1, longest: 1 });
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreaksFromDates([daysAgo(2), daysAgo(1), daysAgo(0)])).toEqual({ current: 3, longest: 3 });
  });

  it('tolerates today missing when yesterday is present', () => {
    expect(computeStreaksFromDates([daysAgo(3), daysAgo(2), daysAgo(1)])).toEqual({ current: 3, longest: 3 });
  });

  it('resets current streak after a gap but keeps longest', () => {
    const dates = [daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(7), daysAgo(0)];
    expect(computeStreaksFromDates(dates)).toEqual({ current: 1, longest: 4 });
  });

  it('has no current streak when the latest date is older than yesterday', () => {
    expect(computeStreaksFromDates([daysAgo(5), daysAgo(4)])).toEqual({ current: 0, longest: 2 });
  });

  it('handles duplicate dates', () => {
    expect(computeStreaksFromDates([daysAgo(1), daysAgo(1), daysAgo(0)])).toEqual({ current: 2, longest: 2 });
  });
});

describe('computeStreaksWithFreeze', () => {
  it('returns zeros for no dates', () => {
    expect(computeStreaksWithFreeze([])).toEqual({ current: 0, longest: 0, freezesHeld: 0, freezesUsed: 0 });
  });

  it('behaves like the raw streak when no gaps occur', () => {
    const dates = range(4, 0);
    const frozen = computeStreaksWithFreeze(dates);
    expect(frozen.current).toBe(5);
    expect(frozen.longest).toBe(5);
    expect(frozen.freezesHeld).toBe(0);
    expect(frozen.freezesUsed).toBe(0);
  });

  it('earns a token after 7 consecutive days and bridges a 1-day gap', () => {
    // 8 consecutive days, miss one, then today
    const dates = [...range(9, 2), daysAgo(0)];
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 9, longest: 9, freezesHeld: 0, freezesUsed: 1 });
  });

  it('breaks on a 1-day gap when no token is held', () => {
    const dates = [...range(7, 2), daysAgo(0)]; // only 6 days before the gap
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 1, longest: 6, freezesHeld: 0, freezesUsed: 0 });
  });

  it('caps held tokens at 2 and wastes further earns', () => {
    const dates = range(20, 0); // 21 consecutive days ending today
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 21, longest: 21, freezesHeld: 2, freezesUsed: 0 });
  });

  it('always breaks on a 2+ day gap but keeps held tokens', () => {
    const dates = [...range(18, 5), ...range(2, 0)]; // 14 days, miss 2, then 3 days ending today
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 3, longest: 14, freezesHeld: 2, freezesUsed: 0 });
  });

  it('freezes a streak that ended two days ago by consuming a trailing token', () => {
    const dates = range(8, 2); // 7 consecutive days ending the day before yesterday
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 7, longest: 7, freezesHeld: 0, freezesUsed: 1 });
  });

  it('does not consume a token for the plain yesterday fallback', () => {
    const dates = range(5, 1); // 5 days ending yesterday, no token ever earned
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 5, longest: 5, freezesHeld: 0, freezesUsed: 0 });
  });

  it('has no current streak two days out with no token', () => {
    const dates = range(6, 2); // 5 days ending two days ago
    expect(computeStreaksWithFreeze(dates)).toEqual({ current: 0, longest: 5, freezesHeld: 0, freezesUsed: 0 });
  });

  it('bridges a gap immediately after the earning day', () => {
    // token earned on the 7th day, next day missed, then check-in
    const dates = [...range(9, 3), daysAgo(1)];
    const result = computeStreaksWithFreeze(dates);
    expect(result.current).toBe(8);
    expect(result.freezesUsed).toBe(1);
  });

  it('is order-independent and dedupes input', () => {
    const dates = [...range(9, 2), daysAgo(0)];
    const shuffled = [daysAgo(0), ...range(9, 2).reverse(), daysAgo(5)];
    expect(computeStreaksWithFreeze(shuffled)).toEqual(computeStreaksWithFreeze(dates));
  });
});
