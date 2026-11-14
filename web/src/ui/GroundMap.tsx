import React from 'react';
import { useI18n } from '../i18n';
import { CONSTANTS, scenario, type TrackPoint } from '../engineAdapter';
import { useMission } from '../store';

/**
 * 2D equirectangular map (no globe): graticule, equator, the ground track, the Funda ground station
 * (approximate) and the target latitude. No coastline data ships yet (content request in HANDOFF).
 */
export function GroundMap({ track, title }: { track: TrackPoint[][]; title: string }): React.JSX.Element {
  const targetLat = useMission((s) => scenario(s.design.scenarioId)?.targetLatDeg ?? CONSTANTS.targetLatDeg);
  const { t } = useI18n();
  const x = (lon: number) => lon + 180;
  const y = (lat: number) => 90 - lat;
  const lons = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const lats = [-60, -30, 30, 60];
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
        <line x1="0" x2="360" y1={y(targetLat)} y2={y(targetLat)} className="sp-map-target" />
        {track.map((seg, i) => (
          <polyline key={i} points={seg.map((p) => `${x(p.lon).toFixed(2)},${y(p.lat).toFixed(2)}`).join(' ')} className="sp-map-track" />
        ))}
        <g transform={`translate(${x(CONSTANTS.fundaLonDeg)},${y(CONSTANTS.fundaLatDeg)})`}>
          <rect x="-2" y="-2" width="4" height="4" className="sp-map-station" />
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
