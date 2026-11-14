/** Seeded PRNG (mulberry32, public domain). State is a uint32; same seed gives the same stream. */
export interface Rng {
  /** Next uint32. */
  u32(): number;
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const u32 = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const next = (): number => u32() / 4294967296;
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return { u32, next, int };
}
