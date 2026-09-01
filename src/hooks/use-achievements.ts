import { useCallback, useMemo } from 'react';
import { useAppState } from '../context/app-context';
import { getUnlockedAchievements } from '../utils/achievements';

/**
 * Unlocked achievements are derived from state; only the ids the user
 * has already celebrated are persisted. `newlyUnlocked` is the diff to
 * show in the celebration modal.
 */
export function useAchievements() {
  const { state, dispatch } = useAppState();

  const unlocked = useMemo(() => getUnlockedAchievements(state), [state]);

  const newlyUnlocked = useMemo(
    () => [...unlocked].filter((id) => !state.gamification.seenAchievements.includes(id)),
    [unlocked, state.gamification.seenAchievements]
  );

  const markSeen = useCallback(
    (ids: string[]) => {
      if (ids.length > 0) dispatch({ type: 'MARK_ACHIEVEMENTS_SEEN', payload: { ids } });
    },
    [dispatch]
  );

  return { unlocked, newlyUnlocked, markSeen };
}
