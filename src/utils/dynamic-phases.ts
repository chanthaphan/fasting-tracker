import type { FastingPhase, ExerciseEntry } from '../types';
import { FASTING_PHASES } from '../constants/fasting-phases';
import { todayKey } from './date-utils';

export interface FastingFactors {
  /** Today's exercise entries */
  exerciseEntries: ExerciseEntry[];
  /** Hours of sleep last night (0-12); null when not entered, which applies no adjustment */
  sleepHours: number | null;
  /** Hydration level: low | normal | high */
  hydration: 'low' | 'normal' | 'high';
  /** Whether caffeine was consumed today */
  caffeine: boolean;
}

const DEFAULT_FACTORS: FastingFactors = {
  exerciseEntries: [],
  sleepHours: null,
  hydration: 'normal',
  caffeine: false,
};

export interface FactorEffects {
  multiplier: number;
  effects: string[];
}

/**
 * The single source of truth for how factors shift the phases: returns
 * the multiplier and, for each adjustment applied, the sentence shown to
 * the user, so the summary can never disagree with the timeline.
 */
export function computeFactorEffects(factors: FastingFactors): FactorEffects {
  let multiplier = 1.0;
  const effects: string[] = [];

  const today = todayKey();
  const todayExercise = factors.exerciseEntries.filter((e) => e.date === today);
  const totalCalsBurned = todayExercise.reduce((sum, e) => sum + e.calories, 0);
  const totalMinutes = todayExercise.reduce((sum, e) => sum + e.durationMin, 0);

  // Exercise depletes glycogen faster → fat-burning and ketosis arrive earlier
  if (totalCalsBurned >= 400 || totalMinutes >= 60) {
    multiplier -= 0.15;
    effects.push('Intense exercise: phases accelerated 15%');
  } else if (totalCalsBurned >= 200 || totalMinutes >= 30) {
    multiplier -= 0.10;
    effects.push('Moderate exercise: phases accelerated 10%');
  } else if (totalCalsBurned >= 100 || totalMinutes >= 15) {
    multiplier -= 0.05;
    effects.push('Light exercise: phases accelerated 5%');
  }

  // Sleep affects insulin sensitivity; no entry means no adjustment
  if (factors.sleepHours !== null) {
    if (factors.sleepHours >= 7 && factors.sleepHours <= 9) {
      multiplier -= 0.05;
      effects.push('Good sleep: phases accelerated 5%');
    } else if (factors.sleepHours < 5) {
      multiplier += 0.10;
      effects.push('Poor sleep: phases delayed 10%');
    } else if (factors.sleepHours < 7) {
      multiplier += 0.03;
      effects.push('Short sleep: phases delayed 3%');
    }
  }

  if (factors.hydration === 'high') {
    multiplier -= 0.05;
    effects.push('High hydration: phases accelerated 5%');
  } else if (factors.hydration === 'low') {
    multiplier += 0.08;
    effects.push('Low hydration: phases delayed 8%');
  }

  if (factors.caffeine) {
    multiplier -= 0.05;
    effects.push('Caffeine: phases accelerated 5%');
  }

  return { multiplier: Math.max(0.70, Math.min(1.20, multiplier)), effects };
}

/**
 * Computes a time-shift multiplier based on fasting factors.
 * A multiplier < 1 means phases are reached FASTER (shifted earlier).
 * A multiplier > 1 means phases are reached SLOWER (shifted later).
 *
 * Scientific rationale:
 * - Exercise depletes glycogen faster → accelerates fat-burning & ketosis entry
 * - Good sleep improves insulin sensitivity → faster insulin drop
 * - Good hydration supports metabolic processes
 * - Caffeine stimulates lipolysis & slightly boosts metabolic rate
 */
export function computePhaseMultiplier(factors: FastingFactors): number {
  return computeFactorEffects(factors).multiplier;
}

/**
 * Returns dynamically adjusted fasting phases based on user factors.
 */
export function getDynamicPhases(factors: Partial<FastingFactors> = {}): FastingPhase[] {
  const merged = { ...DEFAULT_FACTORS, ...factors };
  const multiplier = computePhaseMultiplier(merged);

  return FASTING_PHASES.map((phase) => ({
    ...phase,
    minHours: phase.minHours === 0 ? 0 : round1(phase.minHours * multiplier),
    maxHours: phase.maxHours === Infinity ? Infinity : round1(phase.maxHours * multiplier),
  }));
}

/**
 * Get the phase for the given elapsed time using dynamic phases.
 */
export function getDynamicPhaseForElapsed(
  elapsedMs: number,
  phases: FastingPhase[],
): FastingPhase {
  const hours = elapsedMs / (1000 * 60 * 60);
  for (let i = phases.length - 1; i >= 0; i--) {
    if (hours >= phases[i].minHours) {
      return phases[i];
    }
  }
  return phases[0];
}

/**
 * Get a human-readable summary of the factor effects.
 */
export function getFactorSummary(factors: Partial<FastingFactors> = {}): string[] {
  return computeFactorEffects({ ...DEFAULT_FACTORS, ...factors }).effects;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
