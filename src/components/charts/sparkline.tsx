interface SparklineProps {
  values: number[];
  /** Optional reference level drawn as a faint dashed line (e.g. a target weight) */
  reference?: number | null;
  width?: number;
  height?: number;
  /** Tailwind stroke/fill classes for the accent (latest point) */
  accent?: string;
  ariaLabel: string;
}

/**
 * A 12-to-30 point sparkline for stat tiles: the series in the de-emphasis
 * gray, the latest point in the accent with a surface ring. No axes.
 */
export function Sparkline({
  values,
  reference = null,
  width = 96,
  height = 32,
  accent = 'text-brand-600 dark:text-brand-400',
  ariaLabel,
}: SparklineProps) {
  if (values.length < 2) return null;
  const pad = 4;
  const all = reference !== null ? [...values, reference] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const toX = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const toY = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const lastX = toX(values.length - 1);
  const lastY = toY(values[values.length - 1]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="shrink-0">
      {reference !== null && (
        <line x1={pad} x2={width - pad} y1={toY(reference)} y2={toY(reference)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
      )}
      <polyline points={pts} fill="none" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <g className={accent}>
        <circle cx={lastX} cy={lastY} r={4} className="fill-white dark:fill-gray-900" />
        <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
      </g>
    </svg>
  );
}
