// Prompt H: Cadet wording, requirement tracker, coupling map.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import en from '../src/i18n/en.json';
import couplings from '../../content/text/couplings.json';

const dataDir = resolve(__dirname, '../public/data');
beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const buf = readFileSync(resolve(dataDir, String(url).split('/').pop()!));
    return { ok: true, status: 200, json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  });
});

describe('H1 Cadet mode', () => {
  it('every cadet.* key overrides an existing key with the same placeholders', () => {
    const e = en as Record<string, string>;
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(e).filter((k) => k.startsWith('cadet.'))) {
      const base = k.slice('cadet.'.length);
      expect(e[base], `${k} has no Engineer key`).toBeDefined();
      expect(ph(e[k]!).every((p) => ph(e[base]!).includes(p) || p === 'level'), k).toBe(true);
    }
  });
  it('translate switches wording by mode and leaves numbers alone', async () => {
    const { translate } = await import('../src/i18n');
    expect(translate('en', 'part.dv', undefined, 'engineer')).toBe('Delta-v');
    expect(translate('en', 'part.dv', undefined, 'cadet')).not.toMatch(/delta/i);
    expect(translate('en', 'cml.cocktail_napkin', undefined, 'cadet')).toBe('1 Idea');
    expect(translate('en', 'storm.title', { kp: 7 }, 'cadet')).toContain('7 of 9');
  });
});

describe('H2 requirement tracker', () => {
  it('default Angola design misses revisit (14.1 > 10 days) and the projected score equals the flown Report score', async () => {
    const { loadEngine } = await import('../src/engineAdapter');
    await loadEngine();
    const { useMission } = await import('../src/store');
    useMission.getState().refresh();
    const live = useMission.getState().result;
    const rev = live.score.requirements.find((q) => q.id === 'revisit')!;
    expect(rev.met).toBe(false);
    expect(rev.value).toBeCloseTo(14.1, 1);
    expect(rev.target).toBe(10);
    useMission.getState().launch();
    expect(useMission.getState().flight!.truth.score.total).toBe(live.score.total);
  });
  it('coupling map covers every requirement id with valid movers', () => {
    const ok = new Set(['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel', 'altitude', 'launch', 'orbit', 'formFactor', 'rocket']);
    const c = (couplings as unknown as { couplings: Record<string, { movers: string[] }> }).couplings;
    for (const id of ['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost', 'event-look']) {
      expect(c[id], id).toBeDefined();
      for (const m of c[id]!.movers) expect(ok.has(m), m).toBe(true);
    }
  });
});
