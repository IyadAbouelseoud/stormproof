/** E1 regression: Angola SimResults must stay byte-identical across the Jeddah (prompt E) changes. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import mockJson from './fixtures/mock-result.json';
import type { MissionDesign, SimResult } from '../src/contracts';
import { simulate } from '../src/flight';
import { testEngineData } from './helpers/engine';

const data = testEngineData();
const base = mockJson.design as MissionDesign;
const FIX = new URL('./fixtures/angola-hashes.json', import.meta.url);

function hash(r: SimResult): string {
  const s = JSON.stringify(r);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

const CASES: Record<string, Partial<MissionDesign>> = {
  base: {},
  plan: { mode: 'plan' },
  low300: { orbit: { type: 'SSO', altitudeKm: 300 }, seed: 7 },
  high600: { orbit: { type: 'SSO', altitudeKm: 600 }, launchDate: '2019-06-01', seed: 99 },
  iss: { orbit: { type: 'ISS51.6', altitudeKm: 410 }, rocketId: 'iss-deploy', launchDate: '2021-03-01', seed: 3 },
  wide: { parts: { ...base.parts, camera: 'cam-wide-30m' }, seed: 12345 },
};

describe('Angola regression (E1)', () => {
  const now = Object.fromEntries(Object.entries(CASES).map(([k, o]) => [k, hash(simulate({ ...base, ...o }, data))]));
  it('SimResult hashes unchanged', () => {
    const stored = JSON.parse(readFileSync(FIX, 'utf8')) as Record<string, string>;
    expect(now).toEqual(stored);
    expect(base.scenarioId).toBe('angola');
  });
});
