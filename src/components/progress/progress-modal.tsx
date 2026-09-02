import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, CheckCircle2, Snowflake, Star, Dumbbell } from 'lucide-react';
import { Modal } from '../ui/modal';
import { BodyAvatar } from './body-avatar';
import { AchievementGallery } from './achievement-gallery';
import { ACHIEVEMENTS } from '../../constants/achievements';
import { useAppState } from '../../context/app-context';
import { getAvatarModel, TRAINING_WINDOW_DAYS } from '../../utils/body-avatar';
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
  // How visible the abs are right now: leanness gated, boosted by training (mirrors the avatar's shading)
  const definition = Math.pow(1 - avatar.currentFatLevel, 1.6) * (0.35 + 0.65 * avatar.muscleLevel);
  const definitionHint =
    definition >= 0.75
      ? 'Six-pack unlocked — keep it up!'
      : avatar.muscleLevel < 0.5 && avatar.currentFatLevel > 0.4
        ? 'Train more and lean out to reveal your six-pack'
        : avatar.muscleLevel < 0.5
          ? 'Log workouts to build definition'
          : 'Keep leaning out — the abs are coming through';

  return (
    <Modal open={open} onClose={onClose} title="Your Progress">
      <div className="space-y-5">
        {/* Avatar: now vs goal */}
        {avatar.status === 'no-weight' ? (
          <div className="text-center py-2">
            <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} muscle={avatar.muscleLevel} size={150} level={levelInfo.level} />
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
            <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} muscle={avatar.muscleLevel} size={150} level={levelInfo.level} />
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
                <BodyAvatar fatLevel={avatar.currentFatLevel} gender={avatar.gender} mood={avatar.mood} muscle={avatar.muscleLevel} size={150} level={levelInfo.level} />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Now</p>
                <p className="text-xs text-gray-400">{formatKg(avatar.currentWeightKg)}</p>
              </div>
              <div className="text-center">
                {/* Goal avatar stays bare (accessories are earned "now" status) but shows the trained physique you're working toward */}
                <BodyAvatar fatLevel={avatar.goalFatLevel ?? 0} gender={avatar.gender} mood="joy" muscle={Math.max(avatar.muscleLevel, 0.8)} size={150} />
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

        {/* Muscle definition — the six-pack meter */}
        {avatar.status !== 'no-weight' && (
          <div className="bg-orange-50 dark:bg-orange-900/15 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Dumbbell size={15} className="text-orange-500" />
                Muscle definition
              </p>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">{Math.round(definition * 100)}%</p>
            </div>
            <div className="w-full h-2 bg-orange-100 dark:bg-orange-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${definition * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {definitionHint} · {avatar.trainingSessions} session{avatar.trainingSessions === 1 ? '' : 's'} in {TRAINING_WINDOW_DAYS} days
            </p>
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
