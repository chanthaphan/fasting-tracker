import { FASTING_PHASES } from '../constants/fasting-phases';
import type { FastingPhase } from '../types';

export function getPhaseForElapsed(elapsedMs: number): FastingPhase {
  const hours = elapsedMs / (1000 * 60 * 60);
  for (let i = FASTING_PHASES.length - 1; i >= 0; i--) {
    if (hours >= FASTING_PHASES[i].minHours) {
      return FASTING_PHASES[i];
    }
  }
  return FASTING_PHASES[0];
}

export function getPhaseProgress(elapsedMs: number, phase: FastingPhase): number {
  const hours = elapsedMs / (1000 * 60 * 60);
  const range = phase.maxHours === Infinity ? 24 : phase.maxHours - phase.minHours;
  const progress = (hours - phase.minHours) / range;
  return Math.min(Math.max(progress, 0), 1);
}
