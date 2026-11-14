import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFERENCE_MISSIONS } from '../src/closest';
import mockJson from './fixtures/mock-result.json';
import type { MissionDesign, PartSlot, RoleId, SimResult } from '../src/contracts';
import { addMonths } from '../src/dates';
import { simulate } from '../src/flight';
import { createEngine, decodeMission, encodeMission, setEngineData, simulate as moduleSimulate } from '../src/index';
import { createRng } from '../src/rng';
import { testEngineData } from './helpers/engine';

const data = testEngineData();
const base = mockJson.design as MissionDesign;
const run = (over: Partial<MissionDesign> = {}): SimResult => simulate({ ...base, ...over }, data);
const DAY = 86_400_000;

/** FNV-1a 32-bit over the JSON, for a compact identity check. */
function hash(r: SimResult): string {
  const s = JSON.stringify(r);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

function expectWellFormed(r: SimResult): void {
  const tl = r.timeline;
  expect(tl.length - 1).toBe(r.lifetimeDays);
  for (let i = 0; i < tl.length; i++) {
    const d = tl[i]!;
    for (const k of ['altitudeKm', 'densityKgM3', 'batteryPct', 'dataGeneratedMB', 'dataDownlinkedMB', 'dataStoredMB', 'dataLostMB'] as const)
      expect(Number.isFinite(d[k]), `${k} day ${i}`).toBe(true);
    if (i > 0) expect(Date.parse(d.date) - Date.parse(tl[i - 1]!.date)).toBe(DAY);
  }
  if (r.outcome.kind === 'reentered') expect(tl.at(-1)!.date).toBe(r.outcome.date);
  expect(r.planVsTruth.sunTookDays).toBe(r.planVsTruth.planLifetimeDays - r.planVsTruth.truthLifetimeDays);
  expect(r.causes.length).toBeGreaterThanOrEqual(3);
  expect(r.causes.length).toBeLessThanOrEqual(5);
  expect(r.causes.at(-1)!.id).toBe('verdict');
  for (const c of r.causes) expect(Number.isFinite(c.effect.value)).toBe(true);
  expect(r.fit.map((f) => f.check)).toEqual(['mass', 'volume', 'power', 'energy', 'budget', 'data', 'comms', 'rocket-capacity', 'rocket-orbit', 'launch-window', 'disposal']);
  expect(Object.keys(r.gauges).sort()).toEqual(['budget', 'comms', 'data', 'mass', 'power', 'time']);
  expect(r.score.requirements.map((q) => q.id)).toEqual(['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost']);
  expect(r.score.total).toBeGreaterThanOrEqual(0);
  expect(r.score.total).toBeLessThanOrEqual(100);
  expect(decodeMission(r.missionCode)).toEqual(r.design);
}

describe('simulate(): deterministic', () => {
  it('same design and seed give an identical result (hash), regardless of what ran before', () => {
    const a = run();
    run({ seed: 99, mode: 'plan', orbit: { type: 'ISS51.6', altitudeKm: 410 } });
    const b = run();
    expect(hash(b)).toBe(hash(a));
    expect(b).toEqual(a);
  });
  it('the seed drives the launch slip (truth): timeline starts at launch date + slip', () => {
    const starts = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const r = run({ seed });
      const first = r.timeline[0]!.date;
      expect(first >= base.launchDate && first <= addMonths(base.launchDate, 12)).toBe(true);
      starts.add(first);
    }
    expect(starts.size).toBeGreaterThan(1);
  });
});

describe('simulate(): results', () => {
  it('truth and plan are well formed; the 2019 forecast Sun promises a longer life than the real one', () => {
    const t = run({ seed: 7 });
    const p = run({ seed: 7, mode: 'plan' });
    expectWellFormed(t);
    expectWellFormed(p);
    expect(p.timeline[0]!.date).toBe(base.launchDate);
    expect(p.timeline.every((d) => d.stormKp === null && !d.forecast)).toBe(true);
    expect(t.planVsTruth).toEqual(p.planVsTruth);
    expect(t.planVsTruth.sunTookDays).toBeGreaterThan(0);
    expect(t.causes[0]).toMatchObject({ id: 'sun', sun: true });
    expect(t.timeline.some((d) => d.stormKp !== null)).toBe(true);
  });

  it('a satellite alive past Oct 2041 ends as ">= N years" with a lower-bound disposal verdict', () => {
    const r = run({ orbit: { type: 'SSO', altitudeKm: 800 }, launchDate: '2015-06-01', seed: 7 });
    expectWellFormed(r);
    expect(r.outcome.kind).toBe('alive-at-forecast-end');
    if (r.outcome.kind === 'alive-at-forecast-end') {
      expect(r.outcome.asOf).toBe('2041-10-15');
      expect(r.outcome.minYears).toBeGreaterThan(25);
    }
    expect(r.disposal).toMatchObject({ basis: 'lower-bound', fcc: { pass: false }, nasa: { pass: false } });
    expect(r.fit.find((f) => f.check === 'disposal')!.pass).toBe(false);
    expect(r.planVsTruth.truthIsLowerBound).toBe(true);
    expect(r.timeline.at(-1)!.forecast).toBe(true);
  });

  it('a truth flight that outlives the real data is "alive" with a predicted reentry on the forecast Sun', () => {
    const r = run({ orbit: { type: 'SSO', altitudeKm: 550 }, launchDate: '2025-01-15', seed: 7 });
    expectWellFormed(r);
    expect(r.outcome.kind).toBe('alive');
    if (r.outcome.kind === 'alive') expect(r.outcome.predictedReentry > '2026-10-29').toBe(true);
  });

  it('safe-mode turns the payload off on storm-alert days; ride-out keeps imaging', () => {
    const safe = run({ seed: 7, stormPolicy: 'safe-mode' });
    const ride = run({ seed: 7, stormPolicy: 'ride-out' });
    const alertDays = safe.timeline.filter((d) => d.stormKp !== null && d.stormKp >= 7);
    expect(alertDays.length).toBeGreaterThan(0);
    for (const d of alertDays) expect(d.dataGeneratedMB).toBe(0);
    expect(ride.timeline.filter((d) => d.stormKp !== null && d.stormKp >= 7).every((d) => d.dataGeneratedMB > 0)).toBe(true);
  });

  it('propulsion buys life: a 20 m/s cold-gas thruster outlives no propulsion', () => {
    const none = run({ seed: 7 });
    const fuel = run({ seed: 7, parts: { ...base.parts, fuel: 'coldgas-20' } });
    expect(fuel.lifetimeDays).toBeGreaterThan(none.lifetimeDays);
    const c = fuel.causes.find((x) => x.id === 'propulsion');
    expect(c?.effect.value ?? 0).toBeGreaterThan(0);
  });

  it('rejections still simulate and explain themselves', () => {
    const r = run({ rocketId: 'electron', orbit: { type: 'ISS51.6', altitudeKm: 410 }, seed: 7 });
    const orbit = r.fit.find((f) => f.check === 'rocket-orbit')!;
    expect(orbit.pass).toBe(false);
    expect(orbit.reason.en).toContain('Electron');
    expectWellFormed(r);
  });
});

describe('closest design', () => {
  it('every reference mission has a content/sources.csv row', () => {
    const ids = readFileSync(new URL('../../content/sources.csv', import.meta.url), 'utf8').split(String.fromCharCode(10)).slice(1).map((l) => l.split(',')[0]!.trim());
    for (const m of REFERENCE_MISSIONS) expect(ids).toContain(m.sourceId);
    expect(run({ seed: 7 }).closest).toMatchObject({ mission: 'FACSAT-2', sourceId: 'facsat2' });
  });
});

describe('engine API', () => {
  it('module simulate() needs setEngineData(); createEngine() gives the same result', () => {
    const d = { ...base, seed: 7 };
    setEngineData(data);
    expect(moduleSimulate(d)).toEqual(createEngine(data).simulate(d));
  });
});

describe('mission code', () => {
  const SLOTS: PartSlot[] = ['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel'];
  const ROLES: RoleId[] = ['systems-lead', 'science', 'power-spacecraft', 'orbit-comms'];
  const NAMES = ['Iyad', 'رناد', 'Dua ~ team-1', '', 'a,b=c%', '🚀'];

  function randomDesign(seed: number): MissionDesign {
    const g = createRng(seed);
    const pick = <T,>(xs: readonly T[]): T => xs[g.int(0, xs.length - 1)]!;
    const parts = Object.fromEntries(SLOTS.map((s) => [s, pick([`${s}-${g.int(0, 99)}`, 'none', 'x~y-z', 'قمر'])])) as MissionDesign['parts'];
    const d: MissionDesign = {
      scenarioId: pick(['angola', 'jeddah-floods']),
      parts,
      formFactor: pick(['1U', '3U', '6U'] as const),
      orbit: { type: pick(['SSO', 'ISS51.6'] as const), altitudeKm: pick([150, 410, 497, 512.5, 800]) },
      rocketId: pick(['electron', 'falcon9-rideshare', 'iss-deploy']),
      launchDate: `20${g.int(15, 26)}-${String(g.int(1, 12)).padStart(2, '0')}-${String(g.int(1, 28)).padStart(2, '0')}`,
      mode: pick(['plan', 'truth'] as const),
      seed: g.u32(),
    };
    if (g.next() < 0.5) d.stormPolicy = pick(['ride-out', 'safe-mode'] as const);
    if (g.next() < 0.5) {
      d.roles = {};
      for (const r of ROLES) if (g.next() < 0.7) d.roles[r] = pick(NAMES);
    }
    return d;
  }

  it('round-trips 100 random designs', () => {
    for (let i = 0; i < 100; i++) {
      const d = randomDesign(i);
      const code = encodeMission(d);
      expect(code).toMatch(/^SP1-[A-Za-z0-9_-]+$/);
      expect(decodeMission(code)).toEqual(d);
    }
  });

  it('rejects malformed codes', () => {
    const good = encodeMission(base);
    for (const bad of ['', 'SP2-' + good.slice(4), 'SP1-***', 'SP1-' + good.slice(4, 20), 'MOCK-NOT-DECODABLE']) {
      expect(() => decodeMission(bad), bad).toThrow();
    }
  });
});
