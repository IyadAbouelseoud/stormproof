import React from 'react';
import '../styles/starfield.css';

/** Seeded star field (same every load). Pure CSS: three box-shadow layers drift on the GPU; no canvas, no JS per frame. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const W = 2560;
const H = 1600;
function layer(n: number, seed: number, colors: string[]): string {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(r() * colors.length)] ?? colors[0];
    out.push(`${Math.floor(r() * W)}px ${Math.floor(r() * H)}px 0 0 ${c}`);
  }
  return out.join(',');
}
const INK = 'var(--color-ink)';
const LAPIS = 'var(--color-lapis)';
const BRASS = 'var(--color-brass)';
const SHADOWS = {
  s1: layer(170, 11, [INK, INK, INK, LAPIS]),
  s2: layer(70, 23, [INK, LAPIS, INK, BRASS]),
  s3: layer(22, 37, [INK, LAPIS, BRASS]),
};

export function Starfield(): React.JSX.Element {
  return (
    <div className="sp-stars" aria-hidden="true">
      <div className="sp-stars-layer sp-stars-1" style={{ ['--sh' as string]: SHADOWS.s1 }} />
      <div className="sp-stars-layer sp-stars-2" style={{ ['--sh' as string]: SHADOWS.s2 }} />
      <div className="sp-stars-layer sp-stars-3" style={{ ['--sh' as string]: SHADOWS.s3 }} />
      <span className="sp-shoot sp-shoot-a" />
      <span className="sp-shoot sp-shoot-b" />
    </div>
  );
}
