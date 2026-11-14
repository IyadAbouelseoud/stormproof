import React from 'react';
import type { OrbitType } from '@stormproof/engine';
import { useI18n } from '../i18n';
import type { AltitudeBands } from '../engineAdapter';
import { ALT_MAX_KM, ALT_MIN_KM } from '../engineAdapter';

interface OrbitSceneProps {
  altitudeKm: number;
  orbitType: OrbitType;
  bands: AltitudeBands | null;
}

const CX = 240;
const CY = 240;
const R_EARTH = 120;
const R_MAX_ORBIT = 215;

function rOf(altKm: number): number {
  const norm = (altKm - ALT_MIN_KM) / (ALT_MAX_KM - ALT_MIN_KM);
  return R_EARTH + 12 + norm * (R_MAX_ORBIT - (R_EARTH + 12));
}

export function OrbitScene({ altitudeKm, orbitType, bands }: OrbitSceneProps): React.JSX.Element {
  const { t } = useI18n();
  const rOrb = rOf(altitudeKm);
  const rDrag = bands?.dragBelowKm != null ? rOf(bands.dragBelowKm) : null;
  const rDisp = bands?.disposalAboveKm != null ? rOf(bands.disposalAboveKm) : null;

  const isSSO = orbitType === 'SSO';
  // Inclination tilt angle for visual distinction: SSO ~98° (near polar), ISS 51.6°
  const tiltDeg = isSSO ? -8 : -51.6;

  return (
    <div className="orbit-scene-container" dir="ltr">
      <svg viewBox="0 0 480 480" className="orbit-scene-svg" role="img" aria-label={t('orbit.altitude')}>
        <defs>
          {/* Mask to keep Earth night-side cleanly inside the globe */}
          <clipPath id="earth-disc-clip">
            <circle cx={CX} cy={CY} r={R_EARTH} />
          </clipPath>
        </defs>

        {/* Drag band zone (high atmospheric drag) */}
        {rDrag && (
          <circle
            cx={CX}
            cy={CY}
            r={rDrag}
            fill="none"
            stroke="var(--color-sol)"
            strokeWidth={Math.max(2, rDrag - R_EARTH)}
            opacity="0.12"
            strokeDasharray="4 4"
          />
        )}

        {/* Disposal band zone (FCC 5y disposal threshold) */}
        {rDisp && (
          <circle
            cx={CX}
            cy={CY}
            r={R_MAX_ORBIT}
            fill="none"
            stroke="var(--color-lapis)"
            strokeWidth={Math.max(2, R_MAX_ORBIT - rDisp)}
            opacity="0.12"
          />
        )}

        {/* Earth Globe: Day side (left, receiving sun) */}
        <circle
          cx={CX}
          cy={CY}
          r={R_EARTH}
          fill="var(--color-ground-raised)"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
        />

        {/* Night side of Earth (right hemisphere) */}
        <path
          d={`M ${CX} ${CY - R_EARTH} A ${R_EARTH} ${R_EARTH} 0 0 1 ${CX} ${CY + R_EARTH} Z`}
          fill="var(--color-ground)"
          clipPath="url(#earth-disc-clip)"
        />

        {/* Day/Night terminator line */}
        <line
          x1={CX}
          y1={CY - R_EARTH}
          x2={CX}
          y2={CY + R_EARTH}
          stroke="var(--color-rule)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Sun directional indicator on the day side */}
        <g className="orbit-sun-indicator" transform={`translate(${CX - R_EARTH - 55}, ${CY})`}>
          <circle cx="0" cy="0" r="14" fill="var(--color-sol)" />
          <path d="M -18 0 L -24 0 M 18 0 L 24 0 M 0 -18 L 0 -24 M 0 18 L 0 24" stroke="var(--color-sol)" strokeWidth="1.5" />
          <text x="0" y="28" textAnchor="middle" className="type-label" fill="var(--color-ink-muted)">
            SOL
          </text>
        </g>

        {/* Orbit System group with inclination tilt */}
        <g transform={`rotate(${tiltDeg} ${CX} ${CY})`}>
          {/* Complete Orbit ellipse/ring */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={rOrb}
            ry={isSSO ? rOrb : rOrb * 0.72}
            fill="none"
            stroke="var(--color-rule)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* Active Orbit Trace */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={rOrb}
            ry={isSSO ? rOrb : rOrb * 0.72}
            fill="none"
            stroke="var(--color-lapis)"
            strokeWidth="2"
          />

          {/* Eclipse arc on the night side (right side of shadow) */}
          <path
            d={
              isSSO
                ? `M ${CX} ${CY - rOrb} A ${rOrb} ${rOrb} 0 0 1 ${CX} ${CY + rOrb}`
                : `M ${CX} ${CY - rOrb * 0.72} A ${rOrb} ${rOrb * 0.72} 0 0 1 ${CX} ${CY + rOrb * 0.72}`
            }
            fill="none"
            stroke="var(--color-sol)"
            strokeWidth="2.5"
            strokeDasharray="3 3"
            opacity="0.8"
          />

          {/* Satellite traveling on the orbit */}
          <g className="orbit-satellite-pivot">
            <g transform={`translate(${CX + rOrb}, ${CY})`}>
              {/* Satellite Body */}
              <rect x="-5" y="-5" width="10" height="10" fill="var(--color-ground-raised)" stroke="var(--color-ink)" strokeWidth="1.5" />
              {/* Solar Panels */}
              <line x1="-12" y1="0" x2="-5" y2="0" stroke="var(--color-lapis)" strokeWidth="3" />
              <line x1="5" y1="0" x2="12" y2="0" stroke="var(--color-lapis)" strokeWidth="3" />
              {/* Panel frame ticks */}
              <line x1="-12" y1="-2" x2="-12" y2="2" stroke="var(--color-ink)" strokeWidth="1" />
              <line x1="12" y1="-2" x2="12" y2="2" stroke="var(--color-ink)" strokeWidth="1" />
            </g>
          </g>
        </g>

        {/* Altitude indicator overlay */}
        <g transform={`translate(${CX}, ${CY - R_EARTH - (rOrb - R_EARTH) / 2})`}>
          <line x1="0" y1={(rOrb - R_EARTH) / 2} x2="0" y2={-(rOrb - R_EARTH) / 2} stroke="var(--color-brass)" strokeWidth="1.5" strokeDasharray="2 2" />
        </g>
      </svg>
    </div>
  );
}
