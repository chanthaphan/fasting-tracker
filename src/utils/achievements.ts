import type { AppState } from '../types';
import { computeStreaks } from './fasting-streak';
import { computeStreaksWithFreeze } from './streaks';
import { getAvatarModel } from './body-avatar';
import { isMeaningfulFast } from './fasting-session';

type AchievementState = Pick<
  AppState,
  'fastingSessions' | 'weightEntries' | 'weightGoal' | 'userProfile' | 'workoutSessions' | 'gamification'
>;

/**
 * The unlocked set is always recomputed from the data — only the
 * "seen" (already celebrated) ids are persisted — so imports and
 * deletions self-heal instead of leaving stale unlocks behind.
 */
export function getUnlockedAchievements(state: AchievementState): Set<string> {
  const unlocked = new Set<string>();
  const hour = 3600000;

  const completedFasts = state.fastingSessions.filter(isMeaningfulFast);
  if (completedFasts.length > 0) unlocked.add('first-fast');
  if (completedFasts.some((s) => s.endTime! - s.startTime >= 16 * hour)) unlocked.add('fast-16h');
  if (completedFasts.some((s) => s.endTime! - s.startTime >= 24 * hour)) unlocked.add('fast-24h');

  const fastStreak = computeStreaks(state.fastingSessions);
  if (fastStreak.longest >= 3) unlocked.add('fast-streak-3');
  if (fastStreak.longest >= 7) unlocked.add('fast-streak-7');
  if (fastStreak.longest >= 14) unlocked.add('fast-streak-14');
  if (fastStreak.longest >= 30) unlocked.add('fast-streak-30');

  if (state.weightEntries.length > 0) unlocked.add('first-weight');
  if (new Set(state.weightEntries.map((e) => e.date)).size >= 7) unlocked.add('weight-7-days');

  const avatar = getAvatarModel(state);
  if (avatar.status === 'full') {
    if (avatar.progress >= 0.5) unlocked.add('goal-halfway');
    if (avatar.progress >= 1) unlocked.add('goal-reached');
  }

  // Freeze-aware, so the streak number shown on the card always matches the badge
  const checkInStreak = computeStreaksWithFreeze(state.gamification.checkIns);
  if (checkInStreak.longest >= 7) unlocked.add('checkin-7');
  if (checkInStreak.longest >= 30) unlocked.add('checkin-30');

  if (state.workoutSessions.some((s) => s.endTime !== null)) unlocked.add('first-workout');

  return unlocked;
}
