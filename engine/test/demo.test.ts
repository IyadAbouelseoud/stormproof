/** Prompt E gate: content/demo/jeddah-demo.json codes decode and give the three stated outcomes. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MissionDesign } from '../src/contracts';
import { simulate } from '../src/flight';
import { decodeMission, encodeMission } from '../src/mission-code';
import { realEngineData } from './helpers/content';

const demo = JSON.parse(readFileSync(new URL('../../content/demo/jeddah-demo.json', import.meta.url), 'utf8')) as { missions: { id: string; code: string; design: MissionDesign }[] };
const byId = Object.fromEntries(demo.missions.map((m) => [m.id, m]));
const fly = (id: string) => simulate(decodeMission(byId[id]!.code), realEngineData());

describe('Jeddah demo missions', () => {
  it('codes decode to the stored designs and round-trip', () => {
    for (const m of demo.missions) {
      expect(decodeMission(m.code)).toEqual(m.design);
      expect(encodeMission(m.design)).toBe(m.code);
    }
  });
  it('1: optical 6U, 2021, 500 km fails the event look on storm cloud', () => {
    const ev = fly('optical-fails').eventReplay!;
    expect(ev.firstUsefulLookDays).toBeNull();
    expect(ev.looks.map((l) => l.why.key)).toContain('event.optical_cloud');
  });
  it('2: radar swap passes the event look and busts the budget', () => {
    const r = fly('radar-over-budget');
    expect(r.eventReplay!.firstUsefulLookDays).not.toBeNull();
    expect(r.fit.find((f) => f.check === 'budget')!.pass).toBe(false);
  });
  it('3: lean radar recovery passes the event look and every fit check', () => {
    const r = fly('lean-radar-recovery');
    expect(r.eventReplay!.firstUsefulLookDays).not.toBeNull();
    expect(r.fit.every((f) => f.pass)).toBe(true);
  });
});

/** Final pass, Track 4: the Angola pitch pair (content/demo/angola-demo.json, DEMO.md). */
interface AngolaDemo { id: string; code: string; design: MissionDesign; numbers: { lifetimeDays: number; planLifetimeDays: number; sunTookDays: number; score: number; requirementsMet: number; reentry?: string; predictedReentry?: string } }
const angola = JSON.parse(readFileSync(new URL('../../content/demo/angola-demo.json', import.meta.url), 'utf8')) as { missions: AngolaDemo[] };

describe('Angola demo missions (FAIL then FIX)', () => {
  type Run = { m: AngolaDemo; r: ReturnType<typeof simulate> };
  const [fail, fix, refly] = angola.missions.map((m) => ({ m, r: simulate(decodeMission(m.code), realEngineData()) })) as [Run, Run, Run];
  it('codes decode to the stored designs and round-trip', () => {
    for (const m of angola.missions) {
      expect(decodeMission(m.code)).toEqual(m.design);
      expect(encodeMission(m.design)).toBe(m.code);
    }
  });
  it('the numbers in the demo script are the engine output', () => {
    for (const { m, r } of [fail, fix, refly]) {
      expect(r.lifetimeDays).toBe(m.numbers.lifetimeDays);
      expect(r.planVsTruth.planLifetimeDays).toBe(m.numbers.planLifetimeDays);
      expect(r.planVsTruth.sunTookDays).toBe(m.numbers.sunTookDays);
      expect(r.score.total).toBe(m.numbers.score);
      expect(r.score.requirementsMet).toBe(m.numbers.requirementsMet);
    }
    expect(fail.r.outcome).toEqual({ kind: 'reentered', date: fail.m.numbers.reentry });
    expect(fix.r.outcome).toMatchObject({ kind: 'alive', predictedReentry: fix.m.numbers.predictedReentry });
    expect(refly.r.outcome).toEqual({ kind: 'reentered', date: refly.m.numbers.reentry });
  });
  it('FAIL: the plan meets the 3-year requirement, the real Sun does not; nothing else is wrong', () => {
    expect(fail.r.planVsTruth.planLifetimeDays).toBeGreaterThanOrEqual(1095);
    expect(fail.r.score.requirements.filter((q) => !q.met).map((q) => q.id)).toEqual(['lifetime']);
    expect(fail.r.fit.every((f) => f.pass)).toBe(true);
    expect(fail.r.causes[0]!.id).toBe('sun');
  });
  it('FIX (both the one-click Re-fly tweak and the by-hand backup): every requirement and fit check passes, including the FCC 5-year rule', () => {
    for (const x of [fix, refly]) {
      expect(x.r.score.requirements.every((q) => q.met)).toBe(true);
      expect(x.r.fit.every((f) => f.pass)).toBe(true);
      expect(x.r.disposal.fcc.pass).toBe(true);
    }
  });
  it('the Re-fly one-click FIX is the FAIL design moved to the closest real mission altitude (what the tweak button does)', () => {
    expect(refly.m.design).toEqual({ ...fail.m.design, orbit: { ...fail.m.design.orbit, altitudeKm: fail.r.closest.altitudeKm } });
    expect(fail.r.closest.formFactor).toBe(fail.m.design.formFactor);
  });
});
