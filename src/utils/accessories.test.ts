import { describe, it, expect } from 'vitest';
import { getAccessoriesForLevel } from './accessories';

describe('getAccessoriesForLevel', () => {
  it('returns nothing below level 3', () => {
    expect(getAccessoriesForLevel(1)).toEqual([]);
    expect(getAccessoriesForLevel(2)).toEqual([]);
  });

  it('unlocks accessories cumulatively at their levels', () => {
    expect(getAccessoriesForLevel(3)).toEqual(['wristband']);
    expect(getAccessoriesForLevel(5)).toEqual(['wristband', 'cap']);
    expect(getAccessoriesForLevel(8)).toEqual(['wristband', 'cap', 'sunglasses']);
    expect(getAccessoriesForLevel(10)).toEqual(['wristband', 'cap', 'sunglasses', 'medal']);
  });

  it('crown replaces the cap at level 15', () => {
    expect(getAccessoriesForLevel(15)).toEqual(['wristband', 'sunglasses', 'medal', 'crown']);
    expect(getAccessoriesForLevel(99)).toEqual(['wristband', 'sunglasses', 'medal', 'crown']);
  });
});
