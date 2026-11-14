import { create } from 'zustand';
import enTranslations from './en.json';
import arTranslations from './ar.json';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

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
  params?: Record<string, string | number>
): string {
  const currentDict = dictionaries[lang];
  const enDict = dictionaries.en;

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
  return translate(currentLang, key, params);
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
  const currentLang = useI18nStore.getState().lang;
  const currentDict = dictionaries[currentLang];
  const translation = currentDict?.[msg.key];
  if (translation !== undefined) {
    return interpolate(translation, msg.params);
  }
  if (msg.en !== undefined) {
    return interpolate(msg.en, msg.params);
  }
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

  const tBound = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  return {
    t: tBound,
    lang,
    dir,
    setLanguage,
    toggleLanguage,
  };
}
