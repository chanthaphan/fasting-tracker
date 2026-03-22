import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction } from '../types';
import { appReducer } from './app-reducer';
import { KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';

const initialState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  activeFastingId: null,
  selectedDate: todayKey(),
  theme: 'system',
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
    });
    return {
      foodEntries,
      fastingSessions,
      weightEntries,
      activeFastingId: settings.activeFastingId,
      selectedDate: todayKey(),
      theme: settings.theme,
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
    });
  }, [state.theme, state.activeFastingId]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}
