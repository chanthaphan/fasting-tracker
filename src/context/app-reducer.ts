import type { AppState, AppAction } from '../types';

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
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'IMPORT_DATA':
      return {
        ...state,
        foodEntries: action.payload.foodEntries,
        fastingSessions: action.payload.fastingSessions,
        weightEntries: action.payload.weightEntries ?? state.weightEntries,
        activeFastingId:
          action.payload.fastingSessions.find((s) => s.endTime === null)?.id ?? null,
      };
    case 'HYDRATE':
      return action.payload;
    default:
      return state;
  }
}
