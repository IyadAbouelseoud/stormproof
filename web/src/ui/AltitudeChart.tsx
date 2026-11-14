import React, { useMemo } from 'react';
import type { TimelineDay } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';
import { CONSTANTS } from '../engineAdapter';

export interface ChartLine {
  timeline: TimelineDay[];
  kind: 'truth' | 'plan' | 'alt';
  label: string;
}

export interface AltitudeChartProps {
  lines: ChartLine[];
  /** Fill the gap between the first truth line and the first plan line with sol-tint. */
  gapFill?: boolean;
  /** Cursor: index into the first line's timeline; lines are drawn only up to it when `reveal`. */
  cursor?: number;
  reveal?: boolean;
  /** Reentry burn trace at the end of the first line. */
  burn?: boolean;
  title: string;
}

const W = 1000;
const H = 360;
const PAD = { l: 56, r: 16, t: 16, b: 32 };
const DAY = 86400000;
const dayOf = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / DAY;

/**
 * SVG altitude chart on a shared date axis. Truth solid ink, plan dashed lapis, gap in sol-tint,
 * a rule at the reentry altitude (120 km). Forecast days (after OMNI ends) are shaded.
 */
export function AltitudeChart({ lines, gapFill, cursor, reveal, burn, title }: AltitudeChartProps): React.JSX.Element {
  const { t, lang } = useI18n();
  const geo = useMemo(() => {
    const all = lines.flatMap((l) => l.timeline);
    if (all.length === 0) return null;
    const x0 = Math.min(...lines.map((l) => dayOf(l.timeline[0]!.date)));
    const x1 = Math.max(...lines.map((l) => dayOf(l.timeline[l.timeline.length - 1]!.date)));
    let ymax = 0;
    for (const d of all) ymax = Math.max(ymax, d.altitudeKm);
    ymax = Math.ceil((ymax + 20) / 50) * 50;
    const ymin = 100;
    const sx = (day: number) => PAD.l + ((day - x0) / Math.max(1, x1 - x0)) * (W - PAD.l - PAD.r);
    const sy = (km: number) => PAD.t + (1 - (km - ymin) / (ymax - ymin)) * (H - PAD.t - PAD.b);
    return { x0, x1, ymin, ymax, sx, sy };
  }, [lines]);

  if (!geo) return <div className="sp-chart-empty type-small">{t('chart.empty')}</div>;
  const { x0, x1, ymin, ymax, sx, sy } = geo;

  const limit = (tl: TimelineDay[], i: number): TimelineDay[] => {
    if (!reveal || cursor === undefined) return tl;
    const cutDay = dayOf(lines[0]!.timeline[Math.min(i, lines[0]!.timeline.length - 1)]!.date);
    return tl.filter((d) => dayOf(d.date) <= cutDay);
  };
  const pathOf = (tl: TimelineDay[]): string =>
    tl.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(dayOf(d.date)).toFixed(1)},${sy(d.altitudeKm).toFixed(1)}`).join('');

  const truth = lines.find((l) => l.kind === 'truth');
  const plan = lines.find((l) => l.kind === 'plan');
  let gap = '';
  if (gapFill && truth && plan) {
    // polygon: plan forward, then truth (extended along the 120 km rule) backward
    const p = limit(plan.timeline, cursor ?? 0);
    const tr = limit(truth.timeline, cursor ?? 0);
    if (p.length > 1 && tr.length > 1) {
      const endDay = Math.max(dayOf(p[p.length - 1]!.date), dayOf(tr[tr.length - 1]!.date));
      const back = [...tr].reverse().map((d) => `L${sx(dayOf(d.date)).toFixed(1)},${sy(d.altitudeKm).toFixed(1)}`);
      gap =
        pathOf(p) +
        `L${sx(endDay).toFixed(1)},${sy(CONSTANTS.reentryAltKm).toFixed(1)}` +
        `L${sx(dayOf(tr[tr.length - 1]!.date)).toFixed(1)},${sy(CONSTANTS.reentryAltKm).toFixed(1)}` +
        back.join('') +
        'Z';
    }
  }

  // forecast shading from the first day flagged forecast in any line
  const fDay = lines
    .flatMap((l) => l.timeline.filter((d) => d.forecast).slice(0, 1))
    .map((d) => dayOf(d.date))
    .sort((a, b) => a - b)[0];

  const yTicks: number[] = [];
  for (let k = Math.ceil(ymin / 100) * 100; k <= ymax; k += 100) yTicks.push(k);
  const yearTicks: { day: number; y: string }[] = [];
  const y0 = new Date(x0 * DAY).getUTCFullYear();
  const y1 = new Date(x1 * DAY).getUTCFullYear();
  const every = y1 - y0 > 8 ? 2 : 1;
  for (let y = y0 + 1; y <= y1; y += every) yearTicks.push({ day: dayOf(`${y}-01-01`), y: String(y) });

  const first = lines[0]!;
  const cur = cursor !== undefined ? first.timeline[Math.min(cursor, first.timeline.length - 1)] : undefined;
  const last = first.timeline[first.timeline.length - 1]!;

  return (
    <figure className="sp-chart" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="sp-chart-svg" role="img" aria-label={title}>
        {fDay !== undefined && (
          <rect x={sx(fDay)} y={PAD.t} width={Math.max(0, W - PAD.r - sx(fDay))} height={H - PAD.t - PAD.b} className="sp-chart-forecast" />
        )}
        {yTicks.map((k) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(k)} y2={sy(k)} className="sp-chart-grid" />
            <text x={PAD.l - 8} y={sy(k) + 4} textAnchor="end" className="sp-chart-axis">
              {fmtNum(lang, k)}
            </text>
          </g>
        ))}
        {yearTicks.map(({ day, y }) => (
          <text key={y} x={sx(day)} y={H - 10} textAnchor="middle" className="sp-chart-axis">
            {y}
          </text>
        ))}
        {gap && <path d={gap} className="sp-chart-gap" />}
        <line x1={PAD.l} x2={W - PAD.r} y1={sy(CONSTANTS.reentryAltKm)} y2={sy(CONSTANTS.reentryAltKm)} className="sp-chart-reentry" />
        <text x={W - PAD.r} y={sy(CONSTANTS.reentryAltKm) - 6} textAnchor="end" className="sp-chart-axis">
          {t('chart.reentry_line', { km: CONSTANTS.reentryAltKm })}
        </text>
        {lines.map((l, i) => (
          <path
            key={i}
            d={pathOf(limit(l.timeline, cursor ?? 0))}
            className={`sp-chart-line sp-chart-line--${l.kind} ${l.kind === 'truth' && burn ? 'sp-chart-line--reentered' : ''}`}
          />
        ))}
        {cur && reveal && (
          <>
            <line x1={sx(dayOf(cur.date))} x2={sx(dayOf(cur.date))} y1={PAD.t} y2={H - PAD.b} className="sp-chart-cursor" />
            <circle cx={sx(dayOf(cur.date))} cy={sy(cur.altitudeKm)} r="3.5" className="sp-chart-cursor-dot" />
          </>
        )}
        {burn && (
          <path
            d={`M${sx(dayOf(last.date)) - 40},${sy(CONSTANTS.reentryAltKm + 25)} Q${sx(dayOf(last.date)) - 10},${sy(CONSTANTS.reentryAltKm + 5)} ${sx(dayOf(last.date))},${sy(CONSTANTS.reentryAltKm)}`}
            className="sp-chart-burn"
          />
        )}
        <text x={PAD.l} y={PAD.t - 4} className="sp-chart-axis">
          {t('chart.km')}
        </text>
      </svg>
      <figcaption className="sp-chart-legend type-small">
        {lines.map((l, i) => (
          <span key={i} className={`sp-legend sp-legend--${l.kind}`}>
            {l.label}
          </span>
        ))}
        {gapFill && <span className="sp-legend sp-legend--gap">{t('chart.gap')}</span>}
        {fDay !== undefined && <span className="sp-legend sp-legend--forecast">{t('chart.forecast')}</span>}
      </figcaption>
    </figure>
  );
}
