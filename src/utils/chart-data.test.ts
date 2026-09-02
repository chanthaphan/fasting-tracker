import { describe, it, expect } from 'vitest';
import { lastNDays, dailyTotals, dailyFastingHours, niceTicks, linearTrend } from './chart-data';

describe('lastNDays', () => {
  it('returns n consecutive day keys ending today, oldest first', () => {
    const days = lastNDays(3, new Date(2026, 8, 2, 15));
    expect(days.map((d) => d.key)).toEqual(['2026-08-31', '2026-09-01', '2026-09-02']);
    expect(days[2].label).toBe('Wed');
  });
});

describe('dailyTotals', () => {
  it('sums entries into their day and ignores days outside the window', () => {
    const days = lastNDays(2, new Date(2026, 8, 2));
    const entries = [
      { date: '2026-09-01', calories: 500 },
      { date: '2026-09-01', calories: 300 },
      { date: '2026-09-02', calories: 100 },
      { date: '2026-08-01', calories: 999 },
    ];
    expect(dailyTotals(entries, days, (e) => e.calories)).toEqual([800, 100]);
  });
});

describe('dailyFastingHours', () => {
  const days = lastNDays(2, new Date(2026, 8, 2));
  const t = (y: number, m: number, d: number, h: number) => new Date(y, m, d, h).getTime();

  it('splits a fast that crosses midnight across both days', () => {
    const sessions = [{ id: 'a', startTime: t(2026, 8, 1, 20), endTime: t(2026, 8, 2, 12) }];
    expect(dailyFastingHours(sessions, days)).toEqual([4, 12]);
  });

  it('counts an active fast up to now', () => {
    const sessions = [{ id: 'a', startTime: t(2026, 8, 2, 6), endTime: null }];
    expect(dailyFastingHours(sessions, days, t(2026, 8, 2, 9))).toEqual([0, 3]);
  });
});

describe('niceTicks', () => {
  it('produces round steps that cover the domain', () => {
    const { ticks, min, max } = niceTicks(71.3, 84.9);
    expect(min).toBeLessThanOrEqual(71.3);
    expect(max).toBeGreaterThanOrEqual(84.9);
    expect(ticks[0]).toBe(min);
    expect(ticks[ticks.length - 1]).toBe(max);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(7);
  });

  it('handles a flat domain', () => {
    expect(niceTicks(70, 70).max).toBeGreaterThan(70);
  });
});

describe('linearTrend', () => {
  it('fits a straight line', () => {
    const fit = linearTrend([{ t: 0, v: 80 }, { t: 1, v: 79 }, { t: 2, v: 78 }]);
    expect(fit?.slope).toBeCloseTo(-1);
    expect(fit?.intercept).toBeCloseTo(80);
  });

  it('returns null without enough spread', () => {
    expect(linearTrend([{ t: 1, v: 80 }])).toBeNull();
    expect(linearTrend([{ t: 1, v: 80 }, { t: 1, v: 79 }])).toBeNull();
  });
});
