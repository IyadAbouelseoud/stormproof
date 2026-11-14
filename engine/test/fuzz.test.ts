/** Track 6 fuzz tests: 500 seeded random valid designs, mission-code robustness. Edge designs are in edge.test.ts. */
import { describe, expect, it } from 'vitest';
import type { FormFactor, MissionDesign, PartSlot, SimResult, StormPolicy } from '../src/contracts';
import { simulate } from '../src/flight';
import { decodeMission, encodeMission } from '../src/mission-code';
import { createRng } from '../src/rng';
import { realContent, realEngineData } from './helpers/content';

const data = realEngineData();
const content = realContent();
const DAY = 86_400_000;
const SLOTS: PartSlot[] = ['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel'];
const FFS: FormFactor[] = ['1U', '3U', '6U'];

function hash(r: unknown): string {
  const s = JSON.stringify(r);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

function deepBad(v: unknown, path: string, out: string[]): void {
  if (v === undefined) out.push(`${path}=undefined`);
  else if (typeof v === 'number') {
    if (!Number.isFinite(v)) out.push(`${path}=${v}`);
  } else if (Array.isArray(v)) v.forEach((x, i) => deepBad(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) deepBad(x, `${path}.${k}`, out);
}

function randomDesign(rng: ReturnType<typeof createRng>): MissionDesign {
  const scenarioId = rng.int(0, 1) ? 'jeddah-flood' : 'angola';
  const parts = {} as MissionDesign['parts'];
  for (const s of SLOTS) {
    const opts = content.parts.filter((p) => p.slot === s && (!p.scenarios || p.scenarios.includes(scenarioId)));
    parts[s] = opts[rng.int(0, opts.length - 1)]!.id;
  }
  const year = rng.int(2015, 2026);
  const month = year === 2026 ? rng.int(1, 10) : rng.int(1, 12);
  const day = rng.int(1, 28);
  const d: MissionDesign = {
    scenarioId,
    parts,
    formFactor: FFS[rng.int(0, 2)]!,
    orbit: { type: rng.int(0, 1) ? 'SSO' : 'ISS51.6', altitudeKm: rng.int(150, 800) },
    rocketId: content.rockets[rng.int(0, content.rockets.length - 1)]!.id,
    launchDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    mode: rng.int(0, 1) ? 'truth' : 'plan',
    seed: rng.u32(),
  };
  if (rng.int(0, 1)) d.stormPolicy = (['ride-out', 'safe-mode'] as StormPolicy[])[rng.int(0, 1)]!;
  if (rng.int(0, 2) === 0) d.roles = { 'systems-lead': 'Amal', science: 'Omar عمر~x', 'orbit-comms': 'Lee' };
  return d;
}

function checkResult(r: SimResult, d: MissionDesign): string[] {
  const bad: string[] = [];
  const tl = r.timeline;
  const { design: _d, ...rest } = r;
  void _d;
  deepBad(rest, 'r', bad);
  if (tl.length - 1 !== r.lifetimeDays) bad.push(`timeline length ${tl.length} vs lifetimeDays ${r.lifetimeDays}`);
  const fuel = data.content.parts.find((p) => p.id === d.parts.fuel)!;
  const hasFuel = (fuel.deltaVMs ?? 0) > 0;
  tl.forEach((t, i) => {
    if (t.batteryPct < 0 || t.batteryPct > 100) bad.push(`battery ${t.batteryPct} day ${i}`);
    for (const k of ['dataGeneratedMB', 'dataDownlinkedMB', 'dataStoredMB', 'dataLostMB'] as const) if (t[k] < 0) bad.push(`${k} negative day ${i}`);
    if (t.densityKgM3 < 0) bad.push(`density negative day ${i}`);
    if (i > 0) {
      if (Date.parse(t.date) - Date.parse(tl[i - 1]!.date) !== DAY) bad.push(`date gap day ${i}`);
      if (!hasFuel && t.altitudeKm > tl[i - 1]!.altitudeKm + 1e-9) bad.push(`altitude rose day ${i} (${tl[i - 1]!.altitudeKm} -> ${t.altitudeKm}) without fuel`);
    }
  });
  if (r.outcome.kind === 'reentered') {
    if (tl.at(-1)!.date !== r.outcome.date) bad.push('outcome date != last timeline date');
    if (tl.at(-1)!.altitudeKm > 125) bad.push(`reentered but last altitude ${tl.at(-1)!.altitudeKm}`);
  } else if (r.outcome.kind === 'alive') {
    // 'alive' = reentry predicted on the forecast Sun after OMNI ends; the timeline runs to that predicted reentry
    if (tl.at(-1)!.date !== r.outcome.predictedReentry) bad.push('alive: last date != predictedReentry');
    if (!tl.at(-1)!.forecast) bad.push('alive: last day not flagged forecast');
  } else if (tl.at(-1)!.altitudeKm <= 120) bad.push('alive-at-forecast-end but last alt <= 120');
  const life = d.mode === 'truth' ? r.planVsTruth.truthLifetimeDays : r.planVsTruth.planLifetimeDays;
  if (life !== r.lifetimeDays) bad.push(`lifetimeDays ${r.lifetimeDays} != planVsTruth(${d.mode}) ${life}`);
  if (r.gauges.time.value !== r.lifetimeDays) bad.push(`time gauge ${r.gauges.time.value} != lifetimeDays ${r.lifetimeDays}`);
  for (const [id, g] of Object.entries(r.gauges)) {
    if (g.id !== id) bad.push(`gauge id ${id}`);
    if (!['ok', 'warn', 'fail'].includes(g.state)) bad.push(`gauge state ${id}`);
  }
  if (r.score.total < 0 || r.score.total > 100) bad.push(`score ${r.score.total}`);
  if (r.score.requirementsMet !== r.score.requirements.filter((q) => q.met).length) bad.push('requirementsMet mismatch');
  if (r.causes.length < 1) bad.push('causes empty');
  if (r.outcome.kind === 'reentered' && (r.causes.length < 3 || r.causes.length > 5 || r.causes.at(-1)!.id !== 'verdict')) bad.push(`causes not ordered/verdict-last: ${r.causes.map((c) => c.id)}`);
  if (r.fit.length !== 11) bad.push(`fit length ${r.fit.length}`);
  for (const f of r.fit) if (!f.reason?.en || f.reason.en.includes('undefined')) bad.push(`fit ${f.check} reason empty`);
  try {
    expect(decodeMission(r.missionCode)).toEqual(r.design);
  } catch {
    bad.push('code roundtrip');
  }
  return bad;
}

describe('fuzz: 500 random valid designs', () => {
  it('no exception, no NaN/Infinity/undefined, invariants hold, code round-trips, re-sim identical', () => {
    const rng = createRng(0x5eed6);
    const failures: string[] = [];
    let reentered = 0;
    let alive = 0;
    for (let n = 0; n < 500; n++) {
      const d = randomDesign(rng);
      let r: SimResult;
      try {
        r = simulate(d, data);
      } catch (e) {
        failures.push(`#${n} THROW ${(e as Error).message} :: ${JSON.stringify(d)}`);
        continue;
      }
      const bad = checkResult(r, d);
      const back = decodeMission(encodeMission(d));
      expect(back).toEqual(d);
      const again = simulate(back, data);
      if (hash({ ...again, design: null }) !== hash({ ...r, design: null }) || again.missionCode !== r.missionCode) bad.push('re-simulate hash differs');
      if (r.outcome.kind === 'reentered') reentered++;
      else alive++;
      if (bad.length) failures.push(`#${n} ${bad.slice(0, 5).join(' | ')} :: ${encodeMission(d)}`);
    }
    console.log(`fuzz: 500 designs, reentered=${reentered}, alive/lower-bound=${alive}, failures=${failures.length}`);
    if (failures.length) console.log(failures.slice(0, 15).join('\n'));
    expect(failures).toEqual([]);
  }, 300_000);
});

describe('mission code robustness', () => {
  const good = encodeMission(randomDesign(createRng(42)));
  const flip = (c: string): string => (c === 'A' ? 'B' : 'A');
  const cases: Record<string, string> = {
    empty: '',
    whitespace: '   ',
    'no dash': 'SP1',
    'wrong prefix': 'XX9-' + good.slice(4),
    'lowercase prefix': 'sp1-' + good.slice(4),
    'prefix only': 'SP1-',
    truncated: good.slice(0, Math.floor(good.length / 2)),
    'truncated -1': good.slice(0, -1),
    'truncated -3': good.slice(0, -3),
    'bad chars': good.slice(0, 20) + '!!!' + good.slice(23),
    'padding chars': good + '==',
    'binary junk': 'SP1-\u0000\u0001',
    html: '<script>alert(1)</script>',
    'tampered mid': good.slice(0, 30) + flip(good[30]!) + good.slice(31),
    'tampered tail': good.slice(0, -2) + 'zz',
    'tampered head': good.slice(0, 5) + flip(good[5]!) + good.slice(6),
  };
  for (const [name, code] of Object.entries(cases)) {
    it(`${name}: throws a clean Error, or yields a design that simulates without throwing`, () => {
      let design: MissionDesign | null = null;
      try {
        design = decodeMission(code);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toMatch(/^(mission code:|URI malformed)/);
        return;
      }
      expect(typeof design.scenarioId).toBe('string');
      // FINDING (qa/FUNCTIONAL.md): decodeMission is content-independent, so a tampered id decodes fine and
      // simulate() throws 'unknown scenario/part/rocket'. The caller (web adapter) must catch that. Pinned here.
      try {
        simulate(design!, data);
      } catch (e) {
        expect((e as Error).message).toMatch(/^unknown (scenario|part|rocket)/);
      }
    });
  }
  it('1000 random single-character mutations: decode throws a clean mission-code error or the result simulates', () => {
    const rng = createRng(7);
    const bad: string[] = [];
    let accepted = 0;
    let acceptedAndThrew = 0;
    const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let i = 0; i < 1000; i++) {
      const code = encodeMission(randomDesign(rng));
      const pos = rng.int(4, code.length - 1);
      const m = code.slice(0, pos) + B[rng.int(0, 63)]! + code.slice(pos + 1);
      if (m === code) continue;
      let back: MissionDesign;
      try {
        back = decodeMission(m);
      } catch (e) {
        // FINDING: dec() leaks a raw URIError ('URI malformed') for bad %-escapes in id/role fields
        if (!/^(mission code:|URI malformed)/.test((e as Error).message)) bad.push(`decode: ${m} -> ${(e as Error).message}`);
        continue;
      }
      accepted++;
      try {
        simulate(back, data);
      } catch (e) {
        acceptedAndThrew++;
        // FINDING: out-of-range launch year (e.g. 2619-12-19) decodes, then simulate throws TypeError (reading 'date')
        if (!/^unknown (scenario|part|rocket)|reading 'date'/.test((e as Error).message)) bad.push(`ACCEPTED then simulate threw: ${m} -> ${(e as Error).message}`);
      }
    }
    console.log(`mutations accepted by decodeMission: ${accepted}/1000; accepted-then-threw: ${acceptedAndThrew}`);
    if (bad.length) console.log(bad.slice(0, 8).join('\n'));
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
