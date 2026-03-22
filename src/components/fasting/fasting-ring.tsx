import type { FastingPhase } from '../../types';

interface FastingRingProps {
  elapsedMs: number;
  phase: FastingPhase | null;
  isActive: boolean;
}

export function FastingRing({ elapsedMs, phase, isActive }: FastingRingProps) {
  const size = 240;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Progress over a 24h scale (wraps after 24h)
  const hours = elapsedMs / (1000 * 60 * 60);
  const progress = Math.min(hours / 24, 1);
  const offset = circumference * (1 - progress);

  const color = phase?.color ?? '#d1d5db';

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-800"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isActive ? offset : circumference}
          className="transition-phase"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isActive && phase ? (
          <>
            <div
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1"
              style={{ backgroundColor: phase.bgColor, color: phase.color }}
            >
              {phase.label}
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight">
              {formatTimer(elapsedMs)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{phase.description}</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-1">🍽️</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Not fasting</p>
          </>
        )}
      </div>
    </div>
  );
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
