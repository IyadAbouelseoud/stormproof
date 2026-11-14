/**
 * Density lookup in the pre-computed NRLMSIS 2.1 tables (pipeline/build_density.py, density_meta.json).
 * log10(rho) is interpolated linearly in time (between table rows) and altitude (10 km columns);
 * outside 150-800 km the end-column log slope is extrapolated.
 */
import { dayNum } from './dates';

export interface DensityMetaTable {
  file: string;
  rows: number;
  axis: {
    daily: { start: string; end: string; rows: number } | null;
    monthly: { start: string; end: string; rows: number; day_of_month: number; forecast: boolean };
  };
}

export interface DensityMeta {
  alt_km: { start: number; step: number; count: number };
  tables: Record<string, DensityMetaTable>;
}

export interface DensityTable {
  logRho: Float32Array;
  /** Day number (days since 1970) of each row. */
  rowDay: Float64Array;
  altStart: number;
  altStep: number;
  nAlt: number;
  /** Day number after which rows are forecast (Infinity if none). */
  forecastFromDay: number;
}

export function makeTable(meta: DensityMeta, name: string, logRho: Float32Array): DensityTable {
  const t = meta.tables[name];
  if (!t) throw new Error(`no density table ${name}`);
  const { start, step, count } = meta.alt_km;
  if (logRho.length !== t.rows * count) throw new Error(`${name}: ${logRho.length} values, expected ${t.rows * count}`);
  const rowDay = new Float64Array(t.rows);
  let i = 0;
  if (t.axis.daily) {
    const d0 = dayNum(t.axis.daily.start);
    for (; i < t.axis.daily.rows; i++) rowDay[i] = d0 + i;
  }
  const m0 = t.axis.monthly.start;
  const [y0, mo0] = m0.split('-').map(Number) as [number, number];
  for (let k = 0; i < t.rows; i++, k++) rowDay[i] = Date.UTC(y0, mo0 - 1 + k, t.axis.monthly.day_of_month) / 86_400_000;
  const forecastFromDay = t.axis.monthly.forecast && t.axis.daily ? dayNum(t.axis.daily.end) : Infinity;
  return { logRho, rowDay, altStart: start, altStep: step, nAlt: count, forecastFromDay };
}

function logAt(tab: DensityTable, row: number, altKm: number): number {
  const x = (altKm - tab.altStart) / tab.altStep;
  const j = Math.min(Math.max(Math.floor(x), 0), tab.nAlt - 2);
  const f = x - j;
  const base = row * tab.nAlt;
  const a = tab.logRho[base + j]!;
  const b = tab.logRho[base + j + 1]!;
  return a + (b - a) * f;
}

/** Orbit-averaged density (kg/m^3) at a fractional day number and altitude. */
export function densityAt(tab: DensityTable, day: number, altKm: number): number {
  const rd = tab.rowDay;
  const n = rd.length;
  let lo: number;
  let f: number;
  if (day <= rd[0]!) {
    lo = 0;
    f = 0;
  } else if (day >= rd[n - 1]!) {
    lo = n - 2;
    f = 1;
  } else {
    let a = 0;
    let b = n - 1;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (rd[m]! <= day) a = m;
      else b = m;
    }
    lo = a;
    f = (day - rd[a]!) / (rd[b]! - rd[a]!);
  }
  const l0 = logAt(tab, lo, altKm);
  const l1 = logAt(tab, lo + 1, altKm);
  return Math.pow(10, l0 + (l1 - l0) * f);
}

/** Last day with table data. */
export const tableEndDay = (tab: DensityTable): number => tab.rowDay[tab.rowDay.length - 1]!;
