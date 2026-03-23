import { describe, it, expect } from 'vitest';
import { appReducer } from './app-reducer';
import type { AppState } from '../types';

const baseState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  exerciseEntries: [],
  activeFastingId: null,
  selectedDate: '2025-01-01',
  theme: 'system',
  goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
  weightGoal: null,
  userProfile: null,
};

describe('appReducer - Food actions', () => {
  it('ADD_FOOD adds entry with generated id and createdAt', () => {
    const state = appReducer(baseState, {
      type: 'ADD_FOOD',
      payload: { name: 'Rice', calories: 250, protein: 5, carbs: 55, fat: 1, mealType: 'lunch', date: '2025-01-01' },
    });
    expect(state.foodEntries).toHaveLength(1);
    expect(state.foodEntries[0].name).toBe('Rice');
    expect(state.foodEntries[0].id).toBeTruthy();
    expect(state.foodEntries[0].createdAt).toBeGreaterThan(0);
  });

  it('EDIT_FOOD updates the correct entry', () => {
    const stateWithFood = {
      ...baseState,
      foodEntries: [{ id: 'f1', name: 'Rice', calories: 250, protein: 5, carbs: 55, fat: 1, mealType: 'lunch' as const, date: '2025-01-01', createdAt: 1 }],
    };
    const state = appReducer(stateWithFood, {
      type: 'EDIT_FOOD',
      payload: { ...stateWithFood.foodEntries[0], name: 'Fried Rice', calories: 500 },
    });
    expect(state.foodEntries[0].name).toBe('Fried Rice');
    expect(state.foodEntries[0].calories).toBe(500);
  });

  it('DELETE_FOOD removes the entry', () => {
    const stateWithFood = {
      ...baseState,
      foodEntries: [
        { id: 'f1', name: 'Rice', calories: 250, protein: 5, carbs: 55, fat: 1, mealType: 'lunch' as const, date: '2025-01-01', createdAt: 1 },
        { id: 'f2', name: 'Soup', calories: 100, protein: 8, carbs: 10, fat: 3, mealType: 'lunch' as const, date: '2025-01-01', createdAt: 2 },
      ],
    };
    const state = appReducer(stateWithFood, { type: 'DELETE_FOOD', payload: { id: 'f1' } });
    expect(state.foodEntries).toHaveLength(1);
    expect(state.foodEntries[0].id).toBe('f2');
  });
});

describe('appReducer - Exercise actions', () => {
  it('ADD_EXERCISE adds entry with generated id', () => {
    const state = appReducer(baseState, {
      type: 'ADD_EXERCISE',
      payload: { name: 'Running', calories: 300, durationMin: 30, date: '2025-01-01' },
    });
    expect(state.exerciseEntries).toHaveLength(1);
    expect(state.exerciseEntries[0].name).toBe('Running');
    expect(state.exerciseEntries[0].id).toBeTruthy();
  });

  it('EDIT_EXERCISE updates the correct entry', () => {
    const stateWithExercise = {
      ...baseState,
      exerciseEntries: [{ id: 'e1', name: 'Running', calories: 300, durationMin: 30, date: '2025-01-01', createdAt: 1 }],
    };
    const state = appReducer(stateWithExercise, {
      type: 'EDIT_EXERCISE',
      payload: { ...stateWithExercise.exerciseEntries[0], calories: 500, durationMin: 60 },
    });
    expect(state.exerciseEntries[0].calories).toBe(500);
    expect(state.exerciseEntries[0].durationMin).toBe(60);
  });

  it('DELETE_EXERCISE removes the entry', () => {
    const stateWithExercise = {
      ...baseState,
      exerciseEntries: [{ id: 'e1', name: 'Running', calories: 300, durationMin: 30, date: '2025-01-01', createdAt: 1 }],
    };
    const state = appReducer(stateWithExercise, { type: 'DELETE_EXERCISE', payload: { id: 'e1' } });
    expect(state.exerciseEntries).toHaveLength(0);
  });
});

describe('appReducer - Weight actions', () => {
  it('ADD_WEIGHT adds entry', () => {
    const state = appReducer(baseState, {
      type: 'ADD_WEIGHT',
      payload: { weight: 75, unit: 'kg', date: '2025-01-01' },
    });
    expect(state.weightEntries).toHaveLength(1);
    expect(state.weightEntries[0].weight).toBe(75);
  });

  it('DELETE_WEIGHT removes entry', () => {
    const stateWith = {
      ...baseState,
      weightEntries: [{ id: 'w1', weight: 75, unit: 'kg' as const, date: '2025-01-01', createdAt: 1 }],
    };
    const state = appReducer(stateWith, { type: 'DELETE_WEIGHT', payload: { id: 'w1' } });
    expect(state.weightEntries).toHaveLength(0);
  });
});

describe('appReducer - Fasting actions', () => {
  it('START_FAST creates session and sets activeFastingId', () => {
    const state = appReducer(baseState, { type: 'START_FAST', payload: { targetHours: 16 } });
    expect(state.fastingSessions).toHaveLength(1);
    expect(state.activeFastingId).toBe(state.fastingSessions[0].id);
    expect(state.fastingSessions[0].endTime).toBeNull();
    expect(state.fastingSessions[0].targetHours).toBe(16);
  });

  it('STOP_FAST sets endTime and clears activeFastingId', () => {
    const started = appReducer(baseState, { type: 'START_FAST' });
    const stopped = appReducer(started, { type: 'STOP_FAST' });
    expect(stopped.activeFastingId).toBeNull();
    expect(stopped.fastingSessions[0].endTime).toBeGreaterThan(0);
  });
});

describe('appReducer - Settings actions', () => {
  it('SET_GOALS updates goals', () => {
    const goals = { calories: 1800, protein: 120, carbs: 180, fat: 55 };
    const state = appReducer(baseState, { type: 'SET_GOALS', payload: goals });
    expect(state.goals).toEqual(goals);
  });

  it('SET_WEIGHT_GOAL updates weight goal', () => {
    const goal = { targetWeight: 70, unit: 'kg' as const, targetDate: '2025-06-01', startWeight: 80, startDate: '2025-01-01' };
    const state = appReducer(baseState, { type: 'SET_WEIGHT_GOAL', payload: goal });
    expect(state.weightGoal).toEqual(goal);
  });

  it('SET_WEIGHT_GOAL can clear goal with null', () => {
    const stateWithGoal = { ...baseState, weightGoal: { targetWeight: 70, unit: 'kg' as const, targetDate: '2025-06-01', startWeight: 80, startDate: '2025-01-01' } };
    const state = appReducer(stateWithGoal, { type: 'SET_WEIGHT_GOAL', payload: null });
    expect(state.weightGoal).toBeNull();
  });

  it('SET_USER_PROFILE sets profile', () => {
    const profile = { gender: 'male' as const, age: 30, heightCm: 175, activityLevel: 'moderate' as const };
    const state = appReducer(baseState, { type: 'SET_USER_PROFILE', payload: profile });
    expect(state.userProfile).toEqual(profile);
  });

  it('SET_THEME updates theme', () => {
    const state = appReducer(baseState, { type: 'SET_THEME', payload: 'dark' });
    expect(state.theme).toBe('dark');
  });
});

describe('appReducer - Import', () => {
  it('IMPORT_DATA replaces entries and detects active fasting', () => {
    const importPayload = {
      foodEntries: [{ id: 'f1', name: 'Test', calories: 100, protein: 5, carbs: 10, fat: 3, mealType: 'lunch' as const, date: '2025-01-01', createdAt: 1 }],
      fastingSessions: [{ id: 's1', startTime: 1000, endTime: null }],
      weightEntries: [{ id: 'w1', weight: 75, unit: 'kg' as const, date: '2025-01-01', createdAt: 1 }],
      exerciseEntries: [{ id: 'e1', name: 'Run', calories: 200, durationMin: 20, date: '2025-01-01', createdAt: 1 }],
    };
    const state = appReducer(baseState, { type: 'IMPORT_DATA', payload: importPayload });
    expect(state.foodEntries).toHaveLength(1);
    expect(state.fastingSessions).toHaveLength(1);
    expect(state.weightEntries).toHaveLength(1);
    expect(state.exerciseEntries).toHaveLength(1);
    expect(state.activeFastingId).toBe('s1');
  });

  it('IMPORT_DATA preserves existing exercise data when not provided', () => {
    const stateWithExercise = {
      ...baseState,
      exerciseEntries: [{ id: 'e1', name: 'Run', calories: 200, durationMin: 20, date: '2025-01-01', createdAt: 1 }],
    };
    const state = appReducer(stateWithExercise, {
      type: 'IMPORT_DATA',
      payload: { foodEntries: [], fastingSessions: [] },
    });
    expect(state.exerciseEntries).toHaveLength(1);
  });
});

describe('appReducer - unknown action', () => {
  it('returns state unchanged for unknown action', () => {
    // @ts-expect-error testing unknown action
    const state = appReducer(baseState, { type: 'UNKNOWN_ACTION' });
    expect(state).toBe(baseState);
  });
});
