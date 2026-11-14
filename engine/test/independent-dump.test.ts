/**
 * Final pass, Track 1: writes the engine's own numbers for qa/independent_check.py to compare against.
 * Runs only with QA_DUMP=1 (pnpm --filter @stormproof/engine exec vitest run test/independent-dump.test.ts);
 * otherwise skipped, so the normal test run writes no files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import golden from './fixtures/golden.json';
import { loadTable } from './helpers/data';
import { realEngineData } from './helpers/content';
import { AREA_TO_MASS_M2_KG, CD } from '../src/constants';
import type { MissionDesign } from '../src/contracts';
import { dayNum } from '../src/dates';
import { decay } from '../src/decay';
import { simulate } from '../src/flight';
import { eclipseFraction, periodS, ssoInclinationDeg } from '../src/orbit';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const END = dayNum('2041-10-15');

const design = (over: Partial<MissionDesign>): MissionDesign => ({
  scenarioId: 'angola',
  parts: { camera: 'camera-standard', panels: 'panels-large', battery: 'battery-medium', radio: 'radio-fast', computer: 'computer-standard', pointing: 'pointing-standard', fuel: 'fuel-small' },
  formFactor: '6U',
  orbit: { type: 'SSO', altitudeKm: 497 },
  rocketId: 'electron',
  launchDate: '2023-04-15',
  mode: 'plan',
  seed: 1,
  ...over,
});

describe.skipIf(env.QA_DUMP !== '1')('independent check: engine value dump', () => {
  it('writes qa/track1/engine_values.json', () => {
    const g = golden.facsat2;
    const cd6 = CD * AREA_TO_MASS_M2_KG['6U'];
    const run = (table: 'sso_truth' | 'sso_plan' | 'iss_truth' | 'iss_plan', launch: string, alt: number, cdAm: number, waypoints: string[] = []) => {
      const s = dayNum(launch);
      const r = decay(loadTable(table), s, alt, cdAm, END);
      return {
        table, launch, altKm: alt, cdAm,
        lifetimeDays: r.reentryDay === null ? null : r.reentryDay - s,
        waypoints: waypoints.map((d) => [d, r.daily.find((x) => x.day === dayNum(d))?.altKm ?? null]),
      };
    };
    const wp = (g.waypoints as [string, number][]).map((w) => w[0]);
    const sim = (d: MissionDesign) => {
      const r = simulate(d, realEngineData());
      return {
        design: d,
        gauges: Object.fromEntries(Object.entries(r.gauges).map(([k, v]) => [k, { value: v.value, limit: v.limit }])),
        fit: Object.fromEntries(r.fit.map((f) => [f.check, f.pass])),
        lifetimeDays: r.lifetimeDays,
        planLifetimeDays: r.planVsTruth.planLifetimeDays,
        outcome: r.outcome,
      };
    };
    const out = {
      orbit: [210, 430, 497, 550].map((alt) => ({ altKm: alt, periodS: periodS(alt), ssoInclinationDeg: ssoInclinationDeg(alt), eclipseFraction: eclipseFraction(alt) })),
      decay: {
        facsat2_truth: run('sso_truth', g.launch, g.altKm, 1 / g.fittedBallisticCoefficientKgM2, wp),
        facsat2_plan: run('sso_plan', g.launch, g.altKm, 1 / g.fittedBallisticCoefficientKgM2),
        das_430_2021: run('iss_truth', '2021-01-01', 430, cd6),
        das_550_2021: run('iss_truth', '2021-01-01', 550, cd6),
        starlink_truth: run('sso_truth', '2022-02-03', 210, cd6),
        starlink_plan: run('sso_plan', '2022-02-03', 210, cd6),
      },
      simulate: {
        sixU_497_plan: sim(design({})),
        oversized_1U: sim(design({
          formFactor: '1U', orbit: { type: 'SSO', altitudeKm: 500 }, launchDate: '2021-06-01',
          parts: { camera: 'camera-sharp', panels: 'panels-large', battery: 'battery-large', radio: 'radio-fast', computer: 'computer-large', pointing: 'pointing-precise', fuel: 'fuel-large' },
        })),
      },
    };
    const dir = new URL('../../qa/track1/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL('engine_values.json', dir), JSON.stringify(out, null, 1));
    expect(out.decay.facsat2_truth.lifetimeDays).not.toBeNull();
  });
});
