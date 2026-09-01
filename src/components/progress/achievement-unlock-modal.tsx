import { Modal } from '../ui/modal';
import { ACHIEVEMENTS, type AchievementTier } from '../../constants/achievements';

const TIER_BG: Record<AchievementTier, string> = {
  bronze: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500',
  silver: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300',
  gold: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500 dark:text-yellow-400',
};

interface AchievementUnlockModalProps {
  open: boolean;
  ids: string[];
  onClose: () => void;
}

/** Celebration shown when one or more achievements unlock. */
export function AchievementUnlockModal({ open, ids, onClose }: AchievementUnlockModalProps) {
  const defs = ACHIEVEMENTS.filter((a) => ids.includes(a.id));
  if (defs.length === 0) return null;

  return (
    <Modal open={open} onClose={onClose} title={defs.length === 1 ? 'Achievement Unlocked!' : `${defs.length} Achievements Unlocked!`}>
      <div className="space-y-3">
        {defs.map((a, i) => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 achievement-pop motion-reduce:animate-none"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${TIER_BG[a.tier]}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
              </div>
            </div>
          );
        })}
        <button
          onClick={onClose}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl transition-colors"
        >
          Awesome!
        </button>
      </div>
      <style>{`
        @keyframes achievement-pop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .achievement-pop { animation: achievement-pop 0.4s ease-out backwards; }
        @media (prefers-reduced-motion: reduce) {
          .achievement-pop { animation: none; }
        }
      `}</style>
    </Modal>
  );
}
