import type { Msg } from './contracts';

export const msg = (key: string, en: string, params: Record<string, string | number> = {}): Msg => ({ key, params, en });

/** Round for display in messages. */
export const r1 = (v: number): number => Math.round(v * 10) / 10;
