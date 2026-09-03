import { useReducer, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppContext } from './use-app-state';
import type { AppState } from '../types';
import { DEFAULT_AI_SETTINGS } from '../constants/ai';
import { appReducer } from './app-reducer';
import {
  KEYS, loadFromStorage, loadFromStorageSync, saveToStorage,
  isFoodEntryArray, isFastingSessionArray, isWeightEntryArray, isExerciseEntryArray, isSettings,
  isWorkoutSessionArray, isWorkoutTemplateArray, isGamificationData,
} from '../utils/storage';
import { todayKey } from '../utils/date-utils';

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

const initialState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  exerciseEntries: [],
  workoutSessions: [],
  workoutTemplates: [],
  activeWorkoutId: null,
  activeFastingId: null,
  selectedDate: todayKey(),
  theme: 'system',
  goals: DEFAULT_GOALS,
  weightGoal: null,
  userProfile: null,
  aiSettings: DEFAULT_AI_SETTINGS,
  trainingGoal: null,
  gamification: { checkIns: [], seenAchievements: [] },
  hydrated: false,
};

function loadInitialState(): AppState {
  const foodEntries = loadFromStorageSync(KEYS.FOOD_ENTRIES, initialState.foodEntries, isFoodEntryArray);
  const fastingSessions = loadFromStorageSync(KEYS.FASTING_SESSIONS, initialState.fastingSessions, isFastingSessionArray);
  const weightEntries = loadFromStorageSync(KEYS.WEIGHT_ENTRIES, initialState.weightEntries, isWeightEntryArray);
  const exerciseEntries = loadFromStorageSync(KEYS.EXERCISE_ENTRIES, initialState.exerciseEntries, isExerciseEntryArray);
  const workoutSessions = loadFromStorageSync(KEYS.WORKOUT_SESSIONS, initialState.workoutSessions, isWorkoutSessionArray);
  const workoutTemplates = loadFromStorageSync(KEYS.WORKOUT_TEMPLATES, initialState.workoutTemplates, isWorkoutTemplateArray);
  const gamification = loadFromStorageSync(KEYS.GAMIFICATION, initialState.gamification, isGamificationData);
  const settings = loadFromStorageSync(KEYS.SETTINGS, {
    theme: initialState.theme,
    activeFastingId: initialState.activeFastingId,
    goals: DEFAULT_GOALS,
    weightGoal: null,
    userProfile: null,
  }, isSettings);
  return {
    foodEntries,
    fastingSessions,
    weightEntries,
    exerciseEntries,
    workoutSessions,
    workoutTemplates,
    activeWorkoutId: settings.activeWorkoutId ?? workoutSessions.find((s) => s.endTime === null)?.id ?? null,
    activeFastingId: settings.activeFastingId,
    selectedDate: todayKey(),
    theme: settings.theme as AppState['theme'],
    goals: settings.goals ?? DEFAULT_GOALS,
    weightGoal: settings.weightGoal ?? null,
    userProfile: settings.userProfile ?? null,
    aiSettings: settings.aiSettings ?? DEFAULT_AI_SETTINGS,
    trainingGoal: settings.trainingGoal ?? null,
    gamification,
    hydrated: false,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, loadInitialState);

  // Hydrate from IndexedDB (may have newer data than localStorage)
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const [foodEntries, fastingSessions, weightEntries, exerciseEntries, workoutSessions, workoutTemplates, gamification, settings] = await Promise.all([
        loadFromStorage(KEYS.FOOD_ENTRIES, initialState.foodEntries, isFoodEntryArray),
        loadFromStorage(KEYS.FASTING_SESSIONS, initialState.fastingSessions, isFastingSessionArray),
        loadFromStorage(KEYS.WEIGHT_ENTRIES, initialState.weightEntries, isWeightEntryArray),
        loadFromStorage(KEYS.EXERCISE_ENTRIES, initialState.exerciseEntries, isExerciseEntryArray),
        loadFromStorage(KEYS.WORKOUT_SESSIONS, initialState.workoutSessions, isWorkoutSessionArray),
        loadFromStorage(KEYS.WORKOUT_TEMPLATES, initialState.workoutTemplates, isWorkoutTemplateArray),
        loadFromStorage(KEYS.GAMIFICATION, initialState.gamification, isGamificationData),
        loadFromStorage(KEYS.SETTINGS, {
          theme: initialState.theme,
          activeFastingId: initialState.activeFastingId,
          goals: DEFAULT_GOALS,
          weightGoal: null,
          userProfile: null,
        }, isSettings),
      ]);
      if (cancelled) return;
      dispatch({
        type: 'HYDRATE',
        payload: {
          foodEntries,
          fastingSessions,
          weightEntries,
          exerciseEntries,
          workoutSessions,
          workoutTemplates,
          activeWorkoutId: settings.activeWorkoutId ?? workoutSessions.find((s) => s.endTime === null)?.id ?? null,
          activeFastingId: settings.activeFastingId,
          selectedDate: todayKey(),
          theme: settings.theme as AppState['theme'],
          goals: settings.goals ?? DEFAULT_GOALS,
          weightGoal: settings.weightGoal ?? null,
          userProfile: settings.userProfile ?? null,
          aiSettings: settings.aiSettings ?? DEFAULT_AI_SETTINGS,
          trainingGoal: settings.trainingGoal ?? null,
          gamification,
          hydrated: true,
        },
      });
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.FOOD_ENTRIES, state.foodEntries);
  }, [state.hydrated, state.foodEntries]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.FASTING_SESSIONS, state.fastingSessions);
  }, [state.hydrated, state.fastingSessions]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.WEIGHT_ENTRIES, state.weightEntries);
  }, [state.hydrated, state.weightEntries]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.EXERCISE_ENTRIES, state.exerciseEntries);
  }, [state.hydrated, state.exerciseEntries]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.WORKOUT_SESSIONS, state.workoutSessions);
  }, [state.hydrated, state.workoutSessions]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.WORKOUT_TEMPLATES, state.workoutTemplates);
  }, [state.hydrated, state.workoutTemplates]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.GAMIFICATION, state.gamification);
  }, [state.hydrated, state.gamification]);

  // Persistence waits for hydration: the sync localStorage snapshot may be stale or evicted,
  // and writing it back before IndexedDB has been read would overwrite the real data.
  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.SETTINGS, {
      theme: state.theme,
      activeFastingId: state.activeFastingId,
      goals: state.goals,
      weightGoal: state.weightGoal,
      userProfile: state.userProfile,
      aiSettings: state.aiSettings,
      activeWorkoutId: state.activeWorkoutId,
      trainingGoal: state.trainingGoal,
    });
  }, [state.hydrated, state.theme, state.activeFastingId, state.goals, state.weightGoal, state.userProfile, state.aiSettings, state.activeWorkoutId, state.trainingGoal]);

  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener('storage-full', handler);
    return () => window.removeEventListener('storage-full', handler);
  }, []);

  const store = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={store}>
      {storageFull && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm py-2 px-4">
          Storage is full — your data may not be saved. Please export a backup from Dashboard settings.
          <button onClick={() => setStorageFull(false)} className="ml-3 underline font-medium">Dismiss</button>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

