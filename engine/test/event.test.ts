/** Prompt E2: event replay (Jeddah flood, 24 Nov 2022), score rescale, G3 minimum launch price. */
import { describe, expect, it } from 'vitest';
import mockJson from './fixtures/mock-result.json';
import type { CloudTagFile, Scenario } from '../src/catalog';
import type { MissionDesign, PartSlot, SimResult } from '../src/contracts';
import { eventReplay } from '../src/event';
import { simulate } from '../src/flight';
import { resolveDesign } from '../src/launch';
import { score } from '../src/score';
import { realContent, realEngineData } from './helpers/content';
import { testEngineData } from './helpers/engine';

const data = realEngineData();
const content = realContent();
const jeddah = content.scenarios.find((s) => s.id === 'jeddah-flood')!;
const PARTS: Record<PartSlot, string> = { camera: 'camera-budget', panels: 'panels-large', battery: 'battery-medium', radio: 'radio-fast', computer: 'computer-standard', pointing: 'pointing-precise', fuel: 'fuel-small' };
const base: MissionDesign = { scenarioId: 'jeddah-flood', parts: PARTS, formFactor: '6U', orbit: { type: 'SSO', altitudeKm: 500 }, rocketId: 'spacex-rideshare', launchDate: '2021-06-01', mode: 'truth', seed: 1 };
const run = (over: Partial<MissionDesign> = {}, parts: Partial<Record<PartSlot, string>> = {}): SimResult =>
  simulate({ ...base, ...over, parts: { ...PARTS, ...parts } }, data);
const part = (id: string) => content.parts.find((p) => p.id === id)!;

/** A synthetic daily timeline (only date and altitude matter to eventReplay). */
function timeline(from: string, days: number, altKm = 500) {
  const t0 = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: days + 1 }, (_, i) => ({
    date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10), altitudeKm: altKm, densityKgM3: 0, batteryPct: 100,
    dataGeneratedMB: 0, dataDownlinkedMB: 0, dataStoredMB: 0, dataLostMB: 0, stormKp: null, forecast: false,
  }));
}
const allPass = ['power', 'energy', 'data'].map((check) => ({ check, pass: true, reason: { key: '', params: {}, en: '' } })) as SimResult['fit'];
const tags = (tag: 'clear' | 'cloudy'): CloudTagFile => ({ layer: 'x', days: ['2022-11-24', '2022-11-25', '2022-11-26', '2022-11-27'].map((date) => ({ date, tag })) });
const replay = (over: Partial<Parameters<typeof eventReplay>[0]> = {}) => eventReplay({
  scenario: { ...jeddah, lookWindowDays: 3 }, camera: part('camera-budget'), pointing: part('pointing-precise'),
  timeline: timeline('2021-06-01', 800), fit: allPass, cloud: tags('clear'), seed: 1, ...over,
})!;

describe('event replay (E2)', () => {
  it('is deterministic: same design and seed, same result', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    expect(run().eventReplay).toBeDefined();
  });

  it('reentered before the event: no looks, requirement fails and names the reentry date', () => {
    const r = run({ orbit: { type: 'SSO', altitudeKm: 300 }, rocketId: 'electron' });
    const ev = r.eventReplay!;
    expect(ev.alive).toBe(false);
    expect(ev.reentryBeforeEvent).toBe(true);
    expect(ev.looks).toEqual([]);
    expect(ev.firstUsefulLookDays).toBeNull();
    expect(ev.reentryDate).toBe(r.timeline.at(-1)!.date);
    expect(r.score.requirements.find((q) => q.id === 'event-look')!.met).toBe(false);
  });

  it('optical is blind on cloudy days', () => {
    const ev = replay({ cloud: tags('cloudy') });
    expect(ev.looks.length).toBeGreaterThan(0);
    expect(ev.looks.every((l) => !l.usable && l.why.key === 'event.optical_cloud')).toBe(true);
    expect(ev.firstUsefulLookDays).toBeNull();
  });

  it('optical sees on clear days; no-image counts as not usable', () => {
    expect(replay().looks.every((l) => l.usable)).toBe(true);
    const ev = replay({ cloud: { layer: 'x', days: [] } });
    expect(ev.looks.every((l) => !l.usable && l.why.key === 'event.optical_no_image')).toBe(true);
  });

  it('radar is usable through cloud', () => {
    const ev = replay({ camera: part('camera-radar'), cloud: tags('cloudy') });
    expect(ev.looks.length).toBeGreaterThan(0);
    expect(ev.looks.every((l) => l.usable && l.camera === 'radar')).toBe(true);
    expect(ev.firstUsefulLookDays).toBe(ev.looks[0]!.days);
  });

  it('radar needs power and data margin', () => {
    const fit = allPass.map((f) => (f.check === 'data' ? { ...f, pass: false } : f));
    const ev = replay({ camera: part('camera-radar'), fit });
    expect(ev.looks.every((l) => !l.usable && l.why.key === 'event.power_short')).toBe(true);
  });

  it('no pass inside the window gives null', () => {
    // basic pointing, sharp camera: revisit about 81 days >> a 0-day window, phase almost surely > 0
    const ev = replay({ camera: part('camera-sharp'), pointing: part('pointing-basic'), scenario: { ...jeddah, lookWindowDays: 0 } });
    expect(ev.revisitDays!).toBeGreaterThan(30);
    expect(ev.looks).toEqual([]);
    expect(ev.firstUsefulLookDays).toBeNull();
  });

  it('passes are spaced by the revisit and stay inside the window', () => {
    const ev = replay({ camera: part('camera-radar') });
    for (const l of ev.looks) expect(l.days).toBeLessThanOrEqual(3);
    if (ev.looks.length > 1) expect(ev.looks[1]!.days - ev.looks[0]!.days).toBeCloseTo(ev.revisitDays!, 0);
  });

  it('adds a cloud cause and keeps 3..5 causes ending in the verdict', () => {
    for (const r of [run(), run({}, { camera: 'camera-radar' })]) {
      expect(r.causes.some((c) => c.id === 'cloud')).toBe(true);
      expect(r.causes.length).toBeGreaterThanOrEqual(3);
      expect(r.causes.length).toBeLessThanOrEqual(5);
      expect(r.causes.at(-1)!.id).toBe('verdict');
    }
  });

  it('Angola is unaffected: no eventReplay, five requirements', () => {
    const r = simulate(mockJson.design as MissionDesign, testEngineData());
    expect(r.eventReplay).toBeUndefined();
    expect(r.score.requirements.map((q) => q.id)).toEqual(['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost']);
  });
});

describe('score with six requirements (E2)', () => {
  const x = { revisitDays: 1, gsdM: 1, dataDeliveredGB: 1e6, lifetimeDays: 1e6, costUsd: 0, truthOverPlan: 1, eventLookDays: 0 };
  it('a perfect score stays 100', () => {
    const s = score(jeddah, x);
    expect(s.requirements.map((q) => q.id)).toEqual(['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost', 'event-look']);
    expect(s.total).toBe(100);
  });
  it('no useful look: value -1, not met', () => {
    const q = score(jeddah, { ...x, eventLookDays: null }).requirements.at(-1)!;
    expect(q).toMatchObject({ id: 'event-look', value: -1, met: false, sense: 'max' });
  });
  it('Angola weight unchanged (16 per requirement)', () => {
    const angola = { ...jeddah, requirementSet: undefined } as Scenario;
    expect(score(angola, { ...x, truthOverPlan: 0 }).total).toBe(80);
  });
});

describe('SpaceX minimum price (G3)', () => {
  it('6 kg and 12 kg give the same launch cost (350,000 USD flat)', () => {
    const r = content.rockets.find((q) => q.id === 'spacex-rideshare')!;
    const cost = (kg: number) => Math.max(r.minPriceUsd ?? 0, kg * r.priceUsdPerKg);
    expect(cost(6)).toBe(350000);
    expect(cost(12)).toBe(350000);
    expect(resolveDesign(base, content).launchCostUsd).toBe(350000);
    expect(resolveDesign({ ...base, formFactor: '3U' }, content).launchCostUsd).toBe(350000);
  });
});

describe('Jeddah calibration (content/evidence/jeddah-balance.md)', () => {
  const lean = { camera: 'camera-radar', panels: 'panels-medium', battery: 'battery-small', radio: 'radio-fast', computer: 'computer-basic', pointing: 'pointing-standard', fuel: 'fuel-small' };
  it('optical 6U, 2021, 500 km fails the event look on storm cloud', () => {
    const ev = run().eventReplay!;
    expect(ev.firstUsefulLookDays).toBeNull();
    expect(ev.looks.some((l) => l.why.key === 'event.optical_cloud')).toBe(true);
  });
  it('the radar swap passes the event look but busts the budget', () => {
    const r = run({}, { camera: 'camera-radar' });
    expect(r.eventReplay!.firstUsefulLookDays).not.toBeNull();
    expect(r.gauges.budget.state).toBe('fail');
  });
  it('a lean radar build passes and fits', () => {
    const r = run({}, lean);
    expect(r.eventReplay!.firstUsefulLookDays).not.toBeNull();
    expect(r.fit.filter((f) => !f.pass)).toEqual([]);
  });
  it('at least three balanced designs score 80 or more', () => {
    const designs = [{}, { pointing: 'pointing-standard' }, { camera: 'camera-standard' }, lean];
    expect(designs.filter((p) => run({}, p).score.total >= 80).length).toBeGreaterThanOrEqual(3);
  });
});
