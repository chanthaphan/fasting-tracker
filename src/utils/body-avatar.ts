import type { AppState } from '../types';

export type AvatarMood = 'neutral' | 'smile' | 'joy';

export interface AvatarModel {
  status: 'no-weight' | 'no-goal' | 'full';
  gender: 'male' | 'female';
  currentFatLevel: number; // 0..1 — drives how heavy the avatar silhouette is
  goalFatLevel: number | null; // null when no weight goal is set
  muscleLevel: number; // 0..1 — training bulk from recent workouts; with leanness it reveals abs and pecs
  trainingSessions: number; // workouts + exercise logs in the last TRAINING_WINDOW_DAYS
  progress: number; // 0..1 toward the weight goal
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  mood: AvatarMood;
}

const LBS_TO_KG = 0.453592;

/** Deurenberg formula — body fat % estimated from BMI, age, and gender. */
export function estimateBodyFatPct(bmi: number, age: number, gender: 'male' | 'female'): number {
  return 1.2 * bmi + 0.23 * age - 10.8 * (gender === 'male' ? 1 : 0) - 5.4;
}

/**
 * Map a body-fat % onto the avatar's 0..1 fat level. The ranges span
 * lean-athletic to high body fat for each gender, clamped at both ends.
 */
export function bodyFatToFatLevel(bfPct: number, gender: 'male' | 'female'): number {
  const [lo, hi] = gender === 'male' ? [8, 35] : [16, 42];
  return Math.min(1, Math.max(0, (bfPct - lo) / (hi - lo)));
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const TRAINING_WINDOW_DAYS = 28;
/** Sessions in the window that count as fully trained (about three a week). */
export const TRAINING_SESSIONS_FOR_MAX = 12;

/**
 * How consistently the user has been training lately: completed workouts
 * count fully, logged cardio/exercise entries count half, over a rolling
 * window. Returns the session tally and a 0..1 muscle level.
 */
export function getTrainingLevel(
  state: Partial<Pick<AppState, 'workoutSessions' | 'exerciseEntries'>>,
  now: number = Date.now()
): { sessions: number; level: number } {
  const cutoff = new Date(now - TRAINING_WINDOW_DAYS * 86400000);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const workouts = (state.workoutSessions ?? []).filter((w) => w.endTime !== null && w.date >= cutoffKey).length;
  const cardio = (state.exerciseEntries ?? []).filter((e) => e.date >= cutoffKey).length;
  const sessions = workouts + cardio * 0.5;
  return { sessions: Math.round(sessions * 10) / 10, level: clamp01(sessions / TRAINING_SESSIONS_FOR_MAX) };
}

function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? weight * LBS_TO_KG : weight;
}

function moodForProgress(progress: number): AvatarMood {
  if (progress >= 0.75) return 'joy';
  if (progress >= 0.33) return 'smile';
  return 'neutral';
}

// Fallback fat levels when no body profile exists: pin the goal-start
// weight to a visibly chubby avatar and the target to a slim one, and
// interpolate the current weight between them.
const FALLBACK_START_LEVEL = 0.8;
const FALLBACK_TARGET_LEVEL = 0.35;

export function getAvatarModel(
  state: Pick<AppState, 'weightEntries' | 'weightGoal' | 'userProfile'> &
    Partial<Pick<AppState, 'workoutSessions' | 'exerciseEntries'>>
): AvatarModel {
  const { weightEntries, weightGoal, userProfile } = state;
  const gender = userProfile?.gender ?? 'male';
  const training = getTrainingLevel(state);
  const muscleLevel = training.level;
  const trainingSessions = training.sessions;

  const latest = [...weightEntries].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  if (!latest) {
    return {
      status: 'no-weight',
      gender,
      currentFatLevel: 0.6,
      goalFatLevel: null,
      muscleLevel,
      trainingSessions,
      progress: 0,
      currentWeightKg: null,
      targetWeightKg: null,
      mood: 'neutral',
    };
  }

  const currentKg = toKg(latest.weight, latest.unit);

  const heightM = userProfile ? userProfile.heightCm / 100 : null;
  const levelFromKg =
    userProfile && heightM
      ? (kg: number) =>
          bodyFatToFatLevel(estimateBodyFatPct(kg / (heightM * heightM), userProfile.age, gender), gender)
      : null;

  if (!weightGoal) {
    return {
      status: 'no-goal',
      gender,
      currentFatLevel: levelFromKg ? levelFromKg(currentKg) : 0.6,
      goalFatLevel: null,
      muscleLevel,
      trainingSessions,
      progress: 0,
      currentWeightKg: currentKg,
      targetWeightKg: null,
      mood: 'neutral',
    };
  }

  const startKg = toKg(weightGoal.startWeight, weightGoal.unit);
  const targetKg = toKg(weightGoal.targetWeight, weightGoal.unit);
  const progress =
    startKg === targetKg ? 0 : clamp01((startKg - currentKg) / (startKg - targetKg));

  let currentFatLevel: number;
  let goalFatLevel: number;
  if (levelFromKg) {
    currentFatLevel = levelFromKg(currentKg);
    goalFatLevel = levelFromKg(targetKg);
  } else {
    goalFatLevel = FALLBACK_TARGET_LEVEL;
    currentFatLevel = FALLBACK_START_LEVEL + (FALLBACK_TARGET_LEVEL - FALLBACK_START_LEVEL) * progress;
  }

  return {
    status: 'full',
    gender,
    currentFatLevel,
    goalFatLevel,
    muscleLevel,
    trainingSessions,
    progress,
    currentWeightKg: currentKg,
    targetWeightKg: targetKg,
    mood: moodForProgress(progress),
  };
}
