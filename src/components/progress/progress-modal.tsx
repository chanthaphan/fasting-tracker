import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, CheckCircle2, Snowflake, Star } from 'lucide-react';
import { Modal } from '../ui/modal';
import { BodyAvatar } from './body-avatar';
import { AchievementGallery } from './achievement-gallery';
import { ACHIEVEMENTS } from '../../constants/achievements';
import { useAppState } from '../../context/app-context';
import { getAvatarModel } from '../../utils/body-avatar';
import { computeXp, getLevelInfo } from '../../utils/xp';
import { computeStreaks } from '../../utils/fasting-streak';
import { computeStreaksWithFreeze } from '../../utils/streaks';

interface ProgressModalProps {
  open: boolean;
  onClose: () => void;
  unlocked: Set<string>;
}

export function ProgressModal({ open, onClose, unlocked }: ProgressModalProps) {
  const { state } = useAppState();
  const navigate = useNavigate();

  const avatar = useMemo(() => getAvatarModel(state), [state]);
  const levelInfo = useMemo(() => getLevelInfo(computeXp(state)), [state]);
  const fastStreak = useMemo(() => computeStreaks(state.fastingSessions), [state.fastingSessions]);
  const checkInStreak = useMemo(
    () => computeStreaksWithFreeze(state.gamification.checkIns),
    [state.gamification.checkIns]
  );

  const formatKg = (kg: number | null) => (kg === null ? '—' : `${Math.round(kg * 10) / 10} kg`);

  return (
    <Modal open={open} onClose={onClose} title="Your Progress">
      <div className="space-y-5">
        {/* Avatar: now vs goal */}
        {avatar.status === 'no-weight' ? (
          <div className="text-center py-2">
            <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} size={150} level={levelInfo.level} />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Log your weight to bring your avatar to life
            </p>
            <button
              onClick={() => { onClose(); navigate('/weight'); }}
              className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400"
            >
              Log weight
            </button>
          </div>
        ) : avatar.status === 'no-goal' ? (
          <div className="text-center py-2">
            <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} size={150} level={levelInfo.level} />
            <p className="text-xs text-gray-400 mt-1">{formatKg(avatar.currentWeightKg)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Set a weight goal to see your future self
            </p>
            <button
              onClick={() => { onClose(); navigate('/weight'); }}
              className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400"
            >
              Set goal
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                {/* Goal avatar stays bare — accessories are earned "now" status */}
                <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} size={150} level={levelInfo.level} />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Now</p>
                <p className="text-xs text-gray-400">{formatKg(avatar.currentWeightKg)}</p>
              </div>
              <div className="text-center">
                <BodyAvatar fatLevel={avatar.goalFatLevel ?? 0} gender={avatar.gender} mood="joy" size={150} />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Goal</p>
                <p className="text-xs text-gray-400">{formatKg(avatar.targetWeightKg)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Goal progress</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">{Math.round(avatar.progress * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${avatar.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Level + XP */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Star size={15} className="text-yellow-500" />
              Level {levelInfo.level} · {levelInfo.title}
            </p>
            <p className="text-xs text-gray-400">{levelInfo.totalXp} XP total</p>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-500"
              style={{ width: `${(levelInfo.xpIntoLevel / levelInfo.xpForLevel) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {levelInfo.xpForLevel - levelInfo.xpIntoLevel} XP to level {levelInfo.level + 1}
          </p>
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <Flame size={16} className="mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{fastStreak.current}</p>
            <p className="text-[10px] text-gray-400">Fasting streak (best {fastStreak.longest})</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <CheckCircle2 size={16} className="mx-auto mb-1 text-brand-500" />
            <p className="text-lg font-bold">{checkInStreak.current}</p>
            <p className="text-[10px] text-gray-400">Check-in streak (best {checkInStreak.longest})</p>
            {checkInStreak.freezesHeld > 0 && (
              <p className="flex items-center justify-center gap-0.5 text-[10px] text-sky-500 dark:text-sky-400 mt-0.5">
                <Snowflake size={10} />
                {checkInStreak.freezesHeld} freeze{checkInStreak.freezesHeld > 1 ? 's' : ''} held
              </p>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Achievements · {unlocked.size}/{ACHIEVEMENTS.length}
          </p>
          <AchievementGallery unlocked={unlocked} />
        </div>
      </div>
    </Modal>
  );
}
