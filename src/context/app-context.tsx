import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { AppState, AppAction } from '../types';
import { appReducer } from './app-reducer';
import {
  KEYS, loadFromStorage, loadFromStorageSync, saveToStorage,
  isFoodEntryArray, isFastingSessionArray, isWeightEntryArray, isExerciseEntryArray, isSettings,
} from '../utils/storage';
import { todayKey } from '../utils/date-utils';

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

const initialState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  exerciseEntries: [],
  activeFastingId: null,
  selectedDate: todayKey(),
  theme: 'system',
  goals: DEFAULT_GOALS,
  weightGoal: null,
  userProfile: null,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({ state: initialState, dispatch: () => {} });

function loadInitialState(): AppState {
  const foodEntries = loadFromStorageSync(KEYS.FOOD_ENTRIES, initialState.foodEntries, isFoodEntryArray);
  const fastingSessions = loadFromStorageSync(KEYS.FASTING_SESSIONS, initialState.fastingSessions, isFastingSessionArray);
  const weightEntries = loadFromStorageSync(KEYS.WEIGHT_ENTRIES, initialState.weightEntries, isWeightEntryArray);
  const exerciseEntries = loadFromStorageSync(KEYS.EXERCISE_ENTRIES, initialState.exerciseEntries, isExerciseEntryArray);
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
    activeFastingId: settings.activeFastingId,
    selectedDate: todayKey(),
    theme: settings.theme as AppState['theme'],
    goals: settings.goals ?? DEFAULT_GOALS,
    weightGoal: settings.weightGoal ?? null,
    userProfile: settings.userProfile ?? null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, loadInitialState);

  // Hydrate from IndexedDB (may have newer data than localStorage)
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const [foodEntries, fastingSessions, weightEntries, exerciseEntries, settings] = await Promise.all([
        loadFromStorage(KEYS.FOOD_ENTRIES, initialState.foodEntries, isFoodEntryArray),
        loadFromStorage(KEYS.FASTING_SESSIONS, initialState.fastingSessions, isFastingSessionArray),
        loadFromStorage(KEYS.WEIGHT_ENTRIES, initialState.weightEntries, isWeightEntryArray),
        loadFromStorage(KEYS.EXERCISE_ENTRIES, initialState.exerciseEntries, isExerciseEntryArray),
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
          activeFastingId: settings.activeFastingId,
          selectedDate: todayKey(),
          theme: settings.theme as AppState['theme'],
          goals: settings.goals ?? DEFAULT_GOALS,
          weightGoal: settings.weightGoal ?? null,
          userProfile: settings.userProfile ?? null,
        },
      });
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    saveToStorage(KEYS.FOOD_ENTRIES, state.foodEntries);
  }, [state.foodEntries]);

  useEffect(() => {
    saveToStorage(KEYS.FASTING_SESSIONS, state.fastingSessions);
  }, [state.fastingSessions]);

  useEffect(() => {
    saveToStorage(KEYS.WEIGHT_ENTRIES, state.weightEntries);
  }, [state.weightEntries]);

  useEffect(() => {
    saveToStorage(KEYS.EXERCISE_ENTRIES, state.exerciseEntries);
  }, [state.exerciseEntries]);

  useEffect(() => {
    saveToStorage(KEYS.SETTINGS, {
      theme: state.theme,
      activeFastingId: state.activeFastingId,
      goals: state.goals,
      weightGoal: state.weightGoal,
      userProfile: state.userProfile,
    });
  }, [state.theme, state.activeFastingId, state.goals, state.weightGoal, state.userProfile]);

  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener('storage-full', handler);
    return () => window.removeEventListener('storage-full', handler);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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

export function useAppState() {
  return useContext(AppContext);
}
