import { describe, expect, it } from 'vitest';
import golden from './fixtures/golden.json';
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

describe('golden 2: NASA DAS 6U curves at 430 and 550 km, 2021-2025, +/-30%', () => {
  it.todo('needs DAS reference lifetimes (not runnable here); disclosed in README Limits');
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
