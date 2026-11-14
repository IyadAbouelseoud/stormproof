/** G1: content/text covers every id the catalog and UI use, in both languages; message placeholders match engine params. */
import { describe, expect, it } from 'vitest';
import parts from '../../content/parts.json';
import rockets from '../../content/rockets.json';
import angola from '../../content/scenarios/angola.json';
import jeddah from '../../content/scenarios/jeddah-flood.json';
import messages from '../../content/text/messages.json';
import { SCENARIO_TEXT_IDS, TEXT_IDS, partText, rocketText, scenarioText } from '../src/content';
import engineAr from '../src/i18n/engine-ar.json';

const both = (b: { en: string; ar: string } | undefined) => !!b && b.en.trim() !== '' && b.ar.trim() !== '';

describe('content text (G1)', () => {
  it('every catalog part and rocket has a name in en and ar', () => {
    for (const p of parts.parts) expect(both(partText(p.id)?.name), p.id).toBe(true);
    for (const r of rockets.rockets) expect(both(rocketText(r.id)?.name), r.id).toBe(true);
  });
  it('every scenario has title, story and limits in en and ar', () => {
    for (const s of [angola, jeddah]) {
      const st = scenarioText(s.id)!;
      expect(st, s.id).toBeDefined();
      expect(both(st.title)).toBe(true);
      for (const b of st.story) expect(both(b.text)).toBe(true);
      for (const l of st.limits) expect(both(l)).toBe(true);
    }
    expect(SCENARIO_TEXT_IDS['jeddah-flood']).toBe('jeddah');
    expect(TEXT_IDS.scenarios).toContain('jeddah');
  });
  it('every message has the same {placeholders} in en and ar', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const m of (messages as { messages: { key: string; text: { en: string; ar: string } }[] }).messages)
      expect(ph(m.text.ar), m.key).toEqual(ph(m.text.en));
  });
  it('event message keys emitted by the engine have Arabic templates using only engine params', () => {
    const engineParams: Record<string, string[]> = {
      'event.power_short': ['date'], 'event.radar_ok': ['date'], 'event.optical_clear': ['date'], 'event.optical_partly': ['date'],
      'event.optical_cloud': ['date'], 'event.optical_no_image': ['date'], 'cause.cloud': ['blocked', 'looks'], 'cause.radar_cloud': ['looks'],
    };
    const ar = engineAr as Record<string, string>;
    for (const [k, params] of Object.entries(engineParams)) {
      expect(ar[k], k).toBeTruthy();
      for (const p of [...ar[k]!.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!)) expect(params, `${k} {${p}}`).toContain(p);
    }
  });
});
