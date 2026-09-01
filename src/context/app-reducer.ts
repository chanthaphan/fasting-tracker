import type { AppState, AppAction } from '../types';
import { STRENGTH_CALORIES_PER_30MIN } from '../constants/lift-presets';
import { dateKey } from '../utils/date-utils';

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_FOOD': {
      const entry = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return { ...state, foodEntries: [...state.foodEntries, entry] };
    }
    case 'EDIT_FOOD':
      return {
        ...state,
        foodEntries: state.foodEntries.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_FOOD':
      return {
        ...state,
        foodEntries: state.foodEntries.filter((e) => e.id !== action.payload.id),
      };
    case 'START_FAST': {
      const session = {
        id: crypto.randomUUID(),
        startTime: Date.now(),
        endTime: null,
        targetHours: action.payload?.targetHours,
      };
      return {
        ...state,
        fastingSessions: [...state.fastingSessions, session],
        activeFastingId: session.id,
      };
    }
    case 'STOP_FAST':
      return {
        ...state,
        fastingSessions: state.fastingSessions.map((s) =>
          s.id === state.activeFastingId ? { ...s, endTime: Date.now() } : s
        ),
        activeFastingId: null,
      };
    case 'DELETE_FAST':
      return {
        ...state,
        fastingSessions: state.fastingSessions.filter((s) => s.id !== action.payload.id),
        activeFastingId:
          state.activeFastingId === action.payload.id ? null : state.activeFastingId,
      };
    case 'EDIT_FAST':
      return {
        ...state,
        fastingSessions: state.fastingSessions.map((s) =>
          s.id === action.payload.id
            ? { ...s, startTime: action.payload.startTime, endTime: action.payload.endTime }
            : s
        ),
      };
    case 'ADD_WEIGHT': {
      const entry = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return { ...state, weightEntries: [...state.weightEntries, entry] };
    }
    case 'EDIT_WEIGHT':
      return {
        ...state,
        weightEntries: state.weightEntries.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_WEIGHT':
      return {
        ...state,
        weightEntries: state.weightEntries.filter((e) => e.id !== action.payload.id),
      };
    case 'ADD_EXERCISE': {
      const entry = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return { ...state, exerciseEntries: [...state.exerciseEntries, entry] };
    }
    case 'EDIT_EXERCISE':
      return {
        ...state,
        exerciseEntries: state.exerciseEntries.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_EXERCISE':
      return {
        ...state,
        exerciseEntries: state.exerciseEntries.filter((e) => e.id !== action.payload.id),
      };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_WEIGHT_GOAL':
      return { ...state, weightGoal: action.payload };
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    case 'SET_AI_SETTINGS':
      return { ...state, aiSettings: action.payload };
    case 'SET_TRAINING_GOAL':
      return { ...state, trainingGoal: action.payload };
    case 'START_WORKOUT': {
      if (state.activeWorkoutId) return state;
      const now = Date.now();
      const session = {
        id: crypto.randomUUID(),
        name: action.payload?.name ?? 'Workout',
        date: dateKey(new Date(now)),
        startTime: now,
        endTime: null,
        exercises: action.payload?.exercises ?? [],
        templateId: action.payload?.templateId,
      };
      return {
        ...state,
        workoutSessions: [...state.workoutSessions, session],
        activeWorkoutId: session.id,
      };
    }
    case 'UPDATE_WORKOUT':
      return {
        ...state,
        workoutSessions: state.workoutSessions.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case 'FINISH_WORKOUT': {
      const session = state.workoutSessions.find((s) => s.id === action.payload.id);
      if (!session) return state;
      const durationMin = Math.round((action.payload.endTime - session.startTime) / 60000);
      const hasCompletedSet = session.exercises.some((ex) => ex.sets.some((set) => set.completed));
      const derivedEntry =
        hasCompletedSet && durationMin >= 1
          ? [{
              id: crypto.randomUUID(),
              name: 'Weight Training',
              calories: Math.round((STRENGTH_CALORIES_PER_30MIN / 30) * durationMin),
              durationMin,
              date: session.date,
              note: session.name !== 'Workout' ? session.name : undefined,
              createdAt: Date.now(),
            }]
          : [];
      return {
        ...state,
        workoutSessions: state.workoutSessions.map((s) =>
          s.id === action.payload.id
            ? { ...s, endTime: action.payload.endTime, restTimerEndsAt: null }
            : s
        ),
        exerciseEntries: [...state.exerciseEntries, ...derivedEntry],
        activeWorkoutId: state.activeWorkoutId === action.payload.id ? null : state.activeWorkoutId,
      };
    }
    case 'CANCEL_WORKOUT':
    case 'DELETE_WORKOUT':
      return {
        ...state,
        workoutSessions: state.workoutSessions.filter((s) => s.id !== action.payload.id),
        activeWorkoutId:
          state.activeWorkoutId === action.payload.id ? null : state.activeWorkoutId,
      };
    case 'SAVE_TEMPLATE': {
      const template = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return { ...state, workoutTemplates: [...state.workoutTemplates, template] };
    }
    case 'DELETE_TEMPLATE':
      return {
        ...state,
        workoutTemplates: state.workoutTemplates.filter((t) => t.id !== action.payload.id),
      };
    case 'DAILY_CHECK_IN': {
      const today = dateKey(new Date());
      if (state.gamification.checkIns.includes(today)) return state;
      return {
        ...state,
        gamification: {
          ...state.gamification,
          checkIns: [...state.gamification.checkIns, today].sort(),
        },
      };
    }
    case 'MARK_ACHIEVEMENTS_SEEN': {
      const merged = new Set([...state.gamification.seenAchievements, ...action.payload.ids]);
      if (merged.size === state.gamification.seenAchievements.length) return state;
      return {
        ...state,
        gamification: { ...state.gamification, seenAchievements: [...merged] },
      };
    }
    case 'IMPORT_DATA': {
      const workoutSessions = action.payload.workoutSessions ?? state.workoutSessions;
      return {
        ...state,
        foodEntries: action.payload.foodEntries,
        fastingSessions: action.payload.fastingSessions,
        weightEntries: action.payload.weightEntries ?? state.weightEntries,
        exerciseEntries: action.payload.exerciseEntries ?? state.exerciseEntries,
        workoutSessions,
        workoutTemplates: action.payload.workoutTemplates ?? state.workoutTemplates,
        gamification: action.payload.gamification ?? state.gamification,
        activeFastingId:
          action.payload.fastingSessions.find((s) => s.endTime === null)?.id ?? null,
        activeWorkoutId: workoutSessions.find((s) => s.endTime === null)?.id ?? null,
      };
    }
    case 'HYDRATE':
      return action.payload;
    default:
      return state;
  }
}
