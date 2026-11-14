import { describe, expect, it } from 'vitest';
import mockJson from './fixtures/mock-result.json';
import type { FitCheckId, GaugeId, PartSlot, RequirementId, SimResult } from '../src/contracts';

const mock = mockJson as unknown as SimResult;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isMsg = (m: unknown) =>
  typeof m === 'object' && m !== null &&
  typeof (m as { key: unknown }).key === 'string' &&
  typeof (m as { en: unknown }).en === 'string' &&
  typeof (m as { params: unknown }).params === 'object';

describe('mock-result.json conforms to SimResult', () => {
  it('has every top-level field and nothing else', () => {
    expect(Object.keys(mock).sort()).toEqual(
      ['causes', 'closest', 'design', 'disposal', 'fit', 'gauges', 'lifetimeDays', 'missionCode', 'outcome', 'planVsTruth', 'score', 'timeline'].sort(),
    );
  });

  it('design is a full MissionDesign', () => {
    const d = mock.design;
    const slots: PartSlot[] = ['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel'];
    expect(Object.keys(d.parts).sort()).toEqual([...slots].sort());
    expect(['1U', '3U', '6U']).toContain(d.formFactor);
    expect(['SSO', 'ISS51.6']).toContain(d.orbit.type);
    expect(d.launchDate).toMatch(ISO);
    expect(['plan', 'truth']).toContain(d.mode);
    expect(Number.isInteger(d.seed) && d.seed >= 0 && d.seed <= 0xffffffff).toBe(true);
  });

  it('has six gauges with limits and margins', () => {
    const ids: GaugeId[] = ['mass', 'power', 'budget', 'data', 'comms', 'time'];
    expect(Object.keys(mock.gauges).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const g = mock.gauges[id];
      expect(g.id).toBe(id);
      for (const k of ['value', 'limit', 'marginPct', 'requiredMarginPct'] as const) expect(Number.isFinite(g[k])).toBe(true);
      expect(['ok', 'warn', 'fail']).toContain(g.state);
    }
    expect(mock.gauges.mass.requiredMarginPct).toBe(35);
    expect(mock.gauges.power.requiredMarginPct).toBe(35);
  });

  it('fit verdicts each carry a plain explanation', () => {
    const ids: FitCheckId[] = ['mass', 'volume', 'power', 'energy', 'budget', 'data', 'comms', 'rocket-capacity', 'rocket-orbit', 'launch-window', 'disposal'];
    for (const f of mock.fit) {
      expect(ids).toContain(f.check);
      expect(typeof f.pass).toBe('boolean');
      expect(isMsg(f.reason)).toBe(true);
    }
  });

  it('timeline is daily, contiguous and finite from launch to outcome', () => {
    const tl = mock.timeline;
    expect(tl[0]?.date).toBe(mock.design.launchDate);
    for (let i = 0; i < tl.length; i++) {
      const r = tl[i]!;
      expect(r.date).toMatch(ISO);
      for (const k of ['altitudeKm', 'densityKgM3', 'batteryPct', 'dataGeneratedMB', 'dataDownlinkedMB', 'dataStoredMB', 'dataLostMB'] as const)
        expect(Number.isFinite(r[k])).toBe(true);
      expect(r.stormKp === null || typeof r.stormKp === 'number').toBe(true);
      expect(typeof r.forecast).toBe('boolean');
      if (i > 0) expect(Date.parse(r.date) - Date.parse(tl[i - 1]!.date)).toBe(86_400_000);
    }
    expect(tl.length - 1).toBe(mock.lifetimeDays);
    if (mock.outcome.kind === 'reentered') expect(tl.at(-1)!.date).toBe(mock.outcome.date);
  });

  it('plan-vs-truth, disposal, score, causes, closest, missionCode are well formed', () => {
    const p = mock.planVsTruth;
    expect(p.sunTookDays).toBe(p.planLifetimeDays - p.truthLifetimeDays);
    expect(mock.disposal.fcc.limitYears).toBe(5);
    expect(mock.disposal.nasa.limitYears).toBe(25);
    const reqOrder: RequirementId[] = ['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost'];
    expect(mock.score.requirements.map((r) => r.id)).toEqual(reqOrder);
    expect(mock.score.requirementsMet).toBe(mock.score.requirements.filter((r) => r.met).length);
    expect(mock.causes.length).toBeGreaterThanOrEqual(3);
    expect(mock.causes.length).toBeLessThanOrEqual(5);
    for (const c of mock.causes) {
      expect(Number.isFinite(c.effect.value)).toBe(true);
      expect(typeof c.sun).toBe('boolean');
      expect(isMsg(c.label)).toBe(true);
    }
    expect(isMsg(mock.closest.hint)).toBe(true);
    expect(typeof mock.missionCode).toBe('string');
  });
});
