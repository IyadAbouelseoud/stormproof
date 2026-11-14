/** Closest real mission to a design (Report screen hint). Only sourced missions are listed. */
import type { ClosestDesign, FormFactor, ISODate, MissionDesign } from './contracts';
import { dayNum } from './dates';
import { msg } from './msg';

export interface ReferenceMission {
  mission: string;
  formFactor: FormFactor;
  altitudeKm: number;
  launchDate: ISODate;
  reentryDate: ISODate | null;
  /** content/sources.csv id. */
  sourceId: string;
}

/** FACSAT-2: AGENTS.md s5 golden 1 (sources.csv id facsat2). Add rows only with a sources.csv id. */
export const REFERENCE_MISSIONS: ReferenceMission[] = [
  { mission: 'FACSAT-2', formFactor: '6U', altitudeKm: 497, launchDate: '2023-04-15', reentryDate: '2025-10-27', sourceId: 'facsat2' },
];

/** Distance: 50 km of altitude = 1 year of launch date = a form-factor mismatch. game-balanced. */
function distance(d: MissionDesign, m: ReferenceMission): number {
  return (
    Math.abs(d.orbit.altitudeKm - m.altitudeKm) / 50 +
    Math.abs(dayNum(d.launchDate) - dayNum(m.launchDate)) / 365.25 +
    (d.formFactor === m.formFactor ? 0 : 1)
  );
}

export function closestDesign(d: MissionDesign): ClosestDesign {
  let best = REFERENCE_MISSIONS[0]!;
  for (const m of REFERENCE_MISSIONS) if (distance(d, m) < distance(d, best)) best = m;
  const dAlt = Math.round(d.orbit.altitudeKm - best.altitudeKm);
  const life = best.reentryDate ? Math.round(dayNum(best.reentryDate) - dayNum(best.launchDate)) : null;
  const altPart = dAlt === 0 ? 'at the same altitude' : `${Math.abs(dAlt)} km ${dAlt > 0 ? 'higher' : 'lower'}`;
  const lifePart = best.reentryDate ? `reentered on ${best.reentryDate} after ${life} days` : 'is still in orbit';
  const hint = msg(
    'closest.hint',
    `Closest real mission: ${best.mission}, a ${best.formFactor} launched ${best.launchDate} at ${best.altitudeKm} km; it ${lifePart}. Your design flies ${altPart}.`,
    { mission: best.mission, formFactor: best.formFactor, altKm: best.altitudeKm, launch: best.launchDate, reentry: best.reentryDate ?? '', lifeDays: life ?? -1, dAltKm: dAlt },
  );
  return { mission: best.mission, formFactor: best.formFactor, altitudeKm: best.altitudeKm, launchDate: best.launchDate, reentryDate: best.reentryDate, sourceId: best.sourceId, hint };
}
