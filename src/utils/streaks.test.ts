import { describe, it, expect } from 'vitest';
import { computeStreaksFromDates } from './streaks';
import { dateKey } from './date-utils';

const daysAgo = (n: number) => dateKey(new Date(Date.now() - n * 86400000));

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
