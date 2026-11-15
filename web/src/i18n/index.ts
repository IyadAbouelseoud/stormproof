import { create } from 'zustand';
import enTranslations from './en.json';
import arTranslations from './ar.json';
import engineAr from './engine-ar.json';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';
/** H1: Cadet (default) = plain words and hints; Engineer = the original wording. Same numbers and targets. */
export type Mode = 'cadet' | 'engineer';

const MODE_KEY = 'sp-mode';
function savedMode(): Mode {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_KEY) : null;
    if (v === 'cadet' || v === 'engineer') return v;
  } catch {
    /* storage blocked */
  }
  return 'cadet';
}

export interface ModeState {
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const useMode = create<ModeState>((set) => ({
  mode: savedMode(),
  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* storage blocked */
    }
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-mode', mode);
    set({ mode });
  },
}));
if (typeof document !== 'undefined') document.documentElement.setAttribute('data-mode', useMode.getState().mode);

export interface I18nState {
  lang: Language;
  dir: Direction;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const dictionaries: Record<Language, Record<string, string>> = {
  en: enTranslations as Record<string, string>,
  ar: arTranslations as Record<string, string>,
};

function applyHtmlAttributes(lang: Language, dir: Direction): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }
}

/**
 * Zustand in-memory store for i18n.
 * State is NOT persisted to localStorage (in-memory only).
 */
export const useI18nStore = create<I18nState>((set) => ({
  lang: 'en',
  dir: 'ltr',
  setLanguage: (lang: Language) => {
    const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
    applyHtmlAttributes(lang, dir);
    set({ lang, dir });
  },
  toggleLanguage: () => {
    set((state) => {
      const nextLang: Language = state.lang === 'en' ? 'ar' : 'en';
      const nextDir: Direction = nextLang === 'ar' ? 'rtl' : 'ltr';
      applyHtmlAttributes(nextLang, nextDir);
      return { lang: nextLang, dir: nextDir };
    });
  },
}));

// Apply on initial module load
if (typeof document !== 'undefined') {
  applyHtmlAttributes('en', 'ltr');
}

/**
 * Replace {param} placeholders with provided values
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const val = params[key];
    return val !== undefined ? String(val) : match;
  });
}

/**
 * Core translation function:
 * 1. Checks current language dictionary
 * 2. If Arabic and not found, falls back to English dictionary
 * 3. If still missing, falls back to the key text itself
 */
export function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>,
  mode: Mode = 'engineer',
): string {
  const currentDict = dictionaries[lang];
  const enDict = dictionaries.en;
  // Cadet mode: a `cadet.<key>` entry replaces the Engineer wording (same params, same numbers).
  if (mode === 'cadet') {
    const c = currentDict?.[`cadet.${key}`] ?? enDict?.[`cadet.${key}`];
    if (c !== undefined) return interpolate(c, params);
  }
  const translation = currentDict?.[key] ?? enDict?.[key];
  if (translation === undefined) {
    return key;
  }
  return interpolate(translation, params);
}

/**
 * Standalone translation function.
 * Evaluates against current active language in memory.
 * Missing keys fall back to key text.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const currentLang = useI18nStore.getState().lang;
  return translate(currentLang, key, params, useMode.getState().mode);
}

export interface TranslatableMsg {
  key: string;
  params?: Record<string, string | number>;
  en?: string;
}

/**
 * Helper to translate engine Msg objects.
 */
export function tMsg(msg: TranslatableMsg): string {
  return translateMsg(useI18nStore.getState().lang, msg);
}

const ENGINE_AR = engineAr as Record<string, string>;

/**
 * Engine Msg: Arabic template from engine-ar.json when every placeholder has a param;
 * otherwise the engine's own English text (`en`), which already has the numbers filled in.
 */
export function translateMsg(lang: Language, msg: TranslatableMsg): string {
  if (lang === 'ar') {
    const tpl = ENGINE_AR[msg.key] ?? dictionaries.ar[msg.key];
    if (tpl !== undefined) {
      const needed = [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
      if (needed.every((k) => msg.params?.[k] !== undefined)) return interpolate(tpl, msg.params);
    }
  }
  if (msg.en !== undefined) return msg.en;
  return msg.key;
}

/**
 * React hook for consuming translations.
 * Subscribes component to store updates so it re-renders on language toggle.
 */
export function useI18n() {
  const lang = useI18nStore((s) => s.lang);
  const dir = useI18nStore((s) => s.dir);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  const toggleLanguage = useI18nStore((s) => s.toggleLanguage);

  const mode = useMode((s) => s.mode);
  const tBound = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params, mode);
  /** H1 term(key): the Cadet or Engineer label of a term (`term.<key>` in i18n). */
  const term = (key: string, params?: Record<string, string | number>) => translate(lang, `term.${key}`, params, mode);

  const tMsgBound = (msg: TranslatableMsg) => translateMsg(lang, msg);

  return {
    t: tBound,
    term,
    tMsg: tMsgBound,
    mode,
    cadet: mode === 'cadet',
    lang,
    dir,
    setLanguage,
    toggleLanguage,
  };
}
