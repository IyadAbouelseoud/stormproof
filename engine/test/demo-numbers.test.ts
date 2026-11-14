/** Track 6: dumps the engine's key numbers for the demo codes (3 Jeddah + the Angola default) to qa/track6/out/demo-engine.json
 *  so the browser check (qa/track6/demo.mjs) can compare the on-screen values. Also asserts the numbers are finite. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { MissionDesign } from '../src/contracts';
import { simulate } from '../src/flight';
import { decodeMission } from '../src/mission-code';
import { realEngineData } from './helpers/content';

const demo = JSON.parse(readFileSync(new URL('../../content/demo/jeddah-demo.json', import.meta.url), 'utf8')) as { missions: { id: string; code: string; design: MissionDesign }[] };

it('demo codes: engine key numbers', () => {
  const out: Record<string, unknown> = {};
  for (const m of demo.missions) {
    const d = decodeMission(m.code);
    const r = simulate(d, realEngineData());
    const plan = simulate({ ...d, mode: 'plan' }, realEngineData());
    out[m.id] = {
      code: m.code,
      outcome: r.outcome,
      lifetimeDays: r.lifetimeDays,
      planLifetimeDays: plan.lifetimeDays,
      truthLifetimeDays: r.planVsTruth.truthLifetimeDays,
      sunTookDays: r.planVsTruth.sunTookDays,
      score: r.score.total,
      requirementsMet: r.score.requirementsMet,
      requirements: r.score.requirements,
      gauges: Object.fromEntries(Object.entries(r.gauges).map(([k, g]) => [k, { value: g.value, limit: g.limit, unit: g.unit, state: g.state }])),
      fit: r.fit.map((f) => ({ check: f.check, pass: f.pass, en: f.reason.en })),
      eventReplay: r.eventReplay ? { firstUsefulLookDays: r.eventReplay.firstUsefulLookDays, revisitDays: r.eventReplay.revisitDays, alive: r.eventReplay.alive, looks: r.eventReplay.looks.map((l) => ({ date: l.date, usable: l.usable, camera: l.camera })) } : null,
      disposal: { years: r.disposal.lifetimeYears, fcc: r.disposal.fcc.pass, nasa: r.disposal.nasa.pass },
    };
    expect(Number.isFinite(r.score.total)).toBe(true);
  }
  mkdirSync(new URL('../../qa/track6/out/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../../qa/track6/out/demo-engine.json', import.meta.url), JSON.stringify(out, null, 1));
});
