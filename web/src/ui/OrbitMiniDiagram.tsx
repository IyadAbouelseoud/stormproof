import React from 'react';
import type { AltitudeBands } from '../engineAdapter';
import { fmtNum } from '../format';
import { useI18n } from '../i18n';

export interface OrbitMiniDiagramProps {
  altitudeKm: number;
  bands: AltitudeBands | null;
}

/** Live mini-diagram of orbit height above Earth with drag and FCC disposal bands (X5 / prompt G2). */
export function OrbitMiniDiagram({ altitudeKm, bands }: OrbitMiniDiagramProps): React.JSX.Element {
  const { t, lang } = useI18n();

  // Mapping 200 km to 800 km -> radius 136 px to 208 px from Earth center (160, 250)
  const clampKm = Math.max(200, Math.min(800, altitudeKm));
  const rCurrent = 136 + ((clampKm - 200) / 600) * 72;

  const dragKm = bands?.dragBelowKm ?? null;
  const dispKm = bands?.disposalAboveKm ?? null;

  const rDrag = dragKm != null ? 136 + ((Math.max(200, Math.min(800, dragKm)) - 200) / 600) * 72 : null;
  const rDisp = dispKm != null ? 136 + ((Math.max(200, Math.min(800, dispKm)) - 200) / 600) * 72 : null;

  return (
    <div className="orbit-mini-diagram" aria-hidden="true">
      <svg viewBox="0 0 320 180" className="orbit-mini-svg">
        {/* Earth sphere (top visible in frame) */}
        <circle cx="160" cy="250" r="120" fill="var(--color-ground-sunken)" stroke="var(--color-rule)" strokeWidth="1.5" />
        <text x="160" y="162" textAnchor="middle" className="type-label" fill="var(--color-ink-muted)">
          {t('segment.ground')}
        </text>

        {/* Drag band arc (< dragBelowKm) */}
        {rDrag != null && rDrag > 136 && (
          <circle
            cx="160"
            cy="250"
            r={(136 + rDrag) / 2}
            fill="none"
            stroke="var(--color-sol-ink)"
            strokeWidth={rDrag - 136}
            opacity="0.3"
            strokeDasharray="4 2"
          />
        )}

        {/* Disposal band arc (> disposalAboveKm) */}
        {rDisp != null && rDisp < 208 && (
          <circle
            cx="160"
            cy="250"
            r={(rDisp + 208) / 2}
            fill="none"
            stroke="var(--color-lapis)"
            strokeWidth={208 - rDisp}
            opacity="0.3"
            strokeDasharray="4 2"
          />
        )}

        {/* Selected orbit ring */}
        <circle cx="160" cy="250" r={rCurrent} fill="none" stroke="var(--color-brass)" strokeWidth="1.5" />

        {/* Satellite icon at orbital apex */}
        <line
          x1={150}
          y1={250 - rCurrent}
          x2={170}
          y2={250 - rCurrent}
          stroke="var(--color-lapis)"
          strokeWidth="1.5"
        />
        <circle
          cx="160"
          cy={250 - rCurrent}
          r="4"
          fill="var(--color-lapis)"
          stroke="var(--color-ground-raised)"
          strokeWidth="1.5"
        />

        {/* Altitude readout above satellite */}
        <text
          x="160"
          y={250 - rCurrent - 9}
          textAnchor="middle"
          className="type-data"
          fill="var(--color-ink)"
        >
          {fmtNum(lang, altitudeKm)} {t('unit.km')}
        </text>
      </svg>
    </div>
  );
}
