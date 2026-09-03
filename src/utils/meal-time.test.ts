import { describe, it, expect } from 'vitest';
import { defaultMealType } from './meal-time';

const at = (h: number) => new Date(2026, 8, 3, h, 30);

describe('defaultMealType', () => {
  it('maps the time of day to a meal', () => {
    expect(defaultMealType(at(7))).toBe('breakfast');
    expect(defaultMealType(at(10))).toBe('breakfast');
    expect(defaultMealType(at(11))).toBe('lunch');
    expect(defaultMealType(at(15))).toBe('lunch');
    expect(defaultMealType(at(16))).toBe('dinner');
    expect(defaultMealType(at(20))).toBe('dinner');
    expect(defaultMealType(at(21))).toBe('snacks');
    expect(defaultMealType(at(23))).toBe('snacks');
  });
});
