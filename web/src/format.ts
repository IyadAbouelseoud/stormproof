import type { Language } from './i18n';

/** Latin digits in both languages so data columns stay aligned in the mono font. */
const loc = (lang: Language): string => (lang === 'ar' ? 'ar-u-nu-latn' : 'en-US');

export function fmtNum(lang: Language, v: number, maxFrac = 1): string {
  return new Intl.NumberFormat(loc(lang), { maximumFractionDigits: maxFrac }).format(v);
}

export function fmtSigned(lang: Language, v: number, maxFrac = 1): string {
  const s = fmtNum(lang, Math.abs(v), maxFrac);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

/** 'YYYY-MM-DD' -> localized date, UTC. */
export function fmtDate(lang: Language, iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(loc(lang), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
}

/** 'YYYY-MM' -> localized month. */
export function fmtMonth(lang: Language, ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(loc(lang), { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

/** Currency per language (UI formats money; the engine passes plain numbers). */
export function fmtUsd(lang: Language, v: number): string {
  return new Intl.NumberFormat(loc(lang), { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
