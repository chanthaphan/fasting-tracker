import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction } from '../types';
import { appReducer } from './app-reducer';
import { KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

const initialState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  activeFastingId: null,
  selectedDate: todayKey(),
  theme: 'system',
  goals: DEFAULT_GOALS,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, () => {
    const foodEntries = loadFromStorage(KEYS.FOOD_ENTRIES, initialState.foodEntries);
    const fastingSessions = loadFromStorage(KEYS.FASTING_SESSIONS, initialState.fastingSessions);
    const weightEntries = loadFromStorage(KEYS.WEIGHT_ENTRIES, initialState.weightEntries);
    const settings = loadFromStorage(KEYS.SETTINGS, {
      theme: initialState.theme,
      activeFastingId: initialState.activeFastingId,
      goals: DEFAULT_GOALS,
    });
    return {
      foodEntries,
      fastingSessions,
      weightEntries,
      activeFastingId: settings.activeFastingId,
      selectedDate: todayKey(),
      theme: settings.theme,
      goals: settings.goals ?? DEFAULT_GOALS,
    };
  });

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
    saveToStorage(KEYS.SETTINGS, {
      theme: state.theme,
      activeFastingId: state.activeFastingId,
      goals: state.goals,
    });
  }, [state.theme, state.activeFastingId, state.goals]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}
