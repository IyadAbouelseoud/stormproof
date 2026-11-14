import React from 'react';
import { useI18n } from '../i18n';
import { CONSTANTS, type TrackPoint } from '../engineAdapter';

/**
 * 2D equirectangular map (no globe): graticule, equator, the ground track, the Funda ground station
 * (approximate) and the target latitude. No coastline data ships yet (content request in HANDOFF).
 */
export function GroundMap({ track, title, cursor }: { track: TrackPoint[][]; title: string; cursor?: number }): React.JSX.Element {
  const { t } = useI18n();
  const x = (lon: number) => lon + 180;
  const y = (lat: number) => 90 - lat;
  const lons = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const lats = [-60, -30, 30, 60];
  const currSat = track[0]?.[0];
  const ringAngle = cursor !== undefined ? ((cursor * 15) * Math.PI) / 180 : 0;

  return (
    <figure className="sp-map" dir="ltr">
      <svg viewBox="0 0 360 180" className="sp-map-svg" role="img" aria-label={title}>
        <rect x="0" y="0" width="360" height="180" className="sp-map-sea" />
        {lons.map((l) => (
          <line key={`o${l}`} x1={x(l)} x2={x(l)} y1="0" y2="180" className="sp-map-grid" />
        ))}
        {lats.map((l) => (
          <line key={`a${l}`} x1="0" x2="360" y1={y(l)} y2={y(l)} className="sp-map-grid" />
        ))}
        <line x1="0" x2="360" y1="90" y2="90" className="sp-map-equator" />
        <line x1="0" x2="360" y1={y(CONSTANTS.targetLatDeg)} y2={y(CONSTANTS.targetLatDeg)} className="sp-map-target" />
        {track.map((seg, i) => (
          <polyline key={i} points={seg.map((p) => `${x(p.lon).toFixed(2)},${y(p.lat).toFixed(2)}`).join(' ')} className="sp-map-track" />
        ))}
        <g transform={`translate(${x(CONSTANTS.fundaLonDeg)},${y(CONSTANTS.fundaLatDeg)})`}>
          <rect x="-2" y="-2" width="4" height="4" className="sp-map-station" />
        </g>
        {currSat && (
          <g transform={`translate(${x(currSat.lon)},${y(currSat.lat)})`} className="sp-map-sat">
            <rect x="-3" y="-3" width="6" height="6" className="sp-map-sat-body" />
            <line x1="-7" y1="0" x2="-3" y2="0" className="sp-map-sat-wing" />
            <line x1="3" y1="0" x2="7" y2="0" className="sp-map-sat-wing" />
          </g>
        )}
        {/* Orbit ring with traveling satellite marker */}
        <g className="sp-map-orbit-ring" transform="translate(324, 34)">
          <circle cx="0" cy="0" r="14" className="sp-map-earth-disc" />
          <circle cx="0" cy="0" r="22" className="sp-map-orbit-path" />
          {cursor !== undefined && (
            <circle
              cx={(22 * Math.cos(ringAngle)).toFixed(1)}
              cy={(22 * Math.sin(ringAngle)).toFixed(1)}
              r="2.5"
              className="sp-map-sat-ring-dot"
            />
          )}
        </g>
      </svg>
      <figcaption className="sp-map-legend type-small">
        <span className="sp-legend sp-legend--track">{t('map.track')}</span>
        <span className="sp-legend sp-legend--station">{t('map.station')}</span>
        <span className="sp-legend sp-legend--target">{t('map.target')}</span>
      </figcaption>
    </figure>
  );
}
