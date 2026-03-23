import { describe, it, expect } from 'vitest';
import { todayKey, dateKey, formatDuration, formatHoursMinutes } from './date-utils';

describe('todayKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('dateKey', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2025, 0, 15))).toBe('2025-01-15');
  });

  it('pads single digit months and days', () => {
    expect(dateKey(new Date(2025, 2, 5))).toBe('2025-03-05');
  });
});

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats hours, minutes, seconds', () => {
    const ms = (2 * 3600 + 30 * 60 + 45) * 1000;
    expect(formatDuration(ms)).toBe('02:30:45');
  });

  it('handles large durations', () => {
    const ms = 25 * 3600 * 1000;
    expect(formatDuration(ms)).toBe('25:00:00');
  });
});

describe('formatHoursMinutes', () => {
  it('formats hours and minutes', () => {
    const ms = (3 * 3600 + 15 * 60) * 1000;
    expect(formatHoursMinutes(ms)).toBe('3h 15m');
  });

  it('formats minutes only when under 1 hour', () => {
    const ms = 45 * 60 * 1000;
    expect(formatHoursMinutes(ms)).toBe('45m');
  });

  it('shows 0m for zero duration', () => {
    expect(formatHoursMinutes(0)).toBe('0m');
  });
});
