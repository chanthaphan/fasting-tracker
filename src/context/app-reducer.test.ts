import { describe, it, expect } from 'vitest';
import { appReducer } from './app-reducer';
import type { AppState } from '../types';

const baseState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  exerciseEntries: [],
  workoutSessions: [],
  workoutTemplates: [],
  activeWorkoutId: null,
  activeFastingId: null,
  selectedDate: '2025-01-01',
  theme: 'system',
  goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
  weightGoal: null,
  userProfile: null,
  aiSettings: { apiKey: '', model: 'claude-opus-5', language: 'auto' },
  trainingGoal: null,
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

describe('appReducer - AI settings', () => {
  it('SET_AI_SETTINGS replaces the AI settings', () => {
    const state = appReducer(baseState, {
      type: 'SET_AI_SETTINGS',
      payload: { apiKey: 'sk-ant-test', model: 'claude-haiku-4-5', language: 'th' },
    });
    expect(state.aiSettings).toEqual({ apiKey: 'sk-ant-test', model: 'claude-haiku-4-5', language: 'th' });
    expect(baseState.aiSettings.apiKey).toBe('');
  });
});

describe('appReducer - Training goal', () => {
  it('SET_TRAINING_GOAL sets and clears the goal', () => {
    const goal = {
      targetLifts: [{ name: 'Bench Press', targetWeightKg: 80 }],
      preferredDays: [1, 3, 5],
      sessionMinutes: 60,
    };
    const withGoal = appReducer(baseState, { type: 'SET_TRAINING_GOAL', payload: goal });
    expect(withGoal.trainingGoal).toEqual(goal);
    const cleared = appReducer(withGoal, { type: 'SET_TRAINING_GOAL', payload: null });
    expect(cleared.trainingGoal).toBeNull();
  });
});

describe('appReducer - Workout actions', () => {
  const makeActiveWorkout = () => {
    const state = appReducer(baseState, { type: 'START_WORKOUT', payload: { name: 'Push Day' } });
    return { state, session: state.workoutSessions[0] };
  };

  it('START_WORKOUT creates an active session', () => {
    const { state, session } = makeActiveWorkout();
    expect(state.workoutSessions).toHaveLength(1);
    expect(session.endTime).toBeNull();
    expect(session.name).toBe('Push Day');
    expect(state.activeWorkoutId).toBe(session.id);
  });

  it('START_WORKOUT is a no-op when a workout is already active', () => {
    const { state } = makeActiveWorkout();
    const again = appReducer(state, { type: 'START_WORKOUT' });
    expect(again).toBe(state);
  });

  it('UPDATE_WORKOUT replaces the session by id', () => {
    const { state, session } = makeActiveWorkout();
    const updated = appReducer(state, {
      type: 'UPDATE_WORKOUT',
      payload: {
        ...session,
        exercises: [{ id: 'e1', name: 'Bench Press', sets: [{ id: 's1', weightKg: 60, reps: 8, completed: true }] }],
      },
    });
    expect(updated.workoutSessions[0].exercises).toHaveLength(1);
  });

  it('FINISH_WORKOUT sets endTime, clears activeWorkoutId, appends derived exercise entry', () => {
    const { state, session } = makeActiveWorkout();
    const withSets = appReducer(state, {
      type: 'UPDATE_WORKOUT',
      payload: {
        ...session,
        exercises: [{ id: 'e1', name: 'Bench Press', sets: [{ id: 's1', weightKg: 60, reps: 8, completed: true }] }],
      },
    });
    const endTime = session.startTime + 60 * 60000; // 60 minutes
    const finished = appReducer(withSets, { type: 'FINISH_WORKOUT', payload: { id: session.id, endTime } });
    expect(finished.workoutSessions[0].endTime).toBe(endTime);
    expect(finished.activeWorkoutId).toBeNull();
    expect(finished.exerciseEntries).toHaveLength(1);
    expect(finished.exerciseEntries[0].name).toBe('Weight Training');
    expect(finished.exerciseEntries[0].durationMin).toBe(60);
    expect(finished.exerciseEntries[0].calories).toBe(300); // 150/30min * 60min
    expect(finished.exerciseEntries[0].note).toBe('Push Day');
  });

  it('FINISH_WORKOUT skips the derived entry when no set was completed', () => {
    const { state, session } = makeActiveWorkout();
    const finished = appReducer(state, {
      type: 'FINISH_WORKOUT',
      payload: { id: session.id, endTime: session.startTime + 30 * 60000 },
    });
    expect(finished.exerciseEntries).toHaveLength(0);
    expect(finished.activeWorkoutId).toBeNull();
  });

  it('CANCEL_WORKOUT removes the session and clears activeWorkoutId', () => {
    const { state, session } = makeActiveWorkout();
    const cancelled = appReducer(state, { type: 'CANCEL_WORKOUT', payload: { id: session.id } });
    expect(cancelled.workoutSessions).toHaveLength(0);
    expect(cancelled.activeWorkoutId).toBeNull();
  });

  it('SAVE_TEMPLATE and DELETE_TEMPLATE round-trip', () => {
    const saved = appReducer(baseState, {
      type: 'SAVE_TEMPLATE',
      payload: { name: 'Push Day', exercises: [{ name: 'Bench Press', numSets: 3, lastWeightKg: 60, lastReps: 8 }] },
    });
    expect(saved.workoutTemplates).toHaveLength(1);
    expect(saved.workoutTemplates[0].id).toBeTruthy();
    const deleted = appReducer(saved, { type: 'DELETE_TEMPLATE', payload: { id: saved.workoutTemplates[0].id } });
    expect(deleted.workoutTemplates).toHaveLength(0);
  });

  it('IMPORT_DATA restores workouts and recomputes activeWorkoutId', () => {
    const active = { id: 'w1', name: 'Workout', date: '2025-01-01', startTime: 1, endTime: null, exercises: [] };
    const state = appReducer(baseState, {
      type: 'IMPORT_DATA',
      payload: { foodEntries: [], fastingSessions: [], workoutSessions: [active], workoutTemplates: [] },
    });
    expect(state.workoutSessions).toHaveLength(1);
    expect(state.activeWorkoutId).toBe('w1');
  });

  it('IMPORT_DATA without workout fields preserves existing workouts', () => {
    const { state } = makeActiveWorkout();
    const imported = appReducer(state, { type: 'IMPORT_DATA', payload: { foodEntries: [], fastingSessions: [] } });
    expect(imported.workoutSessions).toHaveLength(1);
    expect(imported.activeWorkoutId).toBe(state.activeWorkoutId);
  });
});

describe('appReducer - unknown action', () => {
  it('returns state unchanged for unknown action', () => {
    // @ts-expect-error testing unknown action
    const state = appReducer(baseState, { type: 'UNKNOWN_ACTION' });
    expect(state).toBe(baseState);
  });
});
