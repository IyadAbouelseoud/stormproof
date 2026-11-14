import type { OrbitType } from './contracts';
import {
  ELEVATION_MASK_DEG,
  FUNDA_LAT_DEG,
  FUNDA_LON_DEG,
  GSD_REF_ALT_KM,
  J2,
  MU_KM3_S2,
  OMEGA_EARTH_RAD_S,
  R_EARTH_KM,
  TROPICAL_YEAR_DAYS,
} from './constants';

const DEG = Math.PI / 180;
export const ISS_INCLINATION_DEG = 51.6;

export const semiMajorAxisKm = (altKm: number): number => R_EARTH_KM + altKm;

/** Circular orbit period, seconds. */
export function periodS(altKm: number): number {
  const a = semiMajorAxisKm(altKm);
  return 2 * Math.PI * Math.sqrt((a * a * a) / MU_KM3_S2);
}

/** Sun-synchronous inclination from J2 nodal precession = 360 deg / tropical year. */
export function ssoInclinationDeg(altKm: number): number {
  const a = semiMajorAxisKm(altKm);
  const omegaDot = (2 * Math.PI) / (TROPICAL_YEAR_DAYS * 86400);
  const cosI = -(2 * Math.pow(a, 3.5) * omegaDot) / (3 * J2 * R_EARTH_KM * R_EARTH_KM * Math.sqrt(MU_KM3_S2));
  return Math.acos(cosI) / DEG;
}

export function inclinationDeg(type: OrbitType, altKm: number): number {
  return type === 'SSO' ? ssoInclinationDeg(altKm) : ISS_INCLINATION_DEG;
}

/** Fraction of the orbit in Earth's shadow (cylindrical shadow) at beta angle 0. */
export function eclipseFraction(altKm: number): number {
  const a = semiMajorAxisKm(altKm);
  return Math.acos(Math.sqrt(altKm * altKm + 2 * R_EARTH_KM * altKm) / a) / Math.PI;
}

/** GSD(h) = GSD(500 km) * h / 500 (AGENTS.md s5). */
export function gsdM(gsdAt500M: number, altKm: number): number {
  return (gsdAt500M * altKm) / GSD_REF_ALT_KM;
}

/** Swath scales with altitude for a fixed field of view. */
export function swathKm(swathAt500Km: number, altKm: number): number {
  return (swathAt500Km * altKm) / GSD_REF_ALT_KM;
}

/**
 * Mean revisit of a target at latitude latDeg: the parallel's circumference divided by
 * the ground covered per day (one daylight crossing per orbit).
 */
export function revisitDays(swathKmAtAlt: number, altKm: number, latDeg: number): number {
  const orbitsPerDay = 86400 / periodS(altKm);
  const parallel = 2 * Math.PI * R_EARTH_KM * Math.cos(latDeg * DEG);
  return parallel / (swathKmAtAlt * orbitsPerDay);
}

export interface PassStats {
  passesPerDay: number;
  contactMinPerDay: number;
}

/**
 * Passes over Funda (approximate location) from a 1-day circular ground track at 30 s steps,
 * spherical Earth, elevation mask ELEVATION_MASK_DEG. Deterministic (node at RA 0, epoch t = 0).
 */
export function fundaPasses(type: OrbitType, altKm: number): PassStats {
  const a = semiMajorAxisKm(altKm);
  const inc = inclinationDeg(type, altKm) * DEG;
  const n = (2 * Math.PI) / periodS(altKm);
  const raanDot =
    (-1.5 * J2 * R_EARTH_KM * R_EARTH_KM * Math.sqrt(MU_KM3_S2) * Math.cos(inc)) / Math.pow(a, 3.5);
  const lat = FUNDA_LAT_DEG * DEG;
  const lon = FUNDA_LON_DEG * DEG;
  const st = [R_EARTH_KM * Math.cos(lat) * Math.cos(lon), R_EARTH_KM * Math.cos(lat) * Math.sin(lon), R_EARTH_KM * Math.sin(lat)];
  const up = st.map((v) => v / R_EARTH_KM);
  const sinMask = Math.sin(ELEVATION_MASK_DEG * DEG);
  const dt = 30;
  let passes = 0;
  let visibleSteps = 0;
  let wasVisible = false;
  for (let t = 0; t <= 86400; t += dt) {
    const u = n * t;
    const raan = raanDot * t - OMEGA_EARTH_RAD_S * t; // node longitude in the Earth-fixed frame
    const x = a * (Math.cos(raan) * Math.cos(u) - Math.sin(raan) * Math.cos(inc) * Math.sin(u));
    const y = a * (Math.sin(raan) * Math.cos(u) + Math.cos(raan) * Math.cos(inc) * Math.sin(u));
    const z = a * Math.sin(inc) * Math.sin(u);
    const dx = x - st[0]!;
    const dy = y - st[1]!;
    const dz = z - st[2]!;
    const sinEl = (dx * up[0]! + dy * up[1]! + dz * up[2]!) / Math.hypot(dx, dy, dz);
    const visible = sinEl >= sinMask;
    if (visible) visibleSteps++;
    if (visible && !wasVisible) passes++;
    wasVisible = visible;
  }
  return { passesPerDay: passes, contactMinPerDay: (visibleSteps * dt) / 60 };
}
