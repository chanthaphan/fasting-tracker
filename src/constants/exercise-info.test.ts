import { describe, it, expect } from 'vitest';
import { getExerciseInfo } from './exercise-info';
import { LIFT_PRESET_CATEGORIES } from './lift-presets';

describe('exercise info data', () => {
  it('covers every lift preset (guards preset/data drift)', () => {
    for (const cat of LIFT_PRESET_CATEGORIES) {
      for (const lift of cat.items) {
        expect(getExerciseInfo(lift.name), `missing info for ${lift.name}`).toBeDefined();
      }
    }
  });

  it('looks up case-insensitively with whitespace tolerance', () => {
    expect(getExerciseInfo('bench press')).toBeDefined();
    expect(getExerciseInfo('  BENCH PRESS ')).toBeDefined();
  });

  it('returns undefined for unknown lifts', () => {
    expect(getExerciseInfo('Underwater Basket Press')).toBeUndefined();
  });

  it('every entry has instructions, a primary muscle, and media', () => {
    for (const cat of LIFT_PRESET_CATEGORIES) {
      for (const lift of cat.items) {
        const info = getExerciseInfo(lift.name)!;
        expect(info.instructions.length, lift.name).toBeGreaterThan(0);
        expect(info.primaryMuscles.length, lift.name).toBeGreaterThan(0);
        expect(info.mediaKey, lift.name).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });
});
