import { describe, expect, it } from 'vitest';
import stub from './fixtures/content-stub.json';
import type { Content } from '../src/catalog';
import type { MissionDesign } from '../src/contracts';
import { commsDay, downlinkMBPerDay } from '../src/comms';
import { fitCheck, resolveDesign } from '../src/launch';
import { fundaPasses } from '../src/orbit';
import { powerBudget } from '../src/power';

const content = stub as unknown as Content;
const base: MissionDesign = {
  scenarioId: 'angola',
  parts: { camera: 'cam-ms-5m', panels: 'panels-deploy-4', battery: 'batt-77wh', radio: 'radio-xband', computer: 'obc-standard', pointing: 'adcs-3axis', fuel: 'none' },
  formFactor: '6U', orbit: { type: 'SSO', altitudeKm: 500 }, rocketId: 'falcon9-rideshare',
  launchDate: '2023-04-15', mode: 'truth', seed: 1,
};

function fit(d: MissionDesign, c: Content = content) {
  const res = resolveDesign(d, c);
  const power = powerBudget(res.parts, d.orbit.altitudeKm);
  const passes = fundaPasses(d.orbit.type, d.orbit.altitudeKm);
  return fitCheck({
    design: d, res, power, passesPerDay: passes.passesPerDay,
    dataGenMBPerDay: res.byslot.camera!.dataMBPerDay! * power.payloadDuty,
    downlinkMBPerDay: downlinkMBPerDay(res.byslot.radio!.downlinkMbps!, passes.contactMinPerDay),
  });
}
const failed = (d: MissionDesign, c: Content = content) => fit(d, c).filter((v) => !v.pass).map((v) => v.check);

describe('power', () => {
  it('generation = 1361 W/m2 * 30% * area * sunlit fraction; margins computed', () => {
    const res = resolveDesign(base, content);
    const p = powerBudget(res.parts, 500);
    expect(p.genW).toBeCloseTo(1361 * 0.3 * 0.11 * (1 - 0.3772), 0);
    expect(p.loadW).toBeCloseTo(9.8, 5);
    expect(p.marginPct).toBeGreaterThan(35);
    expect(p.energyMarginPct).toBeGreaterThan(35);
  });
});

describe('comms', () => {
  it('downlink capacity from rate and contact time', () => {
    expect(downlinkMBPerDay(10, 10)).toBeCloseTo(750);
  });
  it('bucket overflows past storage and conserves data', () => {
    const d = commsDay(7000, 3000, 1000, 8000);
    expect(d.downlinkedMB).toBe(1000);
    expect(d.storedMB).toBe(8000);
    expect(d.lostMB).toBe(1000);
    expect(d.downlinkedMB + d.storedMB + d.lostMB).toBe(7000 + 3000);
  });
});

describe('launch fit check', () => {
  it('the reference 6U design passes every check', () => {
    expect(failed(base)).toEqual([]);
  });
  it('every rejection has a plain reason', () => {
    const bad: MissionDesign = { ...base, formFactor: '1U', rocketId: 'electron', orbit: { type: 'ISS51.6', altitudeKm: 900 }, launchDate: '2016-03-01',
      parts: { ...base.parts, panels: 'panels-body', radio: 'radio-uhf' } };
    const v = fit(bad);
    const f = v.filter((x) => !x.pass).map((x) => x.check);
    expect(f).toEqual(expect.arrayContaining(['mass', 'volume', 'data', 'rocket-orbit', 'launch-window']));
    for (const x of v.filter((y) => !y.pass)) expect(x.reason.en.length).toBeGreaterThan(10);
  });
  it('power rejection below the 35% CML margin', () => {
    expect(failed({ ...base, parts: { ...base.parts, panels: 'panels-body' } })).toContain('power');
  });
  it('budget rejection and unknown ids', () => {
    const poor: Content = { ...content, scenarios: [{ ...content.scenarios[0]!, budgetUsd: 500000 }] };
    expect(failed(base, poor)).toEqual(["budget"]);
    expect(() => resolveDesign({ ...base, rocketId: 'nope' }, content)).toThrow();
  });
});
