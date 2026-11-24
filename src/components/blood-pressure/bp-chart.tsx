import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useT } from '../../i18n';
import type { BloodPressureEntry } from '../../types';
import { niceTicks } from '../../utils/chart-data';
import { sortBpNewestFirst } from '../../utils/blood-pressure';

const W = 400;
const H = 200;
const PAD = { top: 18, right: 34, bottom: 24, left: 34 };
const MAX_POINTS = 30;

/**
 * Systolic and diastolic over the most recent readings, oldest on the left.
 * Readings are spaced evenly (not by date), so a gap in logging doesn't
 * squash the days that do have data. Hover, touch or arrow keys read a point.
 */
export function BpChart({ entries }: { entries: BloodPressureEntry[] }) {
  const [active, setActive] = useState<number | null>(null);
  const { t, fmtDate } = useT();

  const data = useMemo(() => sortBpNewestFirst(entries).slice(0, MAX_POINTS).reverse(), [entries]);

  const model = useMemo(() => {
    if (data.length < 2) return null;
    const values = data.flatMap((d) => [d.systolic, d.diastolic]);
    const { ticks, min, max } = niceTicks(Math.min(...values) - 5, Math.max(...values) + 5, 4);
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
    const toY = (v: number) => PAD.top + chartH - ((v - min) / (max - min)) * chartH;
    const line = (pick: (d: BloodPressureEntry) => number) =>
      data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pick(d)).toFixed(1)}`).join(' ');
    return { ticks, toX, toY, sysPath: line((d) => d.systolic), diaPath: line((d) => d.diastolic), baseline: PAD.top + chartH };
  }, [data]);

  if (!model) {
    return <div className="text-center py-6 text-sm text-gray-400">{t('bp.needTwo')}</div>;
  }

  const { ticks, toX, toY, sysPath, diaPath, baseline } = model;
  const last = data.length - 1;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(toX(i) - x) < Math.abs(toX(best) - x)) best = i;
    setActive(best);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(last, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  const tip = active !== null ? (() => {
    const d = data[active];
    const title = `${fmtDate(d.date, 'weekdayShort')} · ${d.time}`;
    const body = `${d.systolic}/${d.diastolic}${d.pulse ? ` · ♥ ${d.pulse}` : ''}`;
    const width = Math.max(title.length, body.length) * 5.4 + 14;
    let x = toX(active) + 10;
    if (x + width > W - 4) x = toX(active) - 10 - width;
    return { x, y: PAD.top, width, title, body };
  })() : null;

  const sysClass = 'stroke-brand-600 dark:stroke-brand-400';
  const diaClass = 'stroke-rose-500 dark:stroke-rose-400';

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label={t('bp.chartAria')}
        tabIndex={0}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={toY(v)} y2={toY(v)} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
            <text x={PAD.left - 6} y={toY(v) + 3} textAnchor="end" className="fill-gray-400 text-[9px] tabular-nums">{v}</text>
          </g>
        ))}

        <path d={sysPath} fill="none" className={sysClass} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={diaPath} fill="none" className={diaClass} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => {
          if (data.length > 20 && i !== last && i !== active) return null;
          const r = i === active ? 4 : 3;
          return (
            <g key={d.id}>
              <circle cx={toX(i)} cy={toY(d.systolic)} r={r} className="fill-brand-600 dark:fill-brand-400" />
              <circle cx={toX(i)} cy={toY(d.diastolic)} r={r} className="fill-rose-500 dark:fill-rose-400" />
            </g>
          );
        })}

        {/* Latest values labelled at the line ends */}
        <text x={toX(last) + 6} y={toY(data[last].systolic) + 3} className="fill-brand-700 dark:fill-brand-300 text-[10px] font-semibold tabular-nums">{data[last].systolic}</text>
        <text x={toX(last) + 6} y={toY(data[last].diastolic) + 3} className="fill-rose-600 dark:fill-rose-300 text-[10px] font-semibold tabular-nums">{data[last].diastolic}</text>

        {active !== null && <line x1={toX(active)} x2={toX(active)} y1={PAD.top} y2={baseline} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth={1} />}

        <text x={PAD.left} y={H - 6} textAnchor="start" className="fill-gray-400 text-[9px]">{fmtDate(data[0].date, 'dayMonth')}</text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-gray-400 text-[9px]">{fmtDate(data[last].date, 'dayMonth')}</text>

        {tip && (
          <g pointerEvents="none">
            <rect x={tip.x} y={tip.y} width={tip.width} height={32} rx={4} className="fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} />
            <text x={tip.x + 7} y={tip.y + 12} className="fill-gray-400 text-[8px]">{tip.title}</text>
            <text x={tip.x + 7} y={tip.y + 25} className="fill-gray-800 dark:fill-gray-100 text-[10px] font-semibold tabular-nums">{tip.body}</text>
          </g>
        )}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 rounded bg-brand-600 dark:bg-brand-400" />{t('bp.legendSys')}</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 rounded bg-rose-500 dark:bg-rose-400" />{t('bp.legendDia')}</span>
      </div>
    </div>
  );
}
