import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { format, parseISO, startOfDay, addDays } from 'date-fns';
import type { WeightEntry, WeightGoal } from '../../types';
import { niceTicks, linearTrend } from '../../utils/chart-data';
import { convertWeight } from '../../utils/units';

interface WeightChartProps {
  entries: WeightEntry[];
  weightGoal?: WeightGoal | null;
}

const W = 400;
const H = 220;
const PAD = { top: 22, right: 18, bottom: 26, left: 40 };
const DAY_MS = 86400000;
const MAX_POINTS = 60;

const dayStart = (key: string) => startOfDay(parseISO(key)).getTime();
const fmtW = (w: number) => (Math.round(w * 10) / 10).toString();

/**
 * Weight over time on a real date axis that runs all the way to the goal
 * date, so the plan line visibly lands on the target weight. Shows the
 * logged weights, the straight-line plan from the goal's start to its
 * target, the target as a reference line, today, and where the recent
 * pace is heading.
 */
export function WeightChart({ entries, weightGoal: rawGoal }: WeightChartProps) {
  const [active, setActive] = useState<number | null>(null);

  // Plot everything in the unit of the latest entry, converting older entries and the goal
  const data = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_POINTS);
    const unit = sorted[sorted.length - 1]?.unit ?? 'kg';
    return sorted.map((e) => ({ ...e, weight: convertWeight(e.weight, e.unit, unit), unit }));
  }, [entries]);
  const displayUnit = data[data.length - 1]?.unit ?? 'kg';
  const goalInUnit = useMemo(
    () =>
      rawGoal
        ? {
            ...rawGoal,
            startWeight: convertWeight(rawGoal.startWeight, rawGoal.unit, displayUnit),
            targetWeight: convertWeight(rawGoal.targetWeight, rawGoal.unit, displayUnit),
            unit: displayUnit,
          }
        : rawGoal,
    [rawGoal, displayUnit]
  );

  const model = useMemo(() => {
    const weightGoal = goalInUnit;
    if (data.length < 2) return null;
    const today = startOfDay(new Date()).getTime();
    const firstT = dayStart(data[0].date);
    const lastT = dayStart(data[data.length - 1].date);
    const goalStartT = weightGoal ? dayStart(weightGoal.startDate) : null;
    const goalEndT = weightGoal ? dayStart(weightGoal.targetDate) : null;

    // Time domain: from the first shown weight (or the goal start) to the goal date (or today)
    const t0 = Math.min(firstT, goalStartT ?? firstT);
    let t1 = Math.max(lastT, today, goalEndT ?? lastT);
    if (t1 - t0 < 6 * DAY_MS) t1 = t0 + 6 * DAY_MS;

    // Value domain: every logged weight plus the goal's start and target, on clean ticks
    const ws = data.map((d) => d.weight);
    if (weightGoal) ws.push(weightGoal.startWeight, weightGoal.targetWeight);
    const { ticks, min: yMin, max: yMax } = niceTicks(Math.min(...ws) - 0.5, Math.max(...ws) + 0.5, 4);

    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const toX = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * chartW;
    const toY = (w: number) => PAD.top + chartH - ((w - yMin) / (yMax - yMin)) * chartH;

    const points = data.map((d) => ({ t: dayStart(d.date), x: toX(dayStart(d.date)), y: toY(d.weight), weight: d.weight, date: d.date }));

    // Plan: straight line from goal start to target, then flat at the target
    let plan: { x: number; y: number }[] | null = null;
    const planAt = (t: number): number | null => {
      if (!weightGoal || goalStartT === null || goalEndT === null || goalEndT <= goalStartT) return null;
      const p = Math.max(0, Math.min(1, (t - goalStartT) / (goalEndT - goalStartT)));
      return weightGoal.startWeight + (weightGoal.targetWeight - weightGoal.startWeight) * p;
    };
    if (weightGoal && goalStartT !== null && goalEndT !== null && goalEndT > goalStartT) {
      plan = [
        { x: toX(goalStartT), y: toY(weightGoal.startWeight) },
        { x: toX(goalEndT), y: toY(weightGoal.targetWeight) },
      ];
      if (t1 > goalEndT) plan.push({ x: toX(t1), y: toY(weightGoal.targetWeight) });
    }

    // Pace: least-squares line over the last 14 logged weights, projected to the end of the axis
    const recent = points.slice(-14);
    const fit = recent.length >= 3 ? linearTrend(recent.map((p) => ({ t: p.t / DAY_MS, v: p.weight }))) : null;
    let projection: { x1: number; y1: number; x2: number; y2: number } | null = null;
    let paceDate: string | null = null;
    let paceHeading: 'toward' | 'away' | 'flat' | null = null;
    if (fit && lastT < t1) {
      const last = points[points.length - 1];
      const wAtEnd = fit.intercept + fit.slope * (t1 / DAY_MS);
      // Draw from the last real point, clamped to the plotted value range
      const clampedW = Math.max(yMin, Math.min(yMax, wAtEnd));
      const tEnd = fit.slope === 0 ? t1 : Math.min(t1, ((clampedW - fit.intercept) / fit.slope) * DAY_MS);
      projection = { x1: last.x, y1: last.y, x2: toX(Math.max(lastT, tEnd)), y2: toY(clampedW) };
      if (weightGoal) {
        const toGo = weightGoal.targetWeight - last.weight;
        const perDay = fit.slope;
        if (Math.abs(perDay) < 0.005) paceHeading = 'flat';
        else if (Math.sign(perDay) !== Math.sign(toGo) && toGo !== 0) paceHeading = 'away';
        else {
          paceHeading = 'toward';
          const days = toGo / perDay;
          if (days >= 0 && days < 365 * 3) paceDate = format(addDays(lastT, Math.ceil(days)), 'MMM d, yyyy');
        }
      }
    }

    const todayX = today >= t0 && today <= t1 ? toX(today) : null;
    const unit = data[data.length - 1].unit;

    return { t0, t1, ticks, yMin, yMax, chartW, chartH, toX, toY, points, plan, planAt, projection, paceDate, paceHeading, todayX, unit, goalEndT };
  }, [data, goalInUnit]);

  if (!model) {
    return (
      <div className="text-center py-6 text-gray-400">
        <p className="text-sm">Log at least 2 weights to see trends</p>
      </div>
    );
  }

  const { ticks, chartW, chartH, toY, points, plan, planAt, projection, paceDate, paceHeading, todayX, unit, t0, t1, goalEndT } = model;
  const weightGoal = goalInUnit;
  const baseline = PAD.top + chartH;
  const last = points[points.length - 1];
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${last.x.toFixed(1)},${baseline} L${points[0].x.toFixed(1)},${baseline} Z`;
  const goalY = weightGoal ? toY(weightGoal.targetWeight) : null;

  // Nearest logged point to the pointer's x
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].x - x) < Math.abs(points[best].x - x)) best = i;
    setActive(best);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? points.length) - 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  // X labels: start, today (when it isn't crowding an end), and the end (the goal date when there is one)
  const endIsGoal = goalEndT !== null && goalEndT === t1;
  const xLabels: { x: number; text: string; anchor: 'start' | 'middle' | 'end' }[] = [
    { x: PAD.left, text: format(t0, 'MMM d'), anchor: 'start' },
    { x: W - PAD.right, text: endIsGoal ? `Target · ${format(t1, 'MMM d')}` : format(t1, 'MMM d'), anchor: 'end' },
  ];
  if (todayX !== null && todayX - PAD.left > chartW * 0.14 && W - PAD.right - todayX > chartW * 0.2) {
    xLabels.push({ x: todayX, text: 'Today', anchor: 'middle' });
  }

  const tip = active !== null ? (() => {
    const p = points[active];
    const planW = planAt(p.t);
    const lines = [`${fmtW(p.weight)} ${unit}`];
    if (planW !== null) {
      const diff = p.weight - planW;
      lines.push(`Plan ${fmtW(planW)} · ${diff > 0 ? '+' : ''}${fmtW(diff)}`);
    }
    const title = format(parseISO(p.date), 'EEE, MMM d');
    const width = Math.max(title.length, ...lines.map((l) => l.length)) * 5.4 + 14;
    const boxH = 8 + 11 * (lines.length + 1);
    let x = p.x + 10;
    if (x + width > W - PAD.right) x = p.x - 10 - width;
    const y = Math.max(2, Math.min(H - PAD.bottom - boxH, p.y - boxH - 8));
    return { x, y, width, boxH, title, lines };
  })() : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label={`Weight over time${weightGoal ? `, with the plan to reach ${weightGoal.targetWeight} ${weightGoal.unit} by ${format(parseISO(weightGoal.targetDate), 'MMM d, yyyy')}` : ''}`}
        tabIndex={0}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        {/* Grid + y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(t)} y2={toY(t)} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
            <text x={PAD.left - 6} y={toY(t) + 3} textAnchor="end" className="fill-gray-400 text-[9px] tabular-nums">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={baseline} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} />

        {/* Today */}
        {todayX !== null && (
          <line x1={todayX} x2={todayX} y1={PAD.top - 4} y2={baseline} className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={1} />
        )}

        {/* Target reference */}
        {goalY !== null && (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={goalY} y2={goalY} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5,3" opacity={0.85} />
            <text x={PAD.left + 4} y={goalY - 4} textAnchor="start" className="fill-gray-500 dark:fill-gray-400 text-[9px] font-semibold">
              Target {weightGoal!.targetWeight} {unit}
            </text>
          </g>
        )}

        {/* Plan */}
        {plan && (
          <polyline points={plan.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
        )}

        {/* Pace projection */}
        {projection && (
          <line x1={projection.x1} y1={projection.y1} x2={projection.x2} y2={projection.y2} className="stroke-brand-600 dark:stroke-brand-400" strokeWidth={1.5} strokeDasharray="2,4" strokeLinecap="round" opacity={0.7} />
        )}

        {/* Actual */}
        <path d={areaPath} className="fill-brand-600/10 dark:fill-brand-400/10" />
        <path d={linePath} fill="none" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const show = points.length <= 20 || i === points.length - 1 || i === active;
          if (!show) return null;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={i === active ? 5.5 : 4} className="fill-white dark:fill-gray-900" />
              <circle cx={p.x} cy={p.y} r={i === active ? 3.5 : 2.5} className="fill-brand-600 dark:fill-brand-400" />
            </g>
          );
        })}
        {/* Direct label on the latest weight only */}
        {active === null && (
          <text x={last.x + (W - PAD.right - last.x < 40 ? -8 : 8)} y={last.y - 7} textAnchor={W - PAD.right - last.x < 40 ? 'end' : 'start'} className="fill-gray-700 dark:fill-gray-200 text-[10px] font-semibold tabular-nums">
            {fmtW(last.weight)} {unit}
          </text>
        )}

        {/* Crosshair */}
        {active !== null && (
          <line x1={points[active].x} x2={points[active].x} y1={PAD.top} y2={baseline} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth={1} />
        )}

        {/* X labels */}
        {xLabels.map((l) => (
          <text key={l.text} x={l.x} y={H - 6} textAnchor={l.anchor} className={`text-[9px] ${l.text === 'Today' ? 'fill-gray-500 dark:fill-gray-400 font-semibold' : 'fill-gray-400'}`}>
            {l.text}
          </text>
        ))}

        {/* Tooltip */}
        {tip && (
          <g pointerEvents="none">
            <rect x={tip.x} y={tip.y} width={tip.width} height={tip.boxH} rx={4} className="fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} />
            <text x={tip.x + 7} y={tip.y + 12} className="fill-gray-400 text-[8px]">{tip.title}</text>
            {tip.lines.map((l, li) => (
              <text key={li} x={tip.x + 7} y={tip.y + 23 + li * 11} className={`text-[9px] tabular-nums ${li === 0 ? 'fill-gray-800 dark:fill-gray-100 font-semibold' : 'fill-gray-500 dark:fill-gray-400'}`}>
                {l}
              </text>
            ))}
          </g>
        )}
      </svg>

      {/* Legend: three series once a goal exists */}
      {weightGoal && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 rounded bg-brand-600 dark:bg-brand-400" />Logged</span>
          {projection && <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dotted border-brand-600 dark:border-brand-400" />Current pace</span>}
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-[1.5px]" style={{ borderColor: '#f59e0b', opacity: 0.7 }} />Plan</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed" style={{ borderColor: '#f59e0b' }} />Target</span>
        </div>
      )}

      {/* Pace caption */}
      {weightGoal && paceHeading && (
        <p className="text-[11px] text-center mt-2 text-gray-500 dark:text-gray-400">
          {paceHeading === 'toward' && paceDate && <>At your current pace you reach <span className="font-semibold text-gray-700 dark:text-gray-200">{weightGoal.targetWeight} {unit}</span> around <span className="font-semibold text-gray-700 dark:text-gray-200">{paceDate}</span></>}
          {paceHeading === 'toward' && !paceDate && <>Your recent pace is heading toward the target</>}
          {paceHeading === 'flat' && <>Your weight has been steady lately</>}
          {paceHeading === 'away' && <>Your recent pace is moving away from the target</>}
        </p>
      )}
    </div>
  );
}
