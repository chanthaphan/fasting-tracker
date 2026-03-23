import { useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import type { WeightEntry, WeightGoal } from '../../types';

interface WeightChartProps {
  entries: WeightEntry[];
  weightGoal?: WeightGoal | null;
}

const W = 400;
const H = 200;
const PAD = { top: 20, right: 15, bottom: 28, left: 40 };

export function WeightChart({ entries, weightGoal }: WeightChartProps) {
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
  const allWeights = [...weights];

  // Include goal weight in range calculation
  if (weightGoal) {
    allWeights.push(weightGoal.targetWeight);
    allWeights.push(weightGoal.startWeight);
  }

  const minW = Math.floor(Math.min(...allWeights) - 1);
  const maxW = Math.ceil(Math.max(...allWeights) + 1);
  const rangeW = maxW - minW || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toY = (w: number) => PAD.top + chartH - ((w - minW) / rangeW) * chartH;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: toY(d.weight),
    weight: d.weight,
    date: d.date,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${points[0].x},${PAD.top + chartH} ${points.map((p) => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${PAD.top + chartH} Z`;

  const unit = data[0]?.unit ?? 'kg';

  // Calculate expected trend line from goal
  const expectedPoints = useMemo(() => {
    if (!weightGoal) return null;

    const goalStartDate = parseISO(weightGoal.startDate);
    const goalEndDate = parseISO(weightGoal.targetDate);
    const totalDays = differenceInDays(goalEndDate, goalStartDate);
    if (totalDays <= 0) return null;

    // Generate expected weight for each data point's date
    const pts: { x: number; y: number }[] = [];

    // Expected weight at a given date
    const expectedAt = (date: Date): number => {
      const daysSinceStart = differenceInDays(date, goalStartDate);
      const progress = Math.max(0, Math.min(1, daysSinceStart / totalDays));
      return weightGoal.startWeight + (weightGoal.targetWeight - weightGoal.startWeight) * progress;
    };

    // Map expected line to same x positions as data points
    for (let i = 0; i < data.length; i++) {
      const date = parseISO(data[i].date);
      const expectedWeight = expectedAt(date);
      pts.push({
        x: PAD.left + (i / (data.length - 1)) * chartW,
        y: toY(expectedWeight),
      });
    }

    return pts;
  }, [weightGoal, data, chartW, chartH, minW, rangeW]);

  // Goal line (horizontal dashed line at target weight)
  const goalY = weightGoal ? toY(weightGoal.targetWeight) : null;

  return (
    <div>
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

        {/* Goal target line (dashed) */}
        {goalY !== null && (
          <>
            <line
              x1={PAD.left}
              y1={goalY}
              x2={W - PAD.right}
              y2={goalY}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="6,3"
              opacity={0.7}
            />
            <text
              x={W - PAD.right}
              y={goalY - 4}
              textAnchor="end"
              className="text-[9px]"
              fill="#f59e0b"
            >
              Goal {weightGoal!.targetWeight}{unit}
            </text>
          </>
        )}

        {/* Expected trend line (dashed) */}
        {expectedPoints && (
          <polyline
            points={expectedPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4,4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        )}

        {/* Actual area fill */}
        <path d={areaPath} className="fill-brand-500/10 dark:fill-brand-400/10" />

        {/* Actual trend line */}
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

      {/* Legend */}
      {weightGoal && (
        <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-brand-500 dark:bg-brand-400 rounded" />
            Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 rounded" style={{ borderTop: '1.5px dashed #f59e0b' }} />
            Expected
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 rounded" style={{ borderTop: '1px dashed #f59e0b' }} />
            Goal
          </span>
        </div>
      )}
    </div>
  );
}
