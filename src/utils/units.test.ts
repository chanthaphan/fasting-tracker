import { describe, it, expect } from 'vitest';
import { toKg, fromKg, convertWeight } from './units';

describe('units', () => {
  it('converts lbs to kg and back', () => {
    expect(toKg(154.3, 'lbs')).toBeCloseTo(70, 1);
    expect(fromKg(70, 'lbs')).toBeCloseTo(154.3, 1);
    expect(toKg(70, 'kg')).toBe(70);
    expect(fromKg(70, 'kg')).toBe(70);
  });

  it('treats unknown units as kg', () => {
    expect(toKg(70, '')).toBe(70);
  });

  it('converts between units rounded to one decimal', () => {
    expect(convertWeight(70, 'kg', 'lbs')).toBe(154.3);
    expect(convertWeight(154.3, 'lbs', 'kg')).toBe(70);
    expect(convertWeight(70, 'kg', 'kg')).toBe(70);
  });
});
