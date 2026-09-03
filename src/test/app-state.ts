import type { AppState } from '../types';
import { DEFAULT_AI_SETTINGS } from '../constants/ai';

/** A fully hydrated, empty app state for component and hook tests. */
export function makeAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    foodEntries: [],
    fastingSessions: [],
    weightEntries: [],
    exerciseEntries: [],
    workoutSessions: [],
    workoutTemplates: [],
    activeWorkoutId: null,
    activeFastingId: null,
    selectedDate: '2026-01-01',
    theme: 'light',
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    weightGoal: null,
    userProfile: null,
    aiSettings: DEFAULT_AI_SETTINGS,
    trainingGoal: null,
    gamification: { checkIns: [], seenAchievements: [] },
    fastingFactors: {},
    hydrated: true,
    ...overrides,
  };
}
