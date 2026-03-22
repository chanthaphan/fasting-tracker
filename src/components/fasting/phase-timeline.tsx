import { FASTING_PHASES } from '../../constants/fasting-phases';

interface PhaseTimelineProps {
  elapsedMs: number;
  isActive: boolean;
}

export function PhaseTimeline({ elapsedMs, isActive }: PhaseTimelineProps) {
  const hours = elapsedMs / (1000 * 60 * 60);

  return (
    <div className="space-y-1">
      {FASTING_PHASES.map((phase) => {
        const isCurrentPhase = isActive && hours >= phase.minHours && hours < phase.maxHours;
        const isPast = isActive && hours >= phase.maxHours;

        return (
          <div
            key={phase.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isCurrentPhase
                ? 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700'
                : ''
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                isCurrentPhase ? 'scale-125 ring-4 ring-opacity-30' : ''
              }`}
              style={{
                backgroundColor: isPast || isCurrentPhase ? phase.color : '#d1d5db',
                boxShadow: isCurrentPhase ? `0 0 0 4px ${phase.color}40` : undefined,
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  isPast ? 'text-gray-400 dark:text-gray-500' : isCurrentPhase ? '' : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {phase.label}
                </span>
                <span className="text-xs text-gray-400">
                  {phase.minHours}h{phase.maxHours !== Infinity ? ` - ${phase.maxHours}h` : '+'}
                </span>
              </div>
              {isCurrentPhase && (
                <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
