/** Seeded truth-mode events: launch slip, storm alerts, and the team's storm response. */
import type { StormPolicy } from './contracts';
import { STORM_ALERT_KP } from './constants';
import { dayNum } from './dates';
import type { Rng } from './rng';

/** Launch slip 0..12 months, skewed to short slips: floor(13 * u^2). game-balanced. */
export function launchSlipMonths(rng: Rng): number {
  const u = rng.next();
  return Math.min(12, Math.floor(13 * u * u));
}

export interface Storm {
  id: string;
  start: string;
  date: string;
  kpMax: number;
  link?: string;
}

export interface StormAlert {
  day: number;
  kp: number;
  id: string;
}

/** DONKI storms with Kp >= STORM_ALERT_KP between startDay and endDay (day numbers). */
export function stormAlerts(storms: Storm[], startDay: number, endDay: number): StormAlert[] {
  return storms
    .map((s) => ({ day: dayNum(s.date), kp: s.kpMax, id: s.id }))
    .filter((s) => s.kp >= STORM_ALERT_KP && s.day >= startDay && s.day <= endDay)
    .sort((a, b) => a.day - b.day);
}

/** Chance that riding out a storm resets the flight computer and wipes the buffer. game-balanced. */
export const RESET_CHANCE = 0.2;

export interface StormOutcome {
  day: number;
  /** Payload off that day (safe mode). */
  payloadOff: boolean;
  /** Onboard buffer wiped (computer reset while riding out). */
  bufferLost: boolean;
}

/** Resolve each alert with the team's standing vote (stormPolicy; default ride-out). */
export function resolveStorms(alerts: StormAlert[], policy: StormPolicy | undefined, rng: Rng): StormOutcome[] {
  const p = policy ?? 'ride-out';
  return alerts.map((a) =>
    p === 'safe-mode'
      ? { day: a.day, payloadOff: true, bufferLost: false }
      : { day: a.day, payloadOff: false, bufferLost: rng.next() < RESET_CHANCE },
  );
}
