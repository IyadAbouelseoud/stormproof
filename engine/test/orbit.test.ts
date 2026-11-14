import { describe, expect, it } from 'vitest';
import * as C from '../src/constants';
import { createRng } from '../src/rng';
import { eclipseFraction, fundaPasses, gsdM, periodS, revisitDays, ssoInclinationDeg, swathKm } from '../src/orbit';

describe('rng', () => {
  it('is deterministic per seed and uint32', () => {
    const a = createRng(42), b = createRng(42), c = createRng(43);
    const sa = Array.from({ length: 5 }, () => a.u32());
    expect(sa).toEqual(Array.from({ length: 5 }, () => b.u32()));
    expect(sa).not.toEqual(Array.from({ length: 5 }, () => c.u32()));
    for (const v of sa) expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true);
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const k = r.int(0, 12);
      expect(k >= 0 && k <= 12).toBe(true);
    }
  });
});

describe('constants', () => {
  it('every exported constant has a source tag', () => {
    const names = Object.keys(C).filter((k) => k !== 'SOURCES');
    for (const k of names) expect(C.SOURCES[k], k).toBeTruthy();
  });
});

describe('orbit', () => {
  it('period at 500 km is about 94.6 min', () => {
    expect(periodS(500) / 60).toBeCloseTo(94.6, 1);
  });
  it('SSO inclination via J2: 97.4 deg at 500 km, 98.2 at 700', () => {
    expect(ssoInclinationDeg(500)).toBeCloseTo(97.4, 1);
    expect(ssoInclinationDeg(700)).toBeCloseTo(98.2, 1);
  });
  it('eclipse fraction at beta 0, 500 km is about 0.38', () => {
    expect(eclipseFraction(500)).toBeCloseTo(0.377, 2);
  });
  it('GSD and swath scale with h/500', () => {
    expect(gsdM(5, 400)).toBeCloseTo(4);
    expect(swathKm(30, 600)).toBeCloseTo(36);
  });
  it('revisit falls with wider swath', () => {
    expect(revisitDays(60, 500, -16)).toBeLessThan(revisitDays(30, 500, -16));
  });
  it('Funda passes: plausible counts, deterministic', () => {
    const s = fundaPasses('SSO', 500);
    const i = fundaPasses('ISS51.6', 400);
    expect(s.passesPerDay).toBeGreaterThanOrEqual(2);
    expect(s.passesPerDay).toBeLessThanOrEqual(6);
    expect(s.contactMinPerDay).toBeGreaterThan(5);
    expect(s.contactMinPerDay).toBeLessThan(60);
    expect(i.passesPerDay).toBeGreaterThanOrEqual(1);
    expect(fundaPasses('SSO', 500)).toEqual(s);
  });
});
