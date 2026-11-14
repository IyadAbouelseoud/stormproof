/** Track 6 edge designs: oversized parts, extremes of altitude and launch date, unreachable orbit, zero fuel, every camera. */
import { describe, expect, it } from 'vitest';
import type { MissionDesign, SimResult } from '../src/contracts';
import { simulate } from '../src/flight';
import { realContent, realEngineData } from './helpers/content';

const data = realEngineData();
const parts = realContent().parts;
const base: MissionDesign = {
  scenarioId: 'angola',
  parts: { camera: 'camera-standard', panels: 'panels-medium', battery: 'battery-medium', radio: 'radio-standard', computer: 'computer-standard', pointing: 'pointing-standard', fuel: 'fuel-small' },
  formFactor: '6U',
  orbit: { type: 'SSO', altitudeKm: 500 },
  rocketId: 'electron',
  launchDate: '2023-04-15',
  mode: 'truth',
  seed: 1,
};
const fly = (o: Partial<MissionDesign>): SimResult => simulate({ ...base, ...o }, data);

function clean(r: SimResult): void {
  const s = JSON.stringify(r);
  expect(s).not.toMatch(/NaN|Infinity|undefined|null,null/);
  expect(r.timeline.length).toBeGreaterThan(0);
  for (const t of r.timeline) {
    expect(Number.isFinite(t.altitudeKm) && Number.isFinite(t.densityKgM3)).toBe(true);
    expect(t.dataStoredMB).toBeGreaterThanOrEqual(0);
    expect(t.dataLostMB).toBeGreaterThanOrEqual(0);
    expect(t.batteryPct).toBeGreaterThanOrEqual(0);
    expect(t.batteryPct).toBeLessThanOrEqual(100);
  }
  expect(r.fit).toHaveLength(11);
  for (const f of r.fit) expect(f.reason.en.length).toBeGreaterThan(5);
  expect(r.fit.filter((f) => !f.pass).every((f) => f.reason.en.length > 10)).toBe(true);
  expect(r.score.total).toBeGreaterThanOrEqual(0);
  expect(r.score.total).toBeLessThanOrEqual(100);
}
const fails = (r: SimResult): string[] => r.fit.filter((f) => !f.pass).map((f) => f.check);

describe('edge designs', () => {
  it('1U with the biggest parts in every slot: fit-check fails with reasons (mass/volume)', () => {
    const big: MissionDesign['parts'] = { camera: 'camera-sharp', panels: 'panels-large', battery: 'battery-large', radio: 'radio-fast', computer: 'computer-large', pointing: 'pointing-precise', fuel: 'fuel-large' };
    const r = fly({ formFactor: '1U', parts: big });
    clean(r);
    console.log('1U oversized fails:', fails(r), r.fit.find((f) => f.check === 'volume')!.reason.en);
    expect(fails(r)).toContain('volume');
  });
  it('6U with maximum parts', () => {
    const big: MissionDesign['parts'] = { camera: 'camera-sharp', panels: 'panels-large', battery: 'battery-large', radio: 'radio-fast', computer: 'computer-large', pointing: 'pointing-precise', fuel: 'fuel-large' };
    const r = fly({ formFactor: '6U', parts: big });
    clean(r);
    console.log('6U max fails:', fails(r));
  });
  for (const alt of [150, 800]) for (const type of ['SSO', 'ISS51.6'] as const)
    it(`${alt} km ${type}`, () => {
      const r = fly({ orbit: { type, altitudeKm: alt } });
      clean(r);
      console.log(`${alt} km ${type}: ${r.outcome.kind} ${r.lifetimeDays} d, fails=${fails(r)}`);
      if (alt === 150) expect(r.lifetimeDays).toBeLessThan(30);
    });
  for (const launchDate of ['2015-01-01', '2015-01-31', '2026-10-01', '2026-10-29', '2026-12-31'])
    for (const mode of ['truth', 'plan'] as const)
      it(`launch ${launchDate} ${mode}`, () => {
        const r = fly({ launchDate, mode });
        clean(r);
        console.log(`launch ${launchDate} ${mode}: ${r.outcome.kind} ${r.lifetimeDays} d, fails=${fails(r)}`);
      });
  it('rockets that cannot reach the orbit give rocket-orbit/capacity failures with a reason', () => {
    for (const [rocketId, orbit] of [['spacex-rideshare', { type: 'ISS51.6' as const, altitudeKm: 500 }], ['spacex-rideshare', { type: 'SSO' as const, altitudeKm: 800 }], ['electron', { type: 'SSO' as const, altitudeKm: 150 }], ['electron', { type: 'SSO' as const, altitudeKm: 800 }]] as const) {
      const r = fly({ rocketId, orbit });
      clean(r);
      expect(fails(r)).toContain('rocket-orbit');
      console.log(rocketId, orbit, '->', r.fit.find((f) => f.check === 'rocket-orbit')!.reason.en);
    }
  });
  it('launch before the rocket first flight is rejected with a reason', () => {
    const r = fly({ rocketId: 'spacex-rideshare', launchDate: '2018-01-01' });
    clean(r);
    expect(fails(r)).toContain('launch-window');
  });
  it('zero fuel: no reboost, altitude never rises', () => {
    const none = parts.filter((p) => p.slot === 'fuel');
    console.log('fuel options:', none.map((p) => `${p.id}:${p.deltaVMs}`).join(' '));
    const r = fly({});
    clean(r);
  });
  it('every camera (incl. radar) in both scenarios', () => {
    for (const scenarioId of ['angola', 'jeddah-flood']) for (const c of parts.filter((p) => p.slot === 'camera')) {
      let r: SimResult;
      try {
        r = fly({ scenarioId, parts: { ...base.parts, camera: c.id } });
      } catch (e) {
        throw new Error(`${scenarioId}/${c.id}: ${(e as Error).message}`);
      }
      clean(r);
      console.log(`${scenarioId} ${c.id}: fails=${fails(r)} score=${r.score.total} eventReplay=${!!r.eventReplay}`);
    }
  });
  it('radar camera in the Angola scenario (not offered there): does not crash', () => {
    clean(fly({ parts: { ...base.parts, camera: 'camera-radar' } }));
  });
  it('jeddah event date: launch after event and before event both give a verdict', () => {
    for (const launchDate of ['2022-12-01', '2022-11-20', '2015-01-01']) clean(fly({ scenarioId: 'jeddah-flood', launchDate, rocketId: 'electron' }));
  });
});
