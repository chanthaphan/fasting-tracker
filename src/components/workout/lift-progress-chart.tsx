import { useMemo } from 'react';
import type { LiftHistoryPoint } from '../../utils/workout-stats';

const W = 320;
const H = 120;
const PAD = { top: 10, right: 10, bottom: 18, left: 34 };

interface LiftProgressChartProps {
  history: LiftHistoryPoint[];
}

/** Est-1RM over time — same hand-rolled SVG style as the weight chart. */
export function LiftProgressChart({ history }: LiftProgressChartProps) {
  const points = useMemo(() => history.slice(-30), [history]);

  if (points.length < 2) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Log at least 2 sessions of this lift to see progress
      </p>
    );
  }

  const values = points.map((p) => p.est1Rm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toX = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom);

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.est1Rm)}`).join(' ');
  const area = `${PAD.left},${H - PAD.bottom} ${polyline} ${toX(points.length - 1)},${H - PAD.bottom}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Estimated 1RM progress chart">
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + f * (H - PAD.top - PAD.bottom)}
          y2={PAD.top + f * (H - PAD.top - PAD.bottom)}
          className="stroke-gray-100 dark:stroke-gray-800"
          strokeWidth="1"
        />
      ))}
      <polygon points={area} className="fill-orange-500/10" />
      <polyline points={polyline} fill="none" className="stroke-orange-500" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.est1Rm)} r="2.5" className="fill-orange-500" />
      ))}
      <text x={PAD.left - 4} y={toY(max) + 3} textAnchor="end" className="fill-gray-400 text-[9px]">
        {Math.round(max)}
      </text>
      <text x={PAD.left - 4} y={toY(min) + 3} textAnchor="end" className="fill-gray-400 text-[9px]">
        {Math.round(min)}
      </text>
      <text x={PAD.left} y={H - 4} className="fill-gray-400 text-[9px]">
        {points[0].date.slice(5)}
      </text>
      <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-gray-400 text-[9px]">
        {points[points.length - 1].date.slice(5)}
      </text>
    </svg>
  );
}
