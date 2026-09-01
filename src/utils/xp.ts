import type { AppState } from '../types';

export const XP_RULES = {
  checkIn: 10, // per check-in date
  fastCompleted: 25, // per completed fasting session
  fastTargetMet: 10, // bonus when the session reached its target hours
  weightLogDay: 15, // per distinct day with a weight entry
  foodLogDay: 10, // per distinct day with food logged
  workoutFinished: 20, // per finished workout session
} as const;

export const LEVEL_TITLES = [
  'Beginner',
  'Starter',
  'Committed',
  'Consistent',
  'Disciplined',
  'Athlete',
  'Champion',
  'Legend',
] as const;

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForLevel: number;
  totalXp: number;
}

type XpState = Pick<
  AppState,
  'fastingSessions' | 'weightEntries' | 'foodEntries' | 'workoutSessions' | 'gamification'
>;

/**
 * XP is always derived from the underlying data — never stored — so
 * imports and deletions recompute the total instead of drifting.
 * Logging is counted per distinct day (not per entry) to keep it spam-proof.
 */
export function computeXp(state: XpState): number {
  let xp = state.gamification.checkIns.length * XP_RULES.checkIn;

  for (const s of state.fastingSessions) {
    if (s.endTime === null) continue;
    xp += XP_RULES.fastCompleted;
    if (s.targetHours !== undefined && s.endTime - s.startTime >= s.targetHours * 3600000) {
      xp += XP_RULES.fastTargetMet;
    }
  }

  xp += new Set(state.weightEntries.map((e) => e.date)).size * XP_RULES.weightLogDay;
  xp += new Set(state.foodEntries.map((e) => e.date)).size * XP_RULES.foodLogDay;
  xp += state.workoutSessions.filter((s) => s.endTime !== null).length * XP_RULES.workoutFinished;

  return xp;
}

/** XP needed to go from level n to n+1. */
function levelCost(level: number): number {
  return 100 + (level - 1) * 50;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= levelCost(level)) {
    remaining -= levelCost(level);
    level++;
  }
  const titleIndex = Math.min(Math.floor((level - 1) / 3), LEVEL_TITLES.length - 1);
  return {
    level,
    title: LEVEL_TITLES[titleIndex],
    xpIntoLevel: remaining,
    xpForLevel: levelCost(level),
    totalXp: Math.max(0, totalXp),
  };
}
