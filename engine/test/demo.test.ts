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
