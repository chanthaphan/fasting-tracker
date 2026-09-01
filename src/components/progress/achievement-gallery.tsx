import { ACHIEVEMENTS, type AchievementTier } from '../../constants/achievements';

const TIER_RING: Record<AchievementTier, string> = {
  bronze: 'ring-amber-600/60 text-amber-600 dark:text-amber-500',
  silver: 'ring-gray-400/70 text-gray-500 dark:text-gray-300',
  gold: 'ring-yellow-500/70 text-yellow-500 dark:text-yellow-400',
};

export function AchievementGallery({ unlocked }: { unlocked: Set<string> }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {ACHIEVEMENTS.map((a) => {
        const isUnlocked = unlocked.has(a.id);
        const Icon = a.icon;
        return (
          <div key={a.id} className="flex flex-col items-center text-center" title={`${a.title} — ${a.description}`}>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 ${
                isUnlocked
                  ? `ring-2 ${TIER_RING[a.tier]}`
                  : 'text-gray-300 dark:text-gray-600 grayscale opacity-40'
              }`}
            >
              <Icon size={22} />
            </div>
            <p className={`mt-1 text-[10px] leading-tight ${isUnlocked ? 'text-gray-600 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-600'}`}>
              {a.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
