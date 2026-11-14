import type { ISODate } from './contracts';

const MS_DAY = 86_400_000;

/** Days since 1970-01-01 UTC for an ISO date (integer at midnight). */
export const dayNum = (iso: ISODate): number => Date.parse(`${iso}T00:00:00Z`) / MS_DAY;

/** ISO date of a (possibly fractional) day number, floored. */
export const isoOf = (day: number): ISODate => new Date(Math.floor(day) * MS_DAY).toISOString().slice(0, 10);

export const addMonths = (iso: ISODate, months: number): ISODate => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
};
