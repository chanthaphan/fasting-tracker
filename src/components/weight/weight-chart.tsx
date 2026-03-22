import { useMemo } from 'react';
import { format } from 'date-fns';
import type { WeightEntry } from '../../types';

interface WeightChartProps {
  entries: WeightEntry[];
}

const W = 400;
const H = 180;
const PAD = { top: 20, right: 15, bottom: 28, left: 40 };

export function WeightChart({ entries }: WeightChartProps) {
  const data = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [entries]);

  if (data.length < 2) {
    return (
      <div className="text-center py-6 text-gray-400">
        <p className="text-sm">Log at least 2 weights to see trends</p>
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);
  const rangeW = maxW - minW || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.weight - minW) / rangeW) * chartH,
    weight: d.weight,
    date: d.date,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${PAD.top + chartH} ${points.map((p) => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${PAD.top + chartH} Z`;

  const unit = data[0]?.unit ?? 'kg';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = PAD.top + chartH - frac * chartH;
        return (
          <line
            key={frac}
            x1={PAD.left}
            y1={y}
            x2={W - PAD.right}
            y2={y}
            stroke="currentColor"
            className="text-gray-100 dark:text-gray-800"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Area fill */}
      <path d={areaPath} className="fill-brand-500/10 dark:fill-brand-400/10" />

      {/* Trend line */}
      <polyline
        points={polyline}
        fill="none"
        className="stroke-brand-500 dark:stroke-brand-400"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={data.length <= 15 ? 3 : 2}
          className="fill-brand-500 dark:fill-brand-400"
        />
      ))}

      {/* Y-axis labels */}
      <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
        {maxW}{unit}
      </text>
      <text x={PAD.left - 4} y={PAD.top + chartH + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
        {minW}{unit}
      </text>

      {/* X-axis labels */}
      <text x={points[0].x} y={H - 4} textAnchor="start" className="fill-gray-400 text-[10px]">
        {format(new Date(data[0].date + 'T00:00:00'), 'MMM d')}
      </text>
      <text x={points[points.length - 1].x} y={H - 4} textAnchor="end" className="fill-gray-400 text-[10px]">
        {format(new Date(data[data.length - 1].date + 'T00:00:00'), 'MMM d')}
      </text>
    </svg>
  );
}
