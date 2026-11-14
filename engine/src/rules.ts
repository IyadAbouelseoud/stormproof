import type { DisposalVerdict, FitVerdict, Gauge, GaugeId } from './contracts';
import { FCC_DISPOSAL_YEARS, NASA_DISPOSAL_YEARS } from './constants';
import { msg, r1 } from './msg';

/**
 * Gauge with margin and state. sense 'max': value must stay under limit, margin = (limit - value) / value.
 * sense 'min': value must reach limit, margin = (value - limit) / limit. fail < 0 <= warn < required <= ok.
 */
export function gauge(id: GaugeId, value: number, limit: number, unit: string, requiredMarginPct: number, sense: 'max' | 'min' = 'max'): Gauge {
  const m = sense === 'max' ? (value > 0 ? ((limit - value) / value) * 100 : 100) : ((value - limit) / limit) * 100;
  const marginPct = r1(m);
  const state = marginPct < 0 ? 'fail' : marginPct < requiredMarginPct ? 'warn' : 'ok';
  return { id, value, limit, unit, marginPct, requiredMarginPct, state };
}

export function disposalVerdict(lifetimeDays: number, lowerBound: boolean): DisposalVerdict {
  const years = lifetimeDays / 365.25;
  const fcc = { limitYears: FCC_DISPOSAL_YEARS, pass: !lowerBound && years <= FCC_DISPOSAL_YEARS };
  const nasa = { limitYears: NASA_DISPOSAL_YEARS, pass: !lowerBound ? years <= NASA_DISPOSAL_YEARS : false };
  // A lower bound >= 25 y already fails NASA; a lower bound < 25 y cannot prove compliance.
  const y = r1(years);
  const reason = lowerBound
    ? msg('disposal.lowerbound', `Still in orbit when the forecast ends (at least ${y} years): fails the FCC 5-year rule${years >= NASA_DISPOSAL_YEARS ? ' and the NASA 25-year rule' : '; NASA 25-year compliance is unproven'}.`, { years: y })
    : fcc.pass
      ? msg('disposal.ok', `Reenters after ${y} years: meets the FCC 5-year and NASA 25-year rules.`, { years: y })
      : nasa.pass
        ? msg('disposal.fcc.fail', `Reenters after ${y} years: meets NASA 25 years but breaks the FCC 5-year rule.`, { years: y })
        : msg('disposal.fail', `Reenters after ${y} years: breaks both the FCC 5-year and NASA 25-year rules.`, { years: y });
  return { lifetimeYears: y, basis: lowerBound ? 'lower-bound' : 'computed', fcc, nasa, reason };
}

/** The 'disposal' fit verdict follows the FCC 5-year rule (the stricter one). */
export function disposalFit(d: DisposalVerdict): FitVerdict {
  return { check: 'disposal', pass: d.fcc.pass, reason: d.reason };
}
