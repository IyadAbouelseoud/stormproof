import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../navigation';
import '../styles/starfield.css';

/** Seeded star field (same every load). Pure CSS drift/twinkle on the GPU; the only JS is a throttled pointer parallax and a warp flag on screen change. */
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
  s1: layer(260, 11, [INK, INK, INK, LAPIS]),
  s2: layer(110, 23, [INK, LAPIS, INK, BRASS]),
  s3: layer(36, 37, [INK, LAPIS, BRASS, INK]),
};
/** Hero stars: four-point sparkles at fixed seeded spots (percent of viewport). */
const HERO = (() => {
  const r = rng(71);
  const cols = ['ink', 'brass', 'lapis'] as const;
  return Array.from({ length: 16 }, (_, i) => ({
    x: 4 + r() * 92,
    y: 4 + r() * 92,
    s: 10 + Math.floor(r() * 12),
    c: cols[i % 3] as string,
    d: (r() * 6).toFixed(1),
  }));
})();

export function Starfield(): React.JSX.Element {
  const currentScreen = useNavigation((s) => s.currentScreen);
  const [warp, setWarp] = useState(0);
  const first = useRef(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setWarp((n) => n + 1);
    const t = window.setTimeout(() => setWarp(0), 700);
    return () => window.clearTimeout(t);
  }, [currentScreen]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent): void => {
      x = e.clientX / window.innerWidth - 0.5;
      y = e.clientY / window.innerHeight - 0.5;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          const el = root.current;
          if (el) {
            el.style.setProperty('--px', x.toFixed(3));
            el.style.setProperty('--py', y.toFixed(3));
          }
        });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} className={`sp-stars${warp ? ' sp-stars--warp' : ''}`} aria-hidden="true">
      <div className="sp-par sp-par-1"><div className="sp-stars-layer sp-stars-1" style={{ ['--sh' as string]: SHADOWS.s1 }} /></div>
      <div className="sp-par sp-par-2"><div className="sp-stars-layer sp-stars-2" style={{ ['--sh' as string]: SHADOWS.s2 }} /></div>
      <div className="sp-par sp-par-3">
        <div className="sp-stars-layer sp-stars-3" style={{ ['--sh' as string]: SHADOWS.s3 }} />
        {HERO.map((h, i) => (
          <span
            key={i}
            className={`sp-hero sp-hero--${h.c}`}
            style={{ insetInlineStart: `${h.x}%`, insetBlockStart: `${h.y}%`, inlineSize: h.s, blockSize: h.s, animationDelay: `${h.d}s` }}
          />
        ))}
      </div>
      <span className="sp-shoot sp-shoot-a" />
      <span className="sp-shoot sp-shoot-b" />
      <span className="sp-shoot sp-shoot-c" />
    </div>
  );
}
