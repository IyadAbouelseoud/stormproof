import type { Part } from './catalog';
import { BATTERY_DOD, CELL_EFFICIENCY, SOLAR_CONSTANT_W_M2 } from './constants';
import { eclipseFraction, periodS } from './orbit';

export interface PowerBudget {
  /** Orbit-average generation, W. */
  genW: number;
  /** Orbit-average load, W. */
  loadW: number;
  /** (gen - load) / load, percent. */
  marginPct: number;
  eclipseMin: number;
  /** Energy drawn from the battery per eclipse, Wh. */
  eclipseNeedWh: number;
  /** capacity * depth of discharge, Wh. */
  usableWh: number;
  /** (usable - need) / need, percent. */
  energyMarginPct: number;
  /** Fraction of the day the payload can run on the available power, 0..1. */
  payloadDuty: number;
  /** Lowest state of charge per orbit, percent. */
  minSocPct: number;
}

export function powerBudget(parts: Part[], altKm: number): PowerBudget {
  const ecl = eclipseFraction(altKm);
  const area = parts.reduce((s, p) => s + (p.effectiveAreaM2 ?? 0), 0);
  const capacityWh = parts.reduce((s, p) => s + (p.capacityWh ?? 0), 0);
  const genW = SOLAR_CONSTANT_W_M2 * CELL_EFFICIENCY * area * (1 - ecl);
  const loadW = parts.reduce((s, p) => s + p.powerW, 0);
  const eclipseMin = (ecl * periodS(altKm)) / 60;
  const eclipseNeedWh = (loadW * eclipseMin) / 60;
  const usableWh = capacityWh * BATTERY_DOD;
  return {
    genW,
    loadW,
    marginPct: loadW > 0 ? ((genW - loadW) / loadW) * 100 : 100,
    eclipseMin,
    eclipseNeedWh,
    usableWh,
    energyMarginPct: eclipseNeedWh > 0 ? ((usableWh - eclipseNeedWh) / eclipseNeedWh) * 100 : 100,
    payloadDuty: loadW > 0 ? Math.min(1, genW / loadW) : 1,
    minSocPct: capacityWh > 0 ? Math.max(0, 100 - (eclipseNeedWh / capacityWh) * 100) : 0,
  };
}
