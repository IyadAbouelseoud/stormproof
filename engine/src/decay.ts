/**
 * Circular-orbit decay (AGENTS.md s5): da/dt = -(Cd*A/m) * rho * sqrt(mu * a).
 * Midpoint (RK2) steps: 1 day, 1 hour below HOURLY_BELOW_KM; reentry at REENTRY_ALT_KM.
 */
import { HOURLY_BELOW_KM, MU_KM3_S2, R_EARTH_KM, REENTRY_ALT_KM } from './constants';
import type { DensityTable } from './drag';
import { densityAt } from './drag';

const MU_M3_S2 = MU_KM3_S2 * 1e9;

export interface DecayDay {
  /** Day number (days since 1970) at the start of this day. */
  day: number;
  altKm: number;
  rhoKgM3: number;
}

export interface DecayResult {
  /** One sample per whole day from the start day; the last sample is the reentry day if reentered. */
  daily: DecayDay[];
  /** Fractional day number of reentry, or null if still in orbit at endDay. */
  reentryDay: number | null;
}

/** Altitude rate in km/day. */
export function dadtKmPerDay(tab: DensityTable, day: number, altKm: number, cdAm: number): number {
  const aM = (R_EARTH_KM + altKm) * 1000;
  const rho = densityAt(tab, day, altKm);
  return (-cdAm * rho * Math.sqrt(MU_M3_S2 * aM) * 86400) / 1000;
}

/**
 * Integrate from startDay at altKm until reentry or endDay.
 * @param cdAm Cd * A / m in m^2/kg (= 1 / ballistic coefficient).
 */
export function decay(tab: DensityTable, startDay: number, altKm: number, cdAm: number, endDay: number): DecayResult {
  const daily: DecayDay[] = [];
  let t = startDay;
  let h = altKm;
  let nextSample = startDay;
  while (t < endDay) {
    if (t >= nextSample - 1e-9) {
      daily.push({ day: nextSample, altKm: h, rhoKgM3: densityAt(tab, t, h) });
      nextSample += 1;
    }
    const dt = h < HOURLY_BELOW_KM ? 1 / 24 : 1;
    const step = Math.min(dt, nextSample - t, endDay - t);
    const k1 = dadtKmPerDay(tab, t, h, cdAm);
    const k2 = dadtKmPerDay(tab, t + step / 2, h + (k1 * step) / 2, cdAm);
    const hNext = h + k2 * step;
    if (hNext <= REENTRY_ALT_KM) {
      const frac = (h - REENTRY_ALT_KM) / (h - hNext);
      const reentryDay = t + frac * step;
      daily.push({ day: Math.floor(reentryDay), altKm: REENTRY_ALT_KM, rhoKgM3: densityAt(tab, reentryDay, REENTRY_ALT_KM) });
      if (daily.length > 1 && daily[daily.length - 2]!.day === Math.floor(reentryDay)) daily.splice(daily.length - 2, 1);
      return { daily, reentryDay };
    }
    t += step;
    h = hNext;
  }
  return { daily, reentryDay: null };
}
