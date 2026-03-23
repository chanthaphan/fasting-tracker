import { useState } from 'react';
import type { FastingPhase } from '../../types';

interface FastingRingProps {
  elapsedMs: number;
  phase: FastingPhase | null;
  isActive: boolean;
  targetHours?: number;
  phases: FastingPhase[];
  startTime?: number;
}

export function FastingRing({ elapsedMs, phase, isActive, targetHours = 24, phases, startTime }: FastingRingProps) {
  const [showRemaining, setShowRemaining] = useState(false);

  const size = 260;
  const outerStroke = 18;
  const innerStroke = 6;
  const outerRadius = (size - outerStroke) / 2;
  const innerRadius = outerRadius - outerStroke / 2 - innerStroke / 2 - 2;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const hours = elapsedMs / (1000 * 60 * 60);
  const scale = Math.max(targetHours, phases[phases.length - 1]?.maxHours === Infinity ? targetHours : Math.min(targetHours, 72));
  const progress = isActive ? Math.min(hours / scale, 1) : 0;
  const progressOffset = outerCircumference * (1 - progress);

  const color = phase?.color ?? '#d1d5db';

  const remainingMs = Math.max(0, targetHours * 3600000 - elapsedMs);
  const isOverTarget = elapsedMs > targetHours * 3600000;

  const handleToggle = () => {
    if (isActive) setShowRemaining((v) => !v);
  };

  // Compute segment arcs for the inner phase ring
  const phaseSegments = phases.map((p) => {
    const startFraction = p.minHours / scale;
    const endHours = p.maxHours === Infinity ? scale : Math.min(p.maxHours, scale);
    const endFraction = endHours / scale;
    return {
      phase: p,
      startFraction: Math.min(startFraction, 1),
      endFraction: Math.min(endFraction, 1),
    };
  }).filter((s) => s.startFraction < 1);

  // Compute end time display
  const endTime = startTime ? new Date(startTime + targetHours * 3600000) : null;
  const endTimeStr = endTime
    ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className="relative flex items-center justify-center select-none"
      onClick={handleToggle}
      role={isActive ? 'button' : undefined}
      tabIndex={isActive ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
      aria-label={isActive ? 'Tap to toggle between elapsed and remaining time' : undefined}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Outer background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={outerStroke}
          className="text-gray-200 dark:text-gray-800"
        />

        {/* Inner phase segments ring */}
        {phaseSegments.map((seg) => {
          const segLength = seg.endFraction - seg.startFraction;
          const gap = 0.003; // small gap between segments
          const adjustedStart = seg.startFraction + (seg.startFraction > 0 ? gap / 2 : 0);
          const adjustedEnd = seg.endFraction - (seg.endFraction < 1 ? gap / 2 : 0);
          const adjustedLength = Math.max(0, adjustedEnd - adjustedStart);

          const isCurrent = isActive && phase?.id === seg.phase.id;
          const isPast = isActive && hours >= (seg.phase.maxHours === Infinity ? Infinity : seg.phase.maxHours);
          const isFuture = !isActive || hours < seg.phase.minHours;

          return (
            <circle
              key={seg.phase.id}
              cx={size / 2}
              cy={size / 2}
              r={innerRadius}
              fill="none"
              stroke={isFuture ? '#e5e7eb' : seg.phase.color}
              strokeWidth={isCurrent ? innerStroke + 3 : innerStroke}
              strokeDasharray={`${adjustedLength * innerCircumference} ${innerCircumference}`}
              strokeDashoffset={-adjustedStart * innerCircumference}
              opacity={isFuture ? 0.3 : isPast ? 0.5 : 1}
              className="transition-all duration-500"
            />
          );
        })}

        {/* Outer progress arc with glow */}
        {isActive && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={outerRadius}
              fill="none"
              stroke={color}
              strokeWidth={outerStroke + 4}
              strokeLinecap="round"
              strokeDasharray={outerCircumference}
              strokeDashoffset={progressOffset}
              opacity={0.15}
              className="transition-phase"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={outerRadius}
              fill="none"
              stroke={color}
              strokeWidth={outerStroke}
              strokeLinecap="round"
              strokeDasharray={outerCircumference}
              strokeDashoffset={progressOffset}
              className="transition-phase"
            />
          </>
        )}

        {/* Progress dot at the tip */}
        {isActive && progress > 0.01 && (
          <circle
            cx={size / 2 + outerRadius * Math.cos(2 * Math.PI * progress)}
            cy={size / 2 + outerRadius * Math.sin(2 * Math.PI * progress)}
            r={outerStroke / 2 + 1}
            fill={color}
            stroke="white"
            strokeWidth={2}
            className="transition-phase"
          />
        )}
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
              {showRemaining ? (
                isOverTarget ? (
                  <span className="text-green-500">+{formatTimer(elapsedMs - targetHours * 3600000)}</span>
                ) : (
                  formatTimer(remainingMs)
                )
              ) : (
                formatTimer(elapsedMs)
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
              {showRemaining
                ? isOverTarget
                  ? 'past target'
                  : `remaining · ends ${endTimeStr}`
                : 'elapsed · tap to toggle'
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[160px] text-center leading-tight">{phase.description}</p>
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
