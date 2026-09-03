import type { AppState, AppAction } from '../types';
import { STRENGTH_CALORIES_PER_30MIN } from '../constants/lift-presets';
import { dateKey } from '../utils/date-utils';
import { getUnlockedAchievements } from '../utils/achievements';

/** Mark every currently unlocked achievement as seen (no-op when nothing is new). */
function withUnlockedMarkedSeen(state: AppState): AppState {
  const unseen = [...getUnlockedAchievements(state)].filter(
    (id) => !state.gamification.seenAchievements.includes(id)
  );
  if (unseen.length === 0) return state;
  return {
    ...state,
    gamification: { ...state.gamification, seenAchievements: [...state.gamification.seenAchievements, ...unseen] },
  };
}

function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((e) => (e.id === item.id ? item : e));
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((e) => e.id !== id);
}

/** Union two lists by id; items from `incoming` win on conflict, order preserved. */
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

/** Record today as a check-in (no-op when already checked in). */
function withTodayCheckIn(state: AppState): AppState {
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

/** Auto check-in for log actions, but only when the entry is for today. */
function withCheckInIfToday(state: AppState, entryDate: string): AppState {
  return entryDate === dateKey(new Date()) ? withTodayCheckIn(state) : state;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_FOOD': {
      const entry = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return withCheckInIfToday({ ...state, foodEntries: [...state.foodEntries, entry] }, entry.date);
    }
    case 'EDIT_FOOD':
      return {
        ...state,
        foodEntries: replaceById(state.foodEntries, action.payload),
      };
    case 'DELETE_FOOD':
      return {
        ...state,
        foodEntries: removeById(state.foodEntries, action.payload.id),
      };
    case 'START_FAST': {
      if (state.activeFastingId) return state;
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
      return withTodayCheckIn({
        ...state,
        fastingSessions: state.fastingSessions.map((s) =>
          s.id === state.activeFastingId
            ? { ...s, endTime: Date.now(), ...(action.payload?.factors ? { factors: action.payload.factors } : {}) }
            : s
        ),
        activeFastingId: null,
      });
    case 'RESTORE_FAST':
      if (state.fastingSessions.some((s) => s.id === action.payload.id)) return state;
      return {
        ...state,
        fastingSessions: [...state.fastingSessions, action.payload].sort((a, b) => a.startTime - b.startTime),
        activeFastingId: action.payload.endTime === null && !state.activeFastingId ? action.payload.id : state.activeFastingId,
      };
    case 'RESTORE_FOOD':
      if (state.foodEntries.some((e) => e.id === action.payload.id)) return state;
      return { ...state, foodEntries: [...state.foodEntries, action.payload] };
    case 'RESTORE_WEIGHT':
      if (state.weightEntries.some((e) => e.id === action.payload.id)) return state;
      return { ...state, weightEntries: [...state.weightEntries, action.payload] };
    case 'RESTORE_EXERCISE':
      if (state.exerciseEntries.some((e) => e.id === action.payload.id)) return state;
      return { ...state, exerciseEntries: [...state.exerciseEntries, action.payload] };
    case 'SET_FASTING_FACTORS':
      return {
        ...state,
        fastingFactors: { ...state.fastingFactors, [action.payload.date]: action.payload.factors },
      };
    case 'DELETE_FAST':
      return {
        ...state,
        fastingSessions: removeById(state.fastingSessions, action.payload.id),
        activeFastingId:
          state.activeFastingId === action.payload.id ? null : state.activeFastingId,
      };
    case 'EDIT_FAST':
      if (action.payload.endTime !== null && action.payload.endTime <= action.payload.startTime) return state;
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
      return withCheckInIfToday({ ...state, weightEntries: [...state.weightEntries, entry] }, entry.date);
    }
    case 'EDIT_WEIGHT':
      return {
        ...state,
        weightEntries: replaceById(state.weightEntries, action.payload),
      };
    case 'DELETE_WEIGHT':
      return {
        ...state,
        weightEntries: removeById(state.weightEntries, action.payload.id),
      };
    case 'ADD_EXERCISE': {
      const entry = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return withCheckInIfToday({ ...state, exerciseEntries: [...state.exerciseEntries, entry] }, entry.date);
    }
    case 'EDIT_EXERCISE':
      return {
        ...state,
        exerciseEntries: replaceById(state.exerciseEntries, action.payload),
      };
    case 'DELETE_EXERCISE':
      return {
        ...state,
        exerciseEntries: removeById(state.exerciseEntries, action.payload.id),
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
        workoutSessions: replaceById(state.workoutSessions, action.payload),
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
      return withTodayCheckIn({
        ...state,
        workoutSessions: state.workoutSessions.map((s) =>
          s.id === action.payload.id
            ? { ...s, endTime: action.payload.endTime, restTimerEndsAt: null }
            : s
        ),
        exerciseEntries: [...state.exerciseEntries, ...derivedEntry],
        activeWorkoutId: state.activeWorkoutId === action.payload.id ? null : state.activeWorkoutId,
      });
    }
    case 'CANCEL_WORKOUT':
    case 'DELETE_WORKOUT':
      return {
        ...state,
        workoutSessions: removeById(state.workoutSessions, action.payload.id),
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
        workoutTemplates: removeById(state.workoutTemplates, action.payload.id),
      };
    case 'DAILY_CHECK_IN':
      return withTodayCheckIn(state);
    case 'MARK_ACHIEVEMENTS_SEEN': {
      const merged = new Set([...state.gamification.seenAchievements, ...action.payload.ids]);
      if (merged.size === new Set(state.gamification.seenAchievements).size) return state;
      return {
        ...state,
        gamification: { ...state.gamification, seenAchievements: [...merged] },
      };
    }
    case 'IMPORT_DATA': {
      const p = action.payload;
      const merge = p.mode === 'merge';
      const pick = <T extends { id: string }>(current: T[], incoming: T[] | undefined): T[] =>
        incoming === undefined ? current : merge ? mergeById(current, incoming) : incoming;
      const workoutSessions = pick(state.workoutSessions, p.workoutSessions);
      const fastingSessions = pick(state.fastingSessions, p.fastingSessions);
      const gamification = p.gamification
        ? merge
          ? {
              checkIns: [...new Set([...state.gamification.checkIns, ...p.gamification.checkIns])].sort(),
              seenAchievements: [...new Set([...state.gamification.seenAchievements, ...p.gamification.seenAchievements])],
            }
          : { ...p.gamification, seenAchievements: [...new Set([...state.gamification.seenAchievements, ...p.gamification.seenAchievements])] }
        : state.gamification;
      const next: AppState = {
        ...state,
        foodEntries: pick(state.foodEntries, p.foodEntries),
        fastingSessions,
        weightEntries: pick(state.weightEntries, p.weightEntries),
        exerciseEntries: pick(state.exerciseEntries, p.exerciseEntries),
        workoutSessions,
        workoutTemplates: pick(state.workoutTemplates, p.workoutTemplates),
        gamification,
        userProfile: p.settings?.userProfile !== undefined ? p.settings.userProfile : state.userProfile,
        goals: p.settings?.goals ?? state.goals,
        weightGoal: p.settings?.weightGoal !== undefined ? p.settings.weightGoal : state.weightGoal,
        trainingGoal: p.settings?.trainingGoal !== undefined ? p.settings.trainingGoal : state.trainingGoal,
        activeFastingId: fastingSessions.find((s) => s.endTime === null)?.id ?? null,
        activeWorkoutId: workoutSessions.find((s) => s.endTime === null)?.id ?? null,
      };
      // Restoring history is not an achievement moment: mark whatever it unlocks as already seen
      return withUnlockedMarkedSeen(next);
    }
    case 'HYDRATE':
      // Badges earned before this session began were never "just unlocked" — don't celebrate them now
      return withUnlockedMarkedSeen(action.payload);
    default:
      return state;
  }
}
