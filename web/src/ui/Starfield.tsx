import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../navigation';
import '../styles/starfield.css';

/** Space backdrop: a real NASA ISS photo (Milky Way over Earth's night side) that drifts slowly like the view from orbit, plus a seeded star field (warm-white, realistic sizes) that twinkles on the GPU, and two faint satellites crossing. Pure CSS motion; the only JS is a throttled pointer parallax and a warp flag on screen change. */
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
const INK = 'var(--star-white)';
const LAPIS = 'var(--star-cool)';
const BRASS = 'var(--star-warm)';
const SHADOWS = {
  s1: layer(220, 11, [INK]),
  s2: layer(90, 23, [INK, INK, INK, LAPIS]),
  s3: layer(28, 37, [INK, INK, BRASS, LAPIS]),
};
/** Absolute URLs: a relative url() inside a CSS variable resolves against the stylesheet (assets/), not the page. */
const abs = (path: string): string => new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;
const BACKDROP = {
  ['--bd-l' as string]: `url(${abs('img/space/space-backdrop-1920.webp')})`,
  ['--bd-m' as string]: `url(${abs('img/space/space-backdrop-1280.webp')})`,
  ['--bd-p' as string]: `url(${abs('img/space/space-backdrop-portrait-720.webp')})`,
};
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
    const t = window.setTimeout(() => setWarp(0), 300);
    return () => window.clearTimeout(t);
  }, [currentScreen]);

  useEffect(() => {
    const onWarp = () => {
      setWarp((n) => n + 1);
      window.setTimeout(() => setWarp(0), 300);
    };
    window.addEventListener('sp-warp', onWarp);
    return () => window.removeEventListener('sp-warp', onWarp);
  }, []);

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
      <div className="sp-par sp-par-0"><div className="sp-backdrop" style={BACKDROP} /></div>
      <div className="sp-par sp-par-1"><div className="sp-stars-layer sp-stars-1" style={{ ['--sh' as string]: SHADOWS.s1 }} /></div>
      <div className="sp-par sp-par-2"><div className="sp-stars-layer sp-stars-2" style={{ ['--sh' as string]: SHADOWS.s2 }} /></div>
      <div className="sp-par sp-par-3">
        <div className="sp-stars-layer sp-stars-3" style={{ ['--sh' as string]: SHADOWS.s3 }} />
      </div>
      <span className="sp-sat sp-sat-a" />
      <span className="sp-sat sp-sat-b" />
    </div>
  );
}
