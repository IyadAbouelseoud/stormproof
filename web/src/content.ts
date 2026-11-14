/**
 * Content text adapter (prompt E G1). Pure: reads content/text/*.json (every field {en, ar}) and returns
 * the active language. Unknown ids fall back to English (or the id) and log once in dev.
 * Engine catalog ids equal the text ids; the only mapping is scenario 'jeddah-flood' -> text 'jeddah'.
 */
import scenariosJson from '../../content/text/scenarios.json';
import partsJson from '../../content/text/parts.json';
import messagesJson from '../../content/text/messages.json';
import uiJson from '../../content/text/ui.json';
import artAltJson from '../../content/text/art-alt.json';
import type { Language } from './i18n';

export interface Bi {
  en: string;
  ar: string;
}
type Lang = Language;

interface ScenarioText {
  id: string;
  title: Bi;
  tagline: Bi;
  story: { beat: string; text: Bi }[];
  mission: Bi;
  role: Bi;
  why: Bi;
  requirements: Record<string, { label: Bi; why: Bi }>;
  win: Bi;
  fail: Bi;
  limits: Bi[];
}
interface PartText {
  id: string;
  name: Bi;
  blurb: Bi;
  tradeoff: Bi;
}

const SCENARIOS = (scenariosJson as unknown as { scenarios: ScenarioText[] }).scenarios;
const PARTS = (partsJson as unknown as { parts: PartText[]; rockets: PartText[] }).parts;
const ROCKETS = (partsJson as unknown as { parts: PartText[]; rockets: PartText[] }).rockets;
const MESSAGES = new Map((messagesJson as unknown as { messages: { key: string; text: Bi }[] }).messages.map((m) => [m.key, m.text]));
const UI = uiJson as unknown as Record<string, { id: string; title?: Bi; text?: Bi }[]>;
const ART_ALT = artAltJson as unknown as Record<string, Bi>;

/** Engine scenario id -> text id (never rename text ids). */
const SCENARIO_TEXT_ID: Record<string, string> = { 'jeddah-flood': 'jeddah' };

const warned = new Set<string>();
function warnOnce(what: string): void {
  if (import.meta.env?.DEV && !warned.has(what)) {
    warned.add(what);
    console.warn(`[content] missing text: ${what}`);
  }
}

/** The active language of a {en, ar} field; English fallback. */
export function tx(field: Bi | undefined, lang: Lang, fallback = ''): string {
  if (!field) return fallback;
  return (lang === 'ar' ? field.ar : field.en) || field.en || fallback;
}

export function scenarioText(id: string): ScenarioText | undefined {
  const tid = SCENARIO_TEXT_ID[id] ?? id;
  const s = SCENARIOS.find((x) => x.id === tid);
  if (!s) warnOnce(`scenario ${id}`);
  return s;
}

export function partText(id: string): PartText | undefined {
  const p = PARTS.find((x) => x.id === id);
  if (!p) warnOnce(`part ${id}`);
  return p;
}

export function rocketText(id: string): PartText | undefined {
  const r = ROCKETS.find((x) => x.id === id);
  if (!r) warnOnce(`rocket ${id}`);
  return r;
}

export function partName(id: string, lang: Lang, fallback: string): string {
  return tx(partText(id)?.name, lang, fallback);
}
export function rocketName(id: string, lang: Lang, fallback: string): string {
  return tx(rocketText(id)?.name, lang, fallback);
}

/** Message template for an engine Msg key (content/text/messages.json), or undefined. */
export function messageTemplate(key: string, lang: Lang): string | undefined {
  const m = MESSAGES.get(key);
  return m ? tx(m, lang) : undefined;
}

export function uiText(group: string, id: string, lang: Lang, field: 'title' | 'text' = 'text'): string | undefined {
  const row = UI[group]?.find((x) => x.id === id);
  return row ? tx(row[field], lang) : undefined;
}

/** Bilingual alt text for an art file (content/text/art-alt.json). */
export function artAlt(file: string, lang: Lang): string {
  return tx(ART_ALT[file], lang, '');
}

/** For tests: every id the catalog uses has text in both languages. */
export const TEXT_IDS = {
  scenarios: SCENARIOS.map((s) => s.id),
  parts: PARTS.map((p) => p.id),
  rockets: ROCKETS.map((r) => r.id),
  messages: [...MESSAGES.keys()],
};
export const SCENARIO_TEXT_IDS = SCENARIO_TEXT_ID;
