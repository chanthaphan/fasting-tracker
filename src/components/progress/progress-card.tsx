import { useMemo, useState } from 'react';
import { CheckCircle2, Flame, Snowflake, Star, ChevronRight } from 'lucide-react';
import { BodyAvatar } from './body-avatar';
import { ProgressModal } from './progress-modal';
import { AchievementUnlockModal } from './achievement-unlock-modal';
import { useAppState } from '../../context/use-app-state';
import { useAchievements } from '../../hooks/use-achievements';
import { getAvatarModel } from '../../utils/body-avatar';
import { computeXp, getLevelInfo, XP_RULES } from '../../utils/xp';
import { computeStreaksWithFreeze } from '../../utils/streaks';
import { todayKey } from '../../utils/date-utils';

/**
 * Dashboard gamification card: avatar, level/XP, check-in streak and
 * the daily check-in button. Tapping the card opens the full progress
 * view; achievement unlocks celebrate from here as well.
 */
export function ProgressCard() {
  const { state, dispatch } = useAppState();
  const [detailOpen, setDetailOpen] = useState(false);
  const { unlocked, newlyUnlocked, markSeen } = useAchievements();

  const avatar = useMemo(() => getAvatarModel(state), [state]);
  const levelInfo = useMemo(() => getLevelInfo(computeXp(state)), [state]);
  const checkInStreak = useMemo(
    () => computeStreaksWithFreeze(state.gamification.checkIns),
    [state.gamification.checkIns]
  );
  const checkedInToday = state.gamification.checkIns.includes(todayKey());

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800">
        <div
          onClick={() => setDetailOpen(true)}
          className="flex items-center gap-4 cursor-pointer"
          role="button"
          aria-label="Open progress details"
        >
          <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} muscle={avatar.muscleLevel} size={96} level={levelInfo.level} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Star size={14} className="text-yellow-500" />
                Level {levelInfo.level} · {levelInfo.title}
              </p>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1.5 mb-2">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${(levelInfo.xpIntoLevel / levelInfo.xpForLevel) * 100}%` }}
              />
            </div>
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <Flame size={12} className="text-orange-500" />
              {checkInStreak.current > 0
                ? `${checkInStreak.current}-day check-in streak`
                : 'Check in daily to start a streak'}
              {checkInStreak.freezesHeld > 0 && (
                <span
                  className="flex items-center gap-0.5 ml-1 text-sky-500 dark:text-sky-400 font-medium"
                  title="Streak freezes held"
                >
                  <Snowflake size={12} />
                  ×{checkInStreak.freezesHeld}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'DAILY_CHECK_IN' })}
          disabled={checkedInToday}
          className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            checkedInToday
              ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
              : 'bg-brand-500 hover:bg-brand-600 text-white'
          }`}
        >
          <CheckCircle2 size={16} />
          {checkedInToday ? 'Checked in today ✓' : `Check in · +${XP_RULES.checkIn} XP`}
        </button>
      </div>

      <ProgressModal open={detailOpen} onClose={() => setDetailOpen(false)} unlocked={unlocked} />

      <AchievementUnlockModal
        open={newlyUnlocked.length > 0}
        ids={newlyUnlocked}
        onClose={() => markSeen(newlyUnlocked)}
      />
    </>
  );
}
