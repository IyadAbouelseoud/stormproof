// Web logic tests: adapter (real engine on the shipped data), store rules, i18n.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import en from '../src/i18n/en.json';
import ar from '../src/i18n/ar.json';
import engineAr from '../src/i18n/engine-ar.json';

const dataDir = resolve(__dirname, '../public/data');

// the adapter fetches ./data/*; serve the files from disk
beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const name = String(url).split('/').pop()!;
    const buf = readFileSync(resolve(dataDir, name));
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(buf.toString('utf8')),
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    };
  });
});

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe('i18n', () => {
  it('en and ar have the same keys and the same placeholders', () => {
    const e = en as Record<string, string>;
    const a = ar as Record<string, string>;
    expect(Object.keys(a).sort()).toEqual(Object.keys(e).sort());
    for (const k of Object.keys(e)) expect(placeholders(a[k]!), k).toEqual(placeholders(e[k]!));
  });

  it('engine Arabic falls back to English when a param is missing', async () => {
    const { translateMsg } = await import('../src/i18n');
    expect(translateMsg('ar', { key: 'disposal.ok', params: { years: 2.5 }, en: 'x' })).toContain('2.5');
    expect(translateMsg('ar', { key: 'disposal.ok', params: {}, en: 'English text' })).toBe('English text');
    expect(translateMsg('ar', { key: 'no.such.key', params: {}, en: 'Fallback' })).toBe('Fallback');
    expect(Object.keys(engineAr).length).toBeGreaterThan(30);
  });
});

describe('engineAdapter', () => {
  it('falls back to the mock before loading, then runs the real engine', async () => {
    const A = await import('../src/engineAdapter');
    const d = A.defaultDesign();
    expect(A.simulate(d)).toBe(A.mockResult());
    await A.loadEngine();
    expect(A.useEngineStatus.getState().status).toBe('ready');
    const r = A.simulate(d);
    expect(r).not.toBe(A.mockResult());
    expect(r.timeline.length).toBeGreaterThan(100);
    expect(A.simulate(d)).toBe(r); // cached, deterministic
    expect(A.simulatePlan(d).design.mode).toBe('plan');
  });

  it('sun months cover 2015-01..2026-12 with forecast after OMNI ends', async () => {
    const A = await import('../src/engineAdapter');
    await A.loadEngine();
    const m = A.sunMonths()!;
    expect(m[0]!.month).toBe('2015-01');
    expect(m[m.length - 1]!.month).toBe('2026-12');
    expect(m.length).toBe(144);
    expect(m.find((x) => x.month === '2026-09')!.forecast).toBe(false);
    expect(m.find((x) => x.month === '2026-12')!.forecast).toBe(true);
    expect(A.sunLevel(79)).toBe(0);
    expect(A.sunLevel(80)).toBe(1);
    expect(A.sunLevel(250)).toBe(5);
  });

  it('altitude bands agree with the engine at the band edges', async () => {
    const A = await import('../src/engineAdapter');
    await A.loadEngine();
    const d = A.defaultDesign();
    const b = A.altitudeBands(d);
    expect(b.basis).toBe('computed');
    const at = (alt: number) => A.simulate({ ...d, mode: 'truth', orbit: { ...d.orbit, altitudeKm: alt } });
    if (b.dragBelowKm !== null && b.dragBelowKm > A.ALT_MIN_KM) {
      expect(at(b.dragBelowKm).score.requirements.find((q) => q.id === 'lifetime')!.met).toBe(true);
      expect(at(b.dragBelowKm - 10).score.requirements.find((q) => q.id === 'lifetime')!.met).toBe(false);
    }
    if (b.disposalAboveKm !== null) {
      expect(at(b.disposalAboveKm).disposal.fcc.pass).toBe(true);
      expect(at(b.disposalAboveKm + 10).disposal.fcc.pass).toBe(false);
    }
  });

  it('knock-on trail lists only changed gauges, from result numbers', async () => {
    const A = await import('../src/engineAdapter');
    await A.loadEngine();
    const d = A.defaultDesign();
    const r1 = A.simulate(d);
    const r2 = A.simulate({ ...d, parts: { ...d.parts, camera: 'cam-wide-30m' } });
    const trail = A.knockOnTrail(r1, r2);
    expect(trail.length).toBeGreaterThan(0);
    for (const s of trail) expect(s.delta).toBeCloseTo(r2.gauges[s.gauge].value - r1.gauges[s.gauge].value);
  });

  it('ground track stays within the inclination', async () => {
    const A = await import('../src/engineAdapter');
    const d = A.defaultDesign();
    const segs = A.groundTrack({ ...d, orbit: { type: 'ISS51.6', altitudeKm: 400 } });
    const lats = segs.flat().map((p) => Math.abs(p.lat));
    expect(Math.max(...lats)).toBeLessThanOrEqual(51.6 + 1e-6);
    expect(Math.max(...lats)).toBeGreaterThan(50);
  });
});

describe('store', () => {
  it('storm vote majority, tie broken by the systems lead', async () => {
    const { majority } = await import('../src/store');
    expect(majority({ science: 'safe-mode', 'orbit-comms': 'safe-mode', 'power-spacecraft': 'ride-out' })).toBe('safe-mode');
    expect(majority({ 'systems-lead': 'safe-mode', science: 'ride-out' })).toBe('safe-mode');
    expect(majority({ 'systems-lead': 'ride-out', science: 'safe-mode' })).toBe('ride-out');
    expect(majority({})).toBe('ride-out');
  });

  it('four votes set the storm policy on the flight; baseline is kept for re-fly', async () => {
    const A = await import('../src/engineAdapter');
    await A.loadEngine();
    const { useMission } = await import('../src/store');
    const s = useMission.getState();
    s.refresh();
    s.launch();
    expect(useMission.getState().flight!.truth.design.mode).toBe('truth');
    for (const r of ['systems-lead', 'science', 'power-spacecraft'] as const) useMission.getState().castVote(r, 'safe-mode');
    expect(useMission.getState().stormVoted).toBe(false);
    useMission.getState().castVote('orbit-comms', 'ride-out');
    expect(useMission.getState().flight!.design.stormPolicy).toBe('safe-mode');
    useMission.getState().keepBaseline();
    const base = useMission.getState().baseline!;
    useMission.getState().setAltitude(450);
    useMission.getState().launch();
    expect(useMission.getState().flight!.design.seed).toBe(base.design.seed);
    expect(useMission.getState().flight!.truth).not.toBe(base.truth);
  });
});
