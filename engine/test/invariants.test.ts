/**
 * Final pass, Track 1: physical invariants of simulate() on the real catalog and on the stub.
 * (Determinism and mission-code round trips for 100 random designs are in simulate.test.ts.)
 */
import { describe, expect, it } from 'vitest';
import mockJson from './fixtures/mock-result.json';
import type { MissionDesign, SimResult } from '../src/contracts';
import { simulate, type EngineData } from '../src/flight';
import { decodeMission, encodeMission } from '../src/index';
import { createRng } from '../src/rng';
import { launchSlipMonths } from '../src/events';
import { realEngineData } from './helpers/content';
import { testEngineData } from './helpers/engine';

const real = realEngineData();
const stub = testEngineData();

function hash(r: SimResult): string {
  const s = JSON.stringify(r);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

/** Seeded random valid design on the real catalog. */
function randomDesign(seed: number): MissionDesign {
  const rng = createRng(seed);
  const pick = <T>(xs: T[]): T => xs[rng.int(0, xs.length - 1)]!;
  const scenarioId = pick(['angola', 'jeddah-flood']);
  const slot = (s: string) => pick(real.content.parts.filter((p) => p.slot === s && (!p.scenarios || p.scenarios.includes(scenarioId)))).id;
  const y = rng.int(2015, 2026);
  const m = rng.int(1, y === 2026 ? 10 : 12);
  return {
    scenarioId,
    parts: { camera: slot('camera'), panels: slot('panels'), battery: slot('battery'), radio: slot('radio'), computer: slot('computer'), pointing: slot('pointing'), fuel: slot('fuel') },
    formFactor: pick(['1U', '3U', '6U'] as const),
    orbit: { type: pick(['SSO', 'ISS51.6'] as const), altitudeKm: rng.int(15, 80) * 10 },
    rocketId: pick(real.content.rockets).id,
    launchDate: `${y}-${String(m).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
    mode: pick(['plan', 'truth'] as const),
    seed: rng.u32(),
    stormPolicy: pick(['ride-out', 'safe-mode'] as const),
  };
}

describe('invariants on 60 random designs (real catalog)', () => {
  const runs = Array.from({ length: 60 }, (_, i) => simulate(randomDesign(1000 + i), real));

  it('battery stays within 0..100% and no data quantity is negative', () => {
    const bad: string[] = [];
    for (const r of runs) for (const d of r.timeline) {
      if (!(d.batteryPct >= 0 && d.batteryPct <= 100)) bad.push(`${r.missionCode} ${d.date} battery ${d.batteryPct}`);
      for (const k of ['dataGeneratedMB', 'dataDownlinkedMB', 'dataStoredMB', 'dataLostMB'] as const) if (!(d[k] >= 0)) bad.push(`${r.missionCode} ${d.date} ${k} ${d[k]}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('every altitude gain is a propulsion reboost (never above the design altitude)', () => {
    const bad: string[] = [];
    for (const r of runs) for (let i = 1; i < r.timeline.length; i++) {
      const now = r.timeline[i]!.altitudeKm;
      if (now > r.timeline[i - 1]!.altitudeKm && now > r.design.orbit.altitudeKm) bad.push(`${r.missionCode} ${r.timeline[i]!.date} ${now} km`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('same design and seed: byte-identical SimResult, hashed 3 times', () => {
    for (const r of runs.slice(0, 20)) {
      const h = [0, 1, 2].map(() => hash(simulate(JSON.parse(JSON.stringify(r.design)) as MissionDesign, real)));
      expect(new Set([hash(r), ...h]).size).toBe(1);
    }
  });

  it('mission codes round-trip and re-simulate to the same hash', () => {
    for (const r of runs.slice(0, 20)) {
      const back = decodeMission(encodeMission(r.design));
      expect(back).toEqual(r.design);
      expect(hash(simulate(back, real))).toBe(hash(r));
    }
  });
});

describe('invariants without propulsion (stub catalog, no fuel)', () => {
  const base = mockJson.design as MissionDesign;
  it('altitude never rises', () => {
    const bad: string[] = [];
    for (const alt of [210, 350, 500, 650]) for (const mode of ['plan', 'truth'] as const) {
      const r = simulate({ ...base, mode, orbit: { type: 'SSO', altitudeKm: alt } }, stub);
      for (let i = 1; i < r.timeline.length; i++) if (r.timeline[i]!.altitudeKm > r.timeline[i - 1]!.altitudeKm) bad.push(`${alt} ${mode} ${r.timeline[i]!.date}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('plan and truth are identical when the Sun data is identical', () => {
  const sameSun: EngineData = { ...real, tables: { ...real.tables, sso_plan: real.tables.sso_truth, iss_plan: real.tables.iss_truth } };
  // A seed whose launch slip is 0 months, so both flights start on the same day.
  let seed = 0;
  while (launchSlipMonths(createRng(seed)) !== 0) seed++;
  it('same lifetime, same altitudes, the Sun took 0 days', () => {
    for (const alt of [300, 420, 500]) {
      const d: MissionDesign = { ...randomDesign(7), scenarioId: 'angola', orbit: { type: 'SSO', altitudeKm: alt }, launchDate: '2021-03-01', seed, stormPolicy: 'ride-out' };
      d.parts.camera = 'camera-standard';
      const plan = simulate({ ...d, mode: 'plan' }, sameSun);
      const truth = simulate({ ...d, mode: 'truth' }, sameSun);
      expect(truth.planVsTruth.sunTookDays).toBe(0);
      expect(truth.lifetimeDays).toBe(plan.lifetimeDays);
      expect(truth.timeline.map((x) => x.altitudeKm)).toEqual(plan.timeline.map((x) => x.altitudeKm));
    }
  });
});

declare function btoa(s: string): string;
describe('mission code: tampered codes are rejected cleanly (final pass, Track 6 finding)', () => {
  const d = randomDesign(3);
  const body = (fields: string[]) => 'SP1-' + btoa(fields.join('~')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fields = (over: Record<number, string>) => {
    const f = [d.scenarioId, ...Object.values(d.parts), d.formFactor, 'S', '500', d.rocketId, '2023-04-15', 't', '1', '', ''];
    for (const [i, v] of Object.entries(over)) f[Number(i)] = v;
    return body(f);
  };
  it('the hand-built code decodes when untouched', () => {
    expect(decodeMission(fields({})).orbit.altitudeKm).toBe(500);
  });
  it.each([
    ['a broken percent escape in an id', { 0: 'ango%ZZla' }, 'mission code: bad text'],
    ['a launch year far outside the timeline', { 12: '2619-12-19' }, 'mission code: bad date'],
    ['a date that is not on the calendar', { 12: '2023-02-31' }, 'mission code: bad date'],
    ['a negative altitude', { 10: '-500' }, 'mission code: bad number'],
    ['an exponent altitude', { 10: '5e9' }, 'mission code: bad number'],
  ] as [string, Record<number, string>, string][])('%s', (_name, over, message) => {
    expect(() => decodeMission(fields(over))).toThrow(message);
  });
  it('encoding a design outside the launch timeline gives a code that does not decode', () => {
    expect(() => decodeMission(encodeMission({ ...d, launchDate: '2041-12-01' }))).toThrow('mission code: bad date');
  });
});
