/** Cause chain: 3..5 ordered causes, each with a numeric effect, ending in the verdict. */
import type { Cause, Outcome, SimMode } from './contracts';
import { msg, r1 } from './msg';

export interface CauseInputs {
  mode: SimMode;
  altKm: number;
  /** Lifetimes in days (lower bounds when alive at forecast end). */
  planDays: number;
  truthDays: number;
  /** Truth Sun from the planned (unslipped) launch date. */
  truthNoSlipDays: number;
  slipMonths: number;
  /** Mean truth / plan density at the design altitude over the truth flight. */
  densityRatio: number;
  /** Largest altitude loss over a DONKI storm day (truth timeline), or null. */
  storm: { km: number; date: string; kp: number } | null;
  deltaVMs: number;
  /** Altitude gained by reboosts, km. */
  climbKm: number;
  outcome: Outcome;
  lifetimeDays: number;
}

const MAX_CAUSES = 5;
const n = (v: number, one: string, many: string): string => `${v} ${Math.abs(v) === 1 ? one : many}`;

export function causeChain(x: CauseInputs): Cause[] {
  const out: Cause[] = [];
  const sunDays = Math.round(x.planDays - x.truthNoSlipDays);
  out.push({
    id: 'sun',
    sun: true,
    effect: { value: -sunDays, unit: 'days' },
    label: sunDays >= 0
      ? msg('cause.sun.took', `The real Sun was stronger than the 2019 forecast: it took ${sunDays} days of life.`, { days: sunDays })
      : msg('cause.sun.gave', `The real Sun was calmer than the 2019 forecast: it gave ${-sunDays} extra days.`, { days: -sunDays }),
  });

  const f = r1(x.densityRatio);
  out.push({
    id: 'density',
    sun: true,
    effect: { value: f, unit: 'x' },
    label: msg('cause.density', `Air at ${x.altKm} km was on average ${f} times as dense as planned.`, { altKm: x.altKm, factor: f }),
  });

  if (x.mode === 'truth' && x.slipMonths > 0) {
    const d = Math.round(x.truthDays - x.truthNoSlipDays);
    out.push({
      id: 'launch-slip',
      sun: false,
      effect: { value: x.slipMonths, unit: 'months' },
      label: msg('cause.slip', `The launch slipped ${n(x.slipMonths, 'month', 'months')}: ${d >= 0 ? `${n(d, 'day', 'days')} gained` : `${n(-d, 'day', 'days')} lost`} from a different Sun.`, { months: x.slipMonths, days: d }),
    });
  }

  if (x.mode === 'truth' && x.storm && x.storm.km > 0) {
    const km = Math.round(x.storm.km * 100) / 100;
    out.push({
      id: 'storm',
      sun: true,
      effect: { value: -km, unit: 'km' },
      label: msg('cause.storm', `The Kp ${x.storm.kp} storm of ${x.storm.date} cost ${km} km more than normal decay in two days.`, { kp: x.storm.kp, date: x.storm.date, km }),
    });
  }

  out.push(
    x.deltaVMs > 0
      ? { id: 'propulsion', sun: false, effect: { value: r1(x.climbKm), unit: 'km' }, label: msg('cause.fuel', `${x.deltaVMs} m/s of fuel climbed back ${r1(x.climbKm)} km.`, { dv: x.deltaVMs, km: r1(x.climbKm) }) }
      : { id: 'propulsion', sun: false, effect: { value: 0, unit: 'm/s' }, label: msg('cause.no.fuel', 'No propulsion: 0 m/s to climb back up.', { dv: 0 }) },
  );

  const o = x.outcome;
  const verdict: Cause =
    o.kind === 'reentered'
      ? { id: 'verdict', sun: true, effect: { value: x.lifetimeDays, unit: 'days' }, label: msg('cause.verdict.reentered', `Reentered on ${o.date} after ${x.lifetimeDays} days.`, { date: o.date, days: x.lifetimeDays }) }
      : o.kind === 'alive'
        ? { id: 'verdict', sun: true, effect: { value: x.lifetimeDays, unit: 'days' }, label: msg('cause.verdict.alive', `Still flying on ${o.asOf}; on NASA's forecast Sun it reenters about ${o.predictedReentry} (${x.lifetimeDays} days).`, { asOf: o.asOf, date: o.predictedReentry, days: x.lifetimeDays }) }
        : { id: 'verdict', sun: false, effect: { value: o.minYears, unit: 'years' }, label: msg('cause.verdict.forecast-end', `Still in orbit when the forecast ends (${o.asOf}): at least ${o.minYears} years.`, { asOf: o.asOf, years: o.minYears }) };

  // Keep at most MAX_CAUSES: drop the design cause first, then the storm.
  while (out.length + 1 > MAX_CAUSES) {
    const i = out.findIndex((c) => c.id === 'propulsion');
    out.splice(i >= 0 ? i : out.findIndex((c) => c.id === 'storm'), 1);
  }
  out.push(verdict);
  return out;
}
