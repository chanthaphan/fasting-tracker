import { useReducer, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppContext } from './use-app-state';
import type { AppState } from '../types';
import { DEFAULT_AI_SETTINGS } from '../constants/ai';
import { DEFAULT_MED_REMINDERS } from '../constants/med-reminders';
import { appReducer } from './app-reducer';
import {
  KEYS, loadFromStorage, loadFromStorageSync, saveToStorage,
  isFoodEntryArray, isFastingSessionArray, isWeightEntryArray, isExerciseEntryArray, isSettings,
  isWorkoutSessionArray, isWorkoutTemplateArray, isGamificationData, isMedicationArray, isMedicationLogArray, isMedReminderSettings,
} from '../utils/storage';
import { todayKey } from '../utils/date-utils';
import { langForMode, translate } from '../i18n';

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65, sodium: 2000 };

const initialState: AppState = {
  foodEntries: [],
  fastingSessions: [],
  weightEntries: [],
  exerciseEntries: [],
  workoutSessions: [],
  workoutTemplates: [],
  medications: [],
  medicationLogs: [],
  medReminders: DEFAULT_MED_REMINDERS,
  activeWorkoutId: null,
  activeFastingId: null,
  selectedDate: todayKey(),
  theme: 'system',
  appMode: 'standard',
  goals: DEFAULT_GOALS,
  weightGoal: null,
  userProfile: null,
  aiSettings: DEFAULT_AI_SETTINGS,
  trainingGoal: null,
  gamification: { checkIns: [], seenAchievements: [] },
  fastingFactors: {},
  hydrated: false,
};

function loadInitialState(): AppState {
  const foodEntries = loadFromStorageSync(KEYS.FOOD_ENTRIES, initialState.foodEntries, isFoodEntryArray);
  const fastingSessions = loadFromStorageSync(KEYS.FASTING_SESSIONS, initialState.fastingSessions, isFastingSessionArray);
  const weightEntries = loadFromStorageSync(KEYS.WEIGHT_ENTRIES, initialState.weightEntries, isWeightEntryArray);
  const exerciseEntries = loadFromStorageSync(KEYS.EXERCISE_ENTRIES, initialState.exerciseEntries, isExerciseEntryArray);
  const workoutSessions = loadFromStorageSync(KEYS.WORKOUT_SESSIONS, initialState.workoutSessions, isWorkoutSessionArray);
  const workoutTemplates = loadFromStorageSync(KEYS.WORKOUT_TEMPLATES, initialState.workoutTemplates, isWorkoutTemplateArray);
  const medications = loadFromStorageSync(KEYS.MEDICATIONS, initialState.medications, isMedicationArray);
  const medicationLogs = loadFromStorageSync(KEYS.MEDICATION_LOGS, initialState.medicationLogs, isMedicationLogArray);
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
    medications,
    medicationLogs,
    medReminders: isMedReminderSettings(settings.medReminders) ? settings.medReminders : DEFAULT_MED_REMINDERS,
    activeWorkoutId: settings.activeWorkoutId ?? workoutSessions.find((s) => s.endTime === null)?.id ?? null,
    activeFastingId: settings.activeFastingId,
    selectedDate: todayKey(),
    theme: settings.theme as AppState['theme'],
    appMode: settings.appMode === 'adult' ? 'adult' : 'standard',
    goals: settings.goals ?? DEFAULT_GOALS,
    weightGoal: settings.weightGoal ?? null,
    userProfile: settings.userProfile ?? null,
    aiSettings: settings.aiSettings ?? DEFAULT_AI_SETTINGS,
    trainingGoal: settings.trainingGoal ?? null,
    gamification,
    fastingFactors: settings.fastingFactors ?? {},
    hydrated: false,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, loadInitialState);

  // Hydrate from IndexedDB (may have newer data than localStorage)
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const [foodEntries, fastingSessions, weightEntries, exerciseEntries, workoutSessions, workoutTemplates, medications, medicationLogs, gamification, settings] = await Promise.all([
        loadFromStorage(KEYS.FOOD_ENTRIES, initialState.foodEntries, isFoodEntryArray),
        loadFromStorage(KEYS.FASTING_SESSIONS, initialState.fastingSessions, isFastingSessionArray),
        loadFromStorage(KEYS.WEIGHT_ENTRIES, initialState.weightEntries, isWeightEntryArray),
        loadFromStorage(KEYS.EXERCISE_ENTRIES, initialState.exerciseEntries, isExerciseEntryArray),
        loadFromStorage(KEYS.WORKOUT_SESSIONS, initialState.workoutSessions, isWorkoutSessionArray),
        loadFromStorage(KEYS.WORKOUT_TEMPLATES, initialState.workoutTemplates, isWorkoutTemplateArray),
        loadFromStorage(KEYS.MEDICATIONS, initialState.medications, isMedicationArray),
        loadFromStorage(KEYS.MEDICATION_LOGS, initialState.medicationLogs, isMedicationLogArray),
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
          medications,
          medicationLogs,
          medReminders: isMedReminderSettings(settings.medReminders) ? settings.medReminders : DEFAULT_MED_REMINDERS,
          activeWorkoutId: settings.activeWorkoutId ?? workoutSessions.find((s) => s.endTime === null)?.id ?? null,
          activeFastingId: settings.activeFastingId,
          selectedDate: todayKey(),
          theme: settings.theme as AppState['theme'],
          appMode: settings.appMode === 'adult' ? 'adult' : 'standard',
          goals: settings.goals ?? DEFAULT_GOALS,
          weightGoal: settings.weightGoal ?? null,
          userProfile: settings.userProfile ?? null,
          aiSettings: settings.aiSettings ?? DEFAULT_AI_SETTINGS,
          trainingGoal: settings.trainingGoal ?? null,
          gamification,
          fastingFactors: settings.fastingFactors ?? {},
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

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.MEDICATIONS, state.medications);
  }, [state.hydrated, state.medications]);

  useEffect(() => {
    if (!state.hydrated) return;
    saveToStorage(KEYS.MEDICATION_LOGS, state.medicationLogs);
  }, [state.hydrated, state.medicationLogs]);

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
      fastingFactors: state.fastingFactors,
      appMode: state.appMode,
      medReminders: state.medReminders,
    });
  }, [state.hydrated, state.theme, state.activeFastingId, state.goals, state.weightGoal, state.userProfile, state.aiSettings, state.activeWorkoutId, state.trainingGoal, state.fastingFactors, state.appMode, state.medReminders]);

  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    const handler = () => setStorageFull(true);
    window.addEventListener('storage-full', handler);
    return () => window.removeEventListener('storage-full', handler);
  }, []);

  const store = useMemo(() => ({ state, dispatch }), [state]);
  const lang = langForMode(state.appMode);

  // Let CSS and assistive tech know which experience is active
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dataset.mode = state.appMode;
  }, [lang, state.appMode]);

  return (
    <AppContext.Provider value={store}>
      {storageFull && (
        <div role="alert" className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          {translate(lang, 'app.storageFull')}
          <button onClick={() => setStorageFull(false)} className="ml-3 underline font-medium">{translate(lang, 'app.dismiss')}</button>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

