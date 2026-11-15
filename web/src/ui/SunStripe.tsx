import React, { useId } from 'react';
import { useI18n } from '../i18n';
import { fmtMonth, fmtNum } from '../format';
import { sunLevel, type SunMonth } from '../engineAdapter';

export interface SunStripeProps {
  months: SunMonth[];
  /** Selected month index. */
  value: number;
  onChange?: (index: number) => void;
  label: string;
  pulseStorm?: boolean;
}

const CELL = 10;
const H = 48;

/**
 * Launch-date control: one cell per month, coloured by monthly F10.7 on the Sun Stripe scale;
 * forecast months hatched. Keyboard: Left/Right one month, PageUp/PageDown one year, Home/End.
 * The time axis runs left to right in both languages (charts keep a fixed time direction).
 */
export function SunStripe({ months, value, onChange, label, pulseStorm }: SunStripeProps): React.JSX.Element {
  const { t, lang } = useI18n();
  const pid = useId().replace(/:/g, '');
  const n = months.length;
  const sel = months[value];
  const W = n * CELL;
  const set = (i: number) => onChange?.(Math.max(0, Math.min(n - 1, i)));

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1, PageDown: -12, PageUp: 12 };
    if (e.key in step) {
      set(value + step[e.key]!);
      e.preventDefault();
    } else if (e.key === 'Home') {
      set(0);
      e.preventDefault();
    } else if (e.key === 'End') {
      set(n - 1);
      e.preventDefault();
    }
  };

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onChange || (e.type === 'pointermove' && e.buttons === 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    set(Math.floor(((e.clientX - r.left) / r.width) * n));
  };

  const years = months
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.month.endsWith('-01'));

  const valueText = sel
    ? t('sun.cursor', { date: fmtMonth(lang, sel.month), sfu: fmtNum(lang, sel.f107), level: t(`sunlevel.${sunLevel(sel.f107)}`) }) +
      (sel.forecast ? ` (${t('sun.forecast')})` : '')
    : '';

  return (
    <div className="sp-sunstripe" dir="ltr">
      <div
        className="sp-sunstripe-control"
        role="slider"
        tabIndex={onChange ? 0 : -1}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={value}
        aria-valuetext={valueText}
        onKeyDown={onKey}
      >
        <svg
          viewBox={`0 0 ${W} ${H + 16}`}
          preserveAspectRatio="none"
          className="sp-sunstripe-svg"
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          aria-hidden="true"
        >
          <defs>
            <pattern id={`hatch-${pid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" className="sp-sunstripe-hatch" />
            </pattern>
          </defs>
          {months.map((m, i) => (
            <rect
              key={m.month}
              x={i * CELL}
              y={0}
              width={CELL + 0.5}
              height={H}
              className={`sp-sun-${sunLevel(m.f107)}`}
            />
          ))}
          {months.map((m, i) =>
            m.forecast ? <rect key={`f${m.month}`} x={i * CELL} y={0} width={CELL + 0.5} height={H} fill={`url(#hatch-${pid})`} /> : null,
          )}
          {years.map(({ m, i }) => (
            <line key={`y${m.month}`} x1={i * CELL} x2={i * CELL} y1={H} y2={H + 6} className="sp-sunstripe-yeartick" />
          ))}
          <rect x={value * CELL - 1} y={-2} width={CELL + 2} height={H + 4} className="sp-sunstripe-handle" />
          {pulseStorm && (
            <g transform={`translate(${value * CELL + CELL / 2}, ${H / 2})`} className="sunstripe-storm-rings">
              <circle cx="0" cy="0" r="10" className="sunstripe-storm-ring ring-1" />
              <circle cx="0" cy="0" r="18" className="sunstripe-storm-ring ring-2" />
              <circle cx="0" cy="0" r="26" className="sunstripe-storm-ring ring-3" />
            </g>
          )}
        </svg>
        <div className="sp-sunstripe-years type-data" aria-hidden="true">
          {years
            .filter((_, k) => k % 2 === 0)
            .map(({ m, i }) => (
              <span key={m.month} style={{ insetInlineStart: `${(i / n) * 100}%` }}>
                {m.month.slice(0, 4)}
              </span>
            ))}
        </div>
      </div>
      <div className="sp-sunstripe-cursor type-data" aria-hidden="true">
        {valueText}
      </div>
    </div>
  );
}
