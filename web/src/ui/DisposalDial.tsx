import React from 'react';
import type { SimResult } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';
import { CheckMark, CrossMark } from './components';

interface DisposalDialProps {
  result: SimResult;
}

export function DisposalDial({ result }: DisposalDialProps): React.JSX.Element {
  const { t, tMsg, lang } = useI18n();
  const d = result.disposal;
  const lifetimeDays = result.lifetimeDays;
  const lifetimeYears = lifetimeDays / 365.25;

  // Dial scale: 0 to 30 years
  // Arc angles: 180° semi-circle from 180° to 360° (or 220° arc from 160° to 380°)
  const MAX_YEARS = 30;
  const FCC_YEARS = 5;
  const NASA_YEARS = 25;

  const clampYears = Math.min(MAX_YEARS, Math.max(0, lifetimeYears));

  // Semi-circle SVG coordinates: CX = 100, CY = 85, R = 65
  const CX = 100;
  const CY = 85;
  const R = 65;

  const angleOf = (y: number) => Math.PI + (y / MAX_YEARS) * Math.PI;
  const ptOf = (y: number) => ({
    x: CX + R * Math.cos(angleOf(y)),
    y: CY + R * Math.sin(angleOf(y)),
  });

  const pFcc = ptOf(FCC_YEARS);
  const pNasa = ptOf(NASA_YEARS);
  const pVal = ptOf(clampYears);

  // SVG arc path from 0 to clamped value
  const arcD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${pVal.x} ${pVal.y}`;

  const fccPass = lifetimeYears <= 5.0;
  const nasaPass = lifetimeYears <= 25.0;

  return (
    <div className="disposal-dial-wrap" dir="ltr">
      <svg viewBox="0 0 200 120" className="disposal-dial-svg" role="img" aria-label={t('disposal.title') || 'Disposal Verdict'}>
        {/* Background track arc */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={arcD}
          fill="none"
          stroke={fccPass ? 'var(--color-lapis)' : nasaPass ? 'var(--color-brass)' : 'var(--color-fail)'}
          strokeWidth="10"
          strokeLinecap="round"
          className="disposal-dial-val-arc"
        />

        {/* FCC 5-year tick */}
        <line
          x1={CX + (R - 8) * Math.cos(angleOf(FCC_YEARS))}
          y1={CY + (R - 8) * Math.sin(angleOf(FCC_YEARS))}
          x2={CX + (R + 8) * Math.cos(angleOf(FCC_YEARS))}
          y2={CY + (R + 8) * Math.sin(angleOf(FCC_YEARS))}
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
        <text
          x={pFcc.x - 4}
          y={pFcc.y - 12}
          textAnchor="middle"
          className="type-label disposal-tick-label"
          fill="var(--color-ink-muted)"
        >
          {t('disposal.fcc')}
        </text>

        {/* NASA 25-year tick */}
        <line
          x1={CX + (R - 8) * Math.cos(angleOf(NASA_YEARS))}
          y1={CY + (R - 8) * Math.sin(angleOf(NASA_YEARS))}
          x2={CX + (R + 8) * Math.cos(angleOf(NASA_YEARS))}
          y2={CY + (R + 8) * Math.sin(angleOf(NASA_YEARS))}
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
        <text
          x={pNasa.x}
          y={pNasa.y - 12}
          textAnchor="middle"
          className="type-label disposal-tick-label"
          fill="var(--color-ink-muted)"
        >
          {t('disposal.nasa')}
        </text>

        {/* Center Readout */}
        <text x={CX} y={CY - 10} textAnchor="middle" className="type-data-l disposal-val-text" fill="var(--color-ink)">
          {fmtNum(lang, lifetimeYears, 1)}
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" className="type-small" fill="var(--color-ink-muted)">
          {t('unit.years')}
        </text>

        {/* Scale endpoints */}
        <text x={CX - R} y={CY + 18} textAnchor="middle" className="type-small" fill="var(--color-ink-muted)">0y</text>
        <text x={CX + R} y={CY + 18} textAnchor="middle" className="type-small" fill="var(--color-ink-muted)">30y+</text>
      </svg>

      <div className="disposal-verdict-chips">
        <span className={`disposal-chip ${fccPass ? 'disposal-chip--pass' : 'disposal-chip--fail'}`}>
          <span className="chip-mark">{fccPass ? <CheckMark /> : <CrossMark />}</span>
          <span>{t('disposal.fcc')} (FCC 22-74)</span>
        </span>
        <span className={`disposal-chip ${nasaPass ? 'disposal-chip--pass' : 'disposal-chip--fail'}`}>
          <span className="chip-mark">{nasaPass ? <CheckMark /> : <CrossMark />}</span>
          <span>{t('disposal.nasa')} (STD-8719.14)</span>
        </span>
      </div>

      <p className="type-small disposal-reason">{tMsg(d.reason)}</p>
    </div>
  );
}
