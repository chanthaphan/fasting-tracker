import { useId, useState, type KeyboardEvent } from 'react';
import { format, parseISO } from 'date-fns';

export interface BarSeries {
  name: string;
  /** Tailwind fill classes for light and dark surfaces, e.g. 'fill-brand-600 dark:fill-brand-400' */
  fill: string;
}

export interface BarSlot {
  key: string; // unique; a 'YYYY-MM-DD' key gets a full date in the tooltip
  label: string; // short axis label
  title?: string; // tooltip heading; defaults to the formatted date or the label
}

interface DailyBarsProps {
  slots: BarSlot[];
  series: BarSeries[];
  values: number[][]; // values[seriesIndex][slotIndex]
  unit?: string;
  goal?: { value: number; label: string } | null;
  emphasisKey?: string; // the slot drawn at full strength and direct-labeled (usually today)
  ariaLabel: string;
  formatValue?: (v: number) => string;
  height?: number;
  tableCaption?: string;
}

const W = 320;
const PAD = { top: 22, right: 10, bottom: 18, left: 30 };
const BAR_MAX = 24;
const GAP = 2;

const defaultFormat = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString() : `${Math.round(v * 10) / 10}`);

function roundedTop(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function slotTitle(slot: BarSlot) {
  if (slot.title) return slot.title;
  return /^\d{4}-\d{2}-\d{2}$/.test(slot.key) ? format(parseISO(slot.key), 'EEE, MMM d') : slot.label;
}

/**
 * Small column chart for daily totals: one hue per series, bars capped at
 * 24px with rounded caps, a 2px surface gap between stacked segments, a
 * dashed goal reference, an emphasised slot with a direct label, and a
 * hover/focus tooltip per bar. A data table sits under the chart so every
 * value is reachable without the pointer.
 */
export function DailyBars({
  slots,
  series,
  values,
  unit = '',
  goal = null,
  emphasisKey,
  ariaLabel,
  formatValue = defaultFormat,
  height = 130,
  tableCaption = 'Data table',
}: DailyBarsProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const H = height;
  // Reserve a right margin for the goal label so it never sits on a bar
  const goalLabelW = goal && goal.value > 0 ? Math.ceil(goal.label.length * 4.4) + 6 : 0;
  const right = PAD.right + goalLabelW;
  const chartW = W - PAD.left - right;
  const chartH = H - PAD.top - PAD.bottom;

  const totals = slots.map((_, i) => values.reduce((s, row) => s + (row[i] ?? 0), 0));
  const rawMax = Math.max(...totals, goal?.value ?? 0, 1);
  const step = rawMax <= 10 ? 2 : rawMax <= 50 ? 10 : rawMax <= 200 ? 50 : rawMax <= 1000 ? 250 : rawMax <= 4000 ? 500 : 1000;
  const yMax = Math.ceil((rawMax * 1.08) / step) * step;
  const toY = (v: number) => PAD.top + chartH - (v / yMax) * chartH;
  const baseline = PAD.top + chartH;

  const slotW = chartW / Math.max(1, slots.length);
  const barW = Math.min(BAR_MAX, slotW * 0.62);
  const barX = (i: number) => PAD.left + i * slotW + (slotW - barW) / 2;

  const hasEmphasis = emphasisKey !== undefined && slots.some((s) => s.key === emphasisKey);
  const ticks = [yMax / 2, yMax];

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(slots.length - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? slots.length) - 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  const tooltip = active !== null ? buildTooltip(active) : null;

  function buildTooltip(i: number) {
    const lines = series.map((s, si) => `${formatValue(values[si][i] ?? 0)}${unit ? ` ${unit}` : ''}${series.length > 1 ? ` ${s.name}` : ''}`);
    const title = slotTitle(slots[i]);
    const width = Math.max(title.length, ...lines.map((l) => l.length)) * 5.4 + 14;
    const rowH = 11;
    const boxH = 8 + rowH * (lines.length + 1);
    let x = barX(i) + barW / 2 - width / 2;
    x = Math.max(PAD.left - 24, Math.min(W - right - width + 24, x));
    return { x, y: 2, width, boxH, rowH, title, lines };
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {/* Grid: hairline, solid, recessive */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - right} y1={toY(t)} y2={toY(t)} className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
            <text x={PAD.left - 5} y={toY(t) + 3} textAnchor="end" className="fill-gray-400 text-[9px] tabular-nums">
              {formatValue(t)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - right} y1={baseline} y2={baseline} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} />

        {/* Bars */}
        {slots.map((slot, i) => {
          const emphasised = !hasEmphasis || slot.key === emphasisKey || active === i;
          let cursor = baseline;
          const segments = series.map((s, si) => {
            const v = values[si][i] ?? 0;
            const h = (v / yMax) * chartH;
            const top = cursor - h;
            const seg = { s, v, top, h };
            cursor = top;
            return seg;
          });
          const topIndex = segments.map((seg) => seg.v > 0).lastIndexOf(true);
          return (
            <g
              key={slot.key}
              className={emphasised ? '' : 'opacity-45'}
              onPointerEnter={() => setActive(i)}
              onPointerMove={() => setActive(i)}
              onClick={() => setActive((a) => (a === i ? null : i))}
            >
              {/* Hit target: the whole slot, not just the painted bar */}
              <rect x={PAD.left + i * slotW} y={PAD.top} width={slotW} height={chartH} fill="transparent" />
              {segments.map((seg, si) => {
                if (seg.v <= 0) return null;
                const isTop = si === topIndex;
                const gap = isTop ? 0 : GAP;
                const h = Math.max(0, seg.h - gap);
                return isTop ? (
                  <path key={si} d={roundedTop(barX(i), seg.top, barW, seg.h)} className={seg.s.fill} />
                ) : (
                  <rect key={si} x={barX(i)} y={seg.top + gap} width={barW} height={h} className={seg.s.fill} />
                );
              })}
              {active === i && totals[i] > 0 && (
                <path d={roundedTop(barX(i) - 1, toY(totals[i]) - 1, barW + 2, (totals[i] / yMax) * chartH + 1)} fill="none" className="stroke-gray-900/40 dark:stroke-white/50" strokeWidth={1} />
              )}
              <text x={barX(i) + barW / 2} y={H - 5} textAnchor="middle" className={`text-[9px] ${slot.key === emphasisKey ? 'fill-gray-700 dark:fill-gray-200 font-semibold' : 'fill-gray-400'}`}>
                {slot.label}
              </text>
              {slot.key === emphasisKey && totals[i] > 0 && active === null && (
                <text x={barX(i) + barW / 2} y={toY(totals[i]) - 4} textAnchor="middle" className="fill-gray-600 dark:fill-gray-300 text-[9px] font-semibold tabular-nums">
                  {formatValue(totals[i])}
                </text>
              )}
            </g>
          );
        })}

        {/* Goal reference */}
        {goal && goal.value > 0 && (
          <g>
            <line x1={PAD.left} x2={W - right} y1={toY(goal.value)} y2={toY(goal.value)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" opacity={0.8} />
            <text x={W - right + 4} y={toY(goal.value) + 3} textAnchor="start" className="fill-gray-500 dark:fill-gray-400 text-[8px] font-medium">
              {goal.label}
            </text>
          </g>
        )}

        {/* Tooltip */}
        {tooltip && (
          <g pointerEvents="none">
            <rect x={tooltip.x} y={tooltip.y} width={tooltip.width} height={tooltip.boxH} rx={4} className="fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} />
            <text x={tooltip.x + 7} y={tooltip.y + 12} className="fill-gray-400 text-[8px]">{tooltip.title}</text>
            {tooltip.lines.map((l, li) => (
              <g key={li}>
                {series.length > 1 && (
                  <line x1={tooltip.x + 7} x2={tooltip.x + 13} y1={tooltip.y + 12 + tooltip.rowH * (li + 1) - 3} y2={tooltip.y + 12 + tooltip.rowH * (li + 1) - 3} className={series[li].fill.replace(/fill-/g, 'stroke-')} strokeWidth={2} />
                )}
                <text x={tooltip.x + (series.length > 1 ? 17 : 7)} y={tooltip.y + 12 + tooltip.rowH * (li + 1)} className="fill-gray-800 dark:fill-gray-100 text-[9px] font-semibold tabular-nums">
                  {l}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>

      {series.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-1 text-[10px] text-gray-400">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1">
              <svg width={10} height={10} aria-hidden><rect width={10} height={10} rx={2} className={s.fill} /></svg>
              {s.name}
            </span>
          ))}
        </div>
      )}

      <details className="mt-1">
        <summary className="text-[10px] text-gray-400 cursor-pointer select-none">{tableCaption}</summary>
        <div className="overflow-x-auto">
          <table className="mt-1 w-full text-[10px] text-gray-500 dark:text-gray-400 tabular-nums" aria-labelledby={`${id}-cap`}>
            <caption id={`${id}-cap`} className="sr-only">{ariaLabel}</caption>
            <thead>
              <tr>
                <th className="text-left font-medium pr-2">Day</th>
                {series.map((s) => (
                  <th key={s.name} className="text-right font-medium pl-2">{series.length > 1 ? s.name : unit || 'Value'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, i) => (
                <tr key={slot.key}>
                  <td className="pr-2">{slotTitle(slot)}</td>
                  {series.map((s, si) => (
                    <td key={s.name} className="text-right pl-2">{formatValue(values[si][i] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
