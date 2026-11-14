import { describe, expect, it } from 'vitest';
import stub from './fixtures/content-stub.json';
import { loadJson } from './helpers/data';
import type { Content } from '../src/catalog';
import { dayNum } from '../src/dates';
import { launchSlipMonths, resolveStorms, stormAlerts, type Storm } from '../src/events';
import { createRng } from '../src/rng';
import { disposalFit, disposalVerdict, gauge } from '../src/rules';
import { score } from '../src/score';

const content = stub as unknown as Content;
const storms = loadJson<{ storms: Storm[] }>('storms.json').storms;

describe('rules', () => {
  it('CML 35%: gauge states ok / warn / fail', () => {
    expect(gauge('mass', 8, 12, 'kg', 35).state).toBe('ok'); // 50%
    expect(gauge('mass', 10, 12, 'kg', 35).state).toBe('warn'); // 20%
    expect(gauge('mass', 13, 12, 'kg', 35).state).toBe('fail');
    expect(gauge('time', 900, 1095, 'days', 0, 'min').state).toBe('fail');
  });
  it('disposal: FCC 5 y and NASA 25 y', () => {
    expect(disposalVerdict(900, false)).toMatchObject({ fcc: { pass: true }, nasa: { pass: true }, basis: 'computed' });
    expect(disposalVerdict(10 * 365.25, false)).toMatchObject({ fcc: { pass: false }, nasa: { pass: true } });
    expect(disposalVerdict(30 * 365.25, false)).toMatchObject({ fcc: { pass: false }, nasa: { pass: false } });
    const lb = disposalVerdict(15 * 365.25, true);
    expect(lb).toMatchObject({ basis: 'lower-bound', fcc: { pass: false } });
    expect(disposalFit(lb).pass).toBe(false);
  });
});

describe('events', () => {
  it('launch slip is seeded and within 0..12 months', () => {
    const a = Array.from({ length: 200 }, (_, i) => launchSlipMonths(createRng(i)));
    expect(Math.min(...a)).toBe(0);
    expect(Math.max(...a)).toBeLessThanOrEqual(12);
    expect(launchSlipMonths(createRng(99))).toBe(launchSlipMonths(createRng(99)));
  });
  it('storm alerts come from DONKI storms.json (May 2024 G5 is in)', () => {
    const al = stormAlerts(storms, dayNum('2024-05-01'), dayNum('2024-05-31'));
    expect(al.some((s) => s.day === dayNum('2024-05-10') || s.day === dayNum('2024-05-11'))).toBe(true);
    for (const s of al) expect(s.kp).toBeGreaterThanOrEqual(7);
  });
  it('vote outcome follows stormPolicy', () => {
    const al = stormAlerts(storms, dayNum('2023-01-01'), dayNum('2025-12-31'));
    const safe = resolveStorms(al, 'safe-mode', createRng(1));
    expect(safe.every((o) => o.payloadOff && !o.bufferLost)).toBe(true);
    const ride = resolveStorms(al, undefined, createRng(1));
    expect(ride.every((o) => !o.payloadOff)).toBe(true);
    expect(resolveStorms(al, 'ride-out', createRng(1))).toEqual(ride);
  });
});

describe('score', () => {
  it('requirements first in contract order; total 0..100', () => {
    const s = score(content.scenarios[0]!, { revisitDays: 9, gsdM: 5, dataDeliveredGB: 1600, lifetimeDays: 936, costUsd: 1.2e6, truthOverPlan: 936 / 1479 });
    expect(s.requirements.map((r) => r.id)).toEqual(['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost']);
    expect(s.requirementsMet).toBe(4);
    expect(s.total).toBe(4 * 16 + Math.round(20 * (936 / 1479)));
  });
});
