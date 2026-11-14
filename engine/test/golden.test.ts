import { describe, expect, it } from 'vitest';
import golden from './fixtures/golden.json';
import das from './fixtures/das-6u-reference.json';
import { loadTable } from './helpers/data';
import { CD, AREA_TO_MASS_M2_KG } from '../src/constants';
import { dayNum, isoOf } from '../src/dates';
import { decay } from '../src/decay';
import type { DensityTable } from '../src/drag';

const END = dayNum('2041-10-15');
const truth = loadTable('sso_truth');
const plan = loadTable('sso_plan');

describe('golden 1: FACSAT-2 (6U, 497 km SSO, launched 2023-04-15)', () => {
  const g = golden.facsat2;
  const start = dayNum(g.launch);

  it('fitted ballistic coefficient stays inside the +/-20% band (one fit, disclosed)', () => {
    expect(Math.abs(g.fittedBallisticCoefficientKgM2 / g.ballisticCoefficientKgM2 - 1)).toBeLessThanOrEqual(g.betaTolerance);
  });

  const r = decay(truth, start, g.altKm, 1 / g.fittedBallisticCoefficientKgM2, END);

  it(`reenters within +/-${g.reentryToleranceDays} days of ${g.reentry}`, () => {
    expect(r.reentryDay).not.toBeNull();
    console.log(`FACSAT-2 truth reentry ${isoOf(r.reentryDay!)} (${(r.reentryDay! - start).toFixed(0)} d)`);
    expect(Math.abs(r.reentryDay! - dayNum(g.reentry))).toBeLessThanOrEqual(g.reentryToleranceDays);
  });

  for (const [date, km] of g.waypoints as [string, number][]) {
    it(`about ${km} km near ${date} (+/-${g.waypointToleranceKm} km)`, () => {
      const s = r.daily.find((d) => d.day === dayNum(date));
      expect(s).toBeDefined();
      expect(Math.abs(s!.altKm - km)).toBeLessThanOrEqual(g.waypointToleranceKm);
    });
  }

  it('plan (2019 forecast Sun) lives longer than truth; ratio reported vs paper 1.52', () => {
    const p = decay(plan, start, g.altKm, 1 / g.fittedBallisticCoefficientKgM2, END);
    const ratio = (p.reentryDay! - start) / (r.reentryDay! - start);
    console.log(`FACSAT-2 plan/truth lifetime ratio ${ratio.toFixed(2)} (paper ${g.paperPlanTruthRatio})`);
    expect(ratio).toBeGreaterThan(1);
  });
});

describe('golden 2: NASA DAS 6U curves at 430 and 550 km (51.6 deg), +/-30%', () => {
  // Reference: fixtures/das-6u-reference.json (chart-read from NASA LSP deck NTRS 20240003618; see its caveats).
  // Launch on 1 Jan of each year (the deck does not say; same date for all years, not tuned). No fitting.
  const c = das.curves_6U_lifetime_years;
  const iss = loadTable('iss_truth');
  const cdAm = CD * AREA_TO_MASS_M2_KG['6U'];
  const TOL = 0.3;
  // KNOWN FAILS (disclosed in README Limits; decided by Iyad 2026-11-14). Same +/-30% assertion, marked it.fails
  // so they stay visible and CI stays green; if one starts passing, its test breaks and this list must be updated.
  const KNOWN_FAIL = new Set(['430:2039', '550:2033', '550:2034']);
  const life = (alt: number, year: number) => {
    const s = dayNum(`${year}-01-01`);
    if (s >= END) return null;
    const r = decay(iss, s, alt, cdAm, END);
    return { years: ((r.reentryDay ?? END) - s) / 365.25, lowerBound: r.reentryDay === null };
  };
  const series = (alt: 430 | 550) => c.launch_year.map((y, i) => ({ year: y, das: (alt === 430 ? c.alt_430_km : c.alt_550_km)[i]!, ours: life(alt, y) }));
  const s430 = series(430);
  const s550 = series(550);

  for (const [alt, ser] of [[430, s430], [550, s550]] as const) {
    it(`${alt} km, launch years 2021-2026: informational only (DAS used a 2023 prediction, we fly the real Sun)`, () => {
      for (const p of ser.filter((q) => q.year <= 2026)) console.log(`DAS ${alt} km ${p.year}: DAS ${p.das} y, ours ${p.ours!.years.toFixed(2)} y, ratio ${(p.ours!.years / p.das).toFixed(2)}`);
    });
    for (const p of ser.filter((q) => q.year >= 2027)) {
      const o = p.ours;
      if (!o) {
        it.skip(`${alt} km, launch ${p.year}: not evaluable (launch after the forecast ends, Oct 2041)`, () => {});
      } else if (o.lowerBound) {
        it(`${alt} km, launch ${p.year}: lower bound ${o.years.toFixed(2)} y (alive at forecast end) is not above DAS ${p.das} y +30%`, () => {
          expect(o.years).toBeLessThanOrEqual(p.das * (1 + TOL));
        });
      } else {
        const known = KNOWN_FAIL.has(`${alt}:${p.year}`);
        (known ? it.fails : it)(`${known ? 'KNOWN FAIL: ' : ''}${alt} km, launch ${p.year}: ${o.years.toFixed(2)} y within +/-30% of DAS ${p.das} y (ratio ${(o.years / p.das).toFixed(2)})`, () => {
          expect(Math.abs(o.years / p.das - 1)).toBeLessThanOrEqual(TOL);
        });
      }
    }
  }

  it('shape: 430 km life peaks near 2029-2030 and is lowest near 2035', () => {
    const val = (y: number) => s430.find((p) => p.year === y)!.ours!.years;
    const argmax = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033].reduce((a, b) => (val(b) > val(a) ? b : a));
    const argmin = [2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038].reduce((a, b) => (val(b) < val(a) ? b : a));
    expect(argmax).toBeGreaterThanOrEqual(2028);
    expect(argmax).toBeLessThanOrEqual(2031);
    expect(argmin).toBeGreaterThanOrEqual(2034);
    expect(argmin).toBeLessThanOrEqual(2036);
  });

  it('shape: 550 km life rises between launch years 2033 and 2034', () => {
    const a = s550.find((p) => p.year === 2033)!.ours!;
    const b = s550.find((p) => p.year === 2034)!.ours!;
    console.log(`550 km 2033 -> 2034: ours ${a.years.toFixed(2)} -> ${b.years.toFixed(2)} y (DAS 6.85 -> 9.58)`);
    expect(b.years).toBeGreaterThan(a.years);
  });

  it('shape: 550 km outlives 430 km for the same launch year', () => {
    for (let i = 0; i < c.launch_year.length; i++) {
      const lo = s430[i]!.ours;
      const hi = s550[i]!.ours;
      if (!lo || !hi || (lo.lowerBound && hi.lowerBound)) continue;
      expect(hi.years, String(c.launch_year[i])).toBeGreaterThan(lo.years);
    }
  });
});

describe('golden 3: Starlink trap (Feb 2022 storm)', () => {
  const g = golden.starlink;
  const cdAm = CD * AREA_TO_MASS_M2_KG['6U'];
  const start = dayNum(g.date);

  it(`a circular ${g.altKm} km orbit on ${g.date} reenters within days in truth, sooner than plan`, () => {
    const t = decay(truth, start, g.altKm, cdAm, END);
    const p = decay(plan, start, g.altKm, cdAm, END);
    const tDays = t.reentryDay! - start;
    const pDays = p.reentryDay! - start;
    console.log(`Starlink trap: truth ${tDays.toFixed(2)} d, plan ${pDays.toFixed(2)} d`);
    expect(tDays).toBeLessThanOrEqual(g.maxTruthDays);
    expect(tDays).toBeLessThan(pDays);
  });

  it(`at ${g.lifeAltKm} km the storm costs under 1% of life`, () => {
    const uncorrected: DensityTable = { ...truth, logRho: truth.logRho.slice() };
    const d0 = truth.rowDay[0]!;
    for (const d of g.stormDays) {
      const row = dayNum(d) - d0;
      for (let j = 0; j < truth.nAlt; j++) uncorrected.logRho[row * truth.nAlt + j]! -= Math.log10(g.stormFactor);
    }
    const a = decay(truth, start, g.lifeAltKm, cdAm, END);
    const b = decay(uncorrected, start, g.lifeAltKm, cdAm, END);
    const la = a.reentryDay! - start;
    const lb = b.reentryDay! - start;
    console.log(`500 km life with storm ${la.toFixed(1)} d, without ${lb.toFixed(1)} d, cost ${((1 - la / lb) * 100).toFixed(3)}%`);
    expect(la).toBeLessThan(lb);
    expect(1 - la / lb).toBeLessThan(g.maxStormLifeCostFraction);
  });
});
