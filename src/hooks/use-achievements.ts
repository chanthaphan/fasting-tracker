import { useCallback, useMemo } from 'react';
import { useAppState } from '../context/use-app-state';
import { getUnlockedAchievements } from '../utils/achievements';

/**
 * Unlocked achievements are derived from state; only the ids the user
 * has already celebrated are persisted. `newlyUnlocked` is the diff to
 * show in the celebration modal.
 *
 * Anything already unlocked when the data loads (HYDRATE) or is restored
 * (IMPORT_DATA) is marked seen by the reducer, so only badges earned in
 * this session are celebrated, and nothing is shown before hydration.
 */
export function useAchievements() {
  const { state, dispatch } = useAppState();
  const { fastingSessions, weightEntries, weightGoal, userProfile, workoutSessions, gamification, hydrated } = state;

  const unlocked = useMemo(
    () => getUnlockedAchievements({ fastingSessions, weightEntries, weightGoal, userProfile, workoutSessions, gamification }),
    [fastingSessions, weightEntries, weightGoal, userProfile, workoutSessions, gamification]
  );

  const newlyUnlocked = useMemo(
    () => (hydrated ? [...unlocked].filter((id) => !gamification.seenAchievements.includes(id)) : []),
    [hydrated, unlocked, gamification.seenAchievements]
  );

  const markSeen = useCallback(
    (ids: string[]) => {
      if (ids.length > 0) dispatch({ type: 'MARK_ACHIEVEMENTS_SEEN', payload: { ids } });
    },
    [dispatch]
  );

  return { unlocked, newlyUnlocked, markSeen };
}
