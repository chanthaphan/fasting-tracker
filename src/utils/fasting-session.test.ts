import { describe, it, expect } from 'vitest';
import { isMeaningfulFast } from './fasting-session';

const hour = 3600000;

describe('isMeaningfulFast', () => {
  it('ignores active sessions', () => {
    expect(isMeaningfulFast({ id: 'a', startTime: 0, endTime: null })).toBe(false);
  });

  it('counts fasts of four hours or more', () => {
    expect(isMeaningfulFast({ id: 'a', startTime: 0, endTime: 4 * hour })).toBe(true);
    expect(isMeaningfulFast({ id: 'a', startTime: 0, endTime: 30 * 60000 })).toBe(false);
  });

  it('counts a short fast that reached half of its own target', () => {
    expect(isMeaningfulFast({ id: 'a', startTime: 0, endTime: 3 * hour, targetHours: 6 })).toBe(true);
    expect(isMeaningfulFast({ id: 'a', startTime: 0, endTime: 2 * hour, targetHours: 6 })).toBe(false);
  });
});
