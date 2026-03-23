import { describe, it, expect } from 'vitest';
import {
  isFoodEntryArray,
  isFastingSessionArray,
  isWeightEntryArray,
  isExerciseEntryArray,
  isSettings,
  loadFromStorageSync,
  saveToStorage,
} from './storage';

describe('Validators', () => {
  describe('isFoodEntryArray', () => {
    it('validates empty array', () => {
      expect(isFoodEntryArray([])).toBe(true);
    });

    it('validates valid entries', () => {
      expect(isFoodEntryArray([
        { id: '1', name: 'Rice', calories: 250, date: '2025-01-01', protein: 5, carbs: 55, fat: 1, mealType: 'lunch', createdAt: 1 },
      ])).toBe(true);
    });

    it('rejects non-arrays', () => {
      expect(isFoodEntryArray('not an array')).toBe(false);
      expect(isFoodEntryArray(null)).toBe(false);
      expect(isFoodEntryArray({})).toBe(false);
    });

    it('rejects entries missing required keys', () => {
      expect(isFoodEntryArray([{ id: '1', name: 'Rice' }])).toBe(false);
    });
  });

  describe('isFastingSessionArray', () => {
    it('validates valid sessions', () => {
      expect(isFastingSessionArray([
        { id: '1', startTime: 1000, endTime: null },
      ])).toBe(true);
    });

    it('rejects invalid entries', () => {
      expect(isFastingSessionArray([{ name: 'bad' }])).toBe(false);
    });
  });

  describe('isWeightEntryArray', () => {
    it('validates valid entries', () => {
      expect(isWeightEntryArray([
        { id: '1', weight: 75, date: '2025-01-01', unit: 'kg', createdAt: 1 },
      ])).toBe(true);
    });

    it('rejects invalid entries', () => {
      expect(isWeightEntryArray([{ id: '1' }])).toBe(false);
    });
  });

  describe('isExerciseEntryArray', () => {
    it('validates valid entries', () => {
      expect(isExerciseEntryArray([
        { id: '1', name: 'Run', calories: 300, date: '2025-01-01', durationMin: 30, createdAt: 1 },
      ])).toBe(true);
    });

    it('rejects entries missing keys', () => {
      expect(isExerciseEntryArray([{ id: '1', name: 'Run' }])).toBe(false);
    });

    it('validates empty array', () => {
      expect(isExerciseEntryArray([])).toBe(true);
    });
  });

  describe('isSettings', () => {
    it('validates valid settings', () => {
      expect(isSettings({
        theme: 'dark',
        activeFastingId: null,
        goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
        weightGoal: null,
        userProfile: null,
      })).toBe(true);
    });

    it('rejects missing theme', () => {
      expect(isSettings({ goals: {} })).toBe(false);
    });

    it('rejects non-objects', () => {
      expect(isSettings('string')).toBe(false);
      expect(isSettings(null)).toBe(false);
    });
  });
});

describe('loadFromStorageSync', () => {
  it('returns fallback when key not in localStorage', () => {
    const result = loadFromStorageSync('nonexistent_key', []);
    expect(result).toEqual([]);
  });

  it('loads valid data from localStorage', () => {
    localStorage.setItem('test_key', JSON.stringify([1, 2, 3]));
    const result = loadFromStorageSync('test_key', []);
    expect(result).toEqual([1, 2, 3]);
    localStorage.removeItem('test_key');
  });

  it('returns fallback when validation fails', () => {
    localStorage.setItem('test_key2', JSON.stringify('not an array'));
    const result = loadFromStorageSync('test_key2', [], isFoodEntryArray);
    expect(result).toEqual([]);
    localStorage.removeItem('test_key2');
  });

  it('returns fallback for invalid JSON', () => {
    localStorage.setItem('test_key3', 'not json{{{');
    const result = loadFromStorageSync('test_key3', 'default');
    expect(result).toBe('default');
    localStorage.removeItem('test_key3');
  });
});

describe('saveToStorage', () => {
  it('saves to localStorage', () => {
    saveToStorage('save_test', { hello: 'world' });
    const stored = localStorage.getItem('save_test');
    expect(stored).toBe(JSON.stringify({ hello: 'world' }));
    localStorage.removeItem('save_test');
  });
});
