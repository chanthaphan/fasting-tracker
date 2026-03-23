import type { FastingPhase, ExerciseEntry } from '../types';
import { FASTING_PHASES } from '../constants/fasting-phases';
import { todayKey } from './date-utils';

export interface FastingFactors {
  /** Today's exercise entries */
  exerciseEntries: ExerciseEntry[];
  /** Hours of sleep last night (0-12) */
  sleepHours: number;
  /** Hydration level: low | normal | high */
  hydration: 'low' | 'normal' | 'high';
  /** Whether caffeine was consumed today */
  caffeine: boolean;
}

const DEFAULT_FACTORS: FastingFactors = {
  exerciseEntries: [],
  sleepHours: 7,
  hydration: 'normal',
  caffeine: false,
};

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
  let multiplier = 1.0;

  // Exercise effect: calories burned today shift phases earlier
  const today = todayKey();
  const todayExercise = factors.exerciseEntries.filter((e) => e.date === today);
  const totalCalsBurned = todayExercise.reduce((sum, e) => sum + e.calories, 0);
  const totalMinutes = todayExercise.reduce((sum, e) => sum + e.durationMin, 0);

  // Light exercise (100-200 cal): -5%, moderate (200-400): -10%, intense (400+): -15%
  if (totalCalsBurned >= 400 || totalMinutes >= 60) {
    multiplier -= 0.15;
  } else if (totalCalsBurned >= 200 || totalMinutes >= 30) {
    multiplier -= 0.10;
  } else if (totalCalsBurned >= 100 || totalMinutes >= 15) {
    multiplier -= 0.05;
  }

  // Sleep: good sleep (7-9h) helps, poor sleep slows things
  if (factors.sleepHours >= 7 && factors.sleepHours <= 9) {
    multiplier -= 0.05; // optimal sleep
  } else if (factors.sleepHours < 5) {
    multiplier += 0.10; // poor sleep impairs metabolism
  } else if (factors.sleepHours < 7) {
    multiplier += 0.03; // suboptimal
  }

  // Hydration
  if (factors.hydration === 'high') {
    multiplier -= 0.05;
  } else if (factors.hydration === 'low') {
    multiplier += 0.08;
  }

  // Caffeine: stimulates lipolysis
  if (factors.caffeine) {
    multiplier -= 0.05;
  }

  // Clamp to reasonable range [0.70, 1.20]
  return Math.max(0.70, Math.min(1.20, multiplier));
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
  const merged = { ...DEFAULT_FACTORS, ...factors };
  const effects: string[] = [];
  const today = todayKey();
  const todayExercise = merged.exerciseEntries.filter((e) => e.date === today);
  const totalCals = todayExercise.reduce((sum, e) => sum + e.calories, 0);

  if (totalCals >= 400) {
    effects.push('Intense exercise: phases accelerated 15%');
  } else if (totalCals >= 200) {
    effects.push('Moderate exercise: phases accelerated 10%');
  } else if (totalCals >= 100) {
    effects.push('Light exercise: phases accelerated 5%');
  }

  if (merged.sleepHours >= 7 && merged.sleepHours <= 9) {
    effects.push('Good sleep: phases accelerated 5%');
  } else if (merged.sleepHours < 5) {
    effects.push('Poor sleep: phases delayed 10%');
  }

  if (merged.hydration === 'high') {
    effects.push('High hydration: phases accelerated 5%');
  } else if (merged.hydration === 'low') {
    effects.push('Low hydration: phases delayed 8%');
  }

  if (merged.caffeine) {
    effects.push('Caffeine: phases accelerated 5%');
  }

  return effects;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
