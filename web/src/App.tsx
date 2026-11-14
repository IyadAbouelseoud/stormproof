import React, { useState, useEffect } from 'react';

const COLOR_TOKENS = [
  { name: 'ground', desc: 'Page background' },
  { name: 'ground-raised', desc: 'Card background' },
  { name: 'ground-sunken', desc: 'Input/slot background' },
  { name: 'rule', desc: 'Dividers and borders' },
  { name: 'ink', desc: 'Primary typography' },
  { name: 'ink-muted', desc: 'Secondary typography' },
  { name: 'ink-faint', desc: 'Faint labels / inactive' },
  { name: 'sol', desc: 'Sun core (reserved for Sun)' },
  { name: 'sol-ink', desc: 'Sun text and severe drag' },
  { name: 'sol-tint', desc: 'Sun shaded area' },
  { name: 'lapis', desc: 'Primary actions and disposal' },
  { name: 'lapis-tint', desc: 'Lapis accent fill' },
  { name: 'on-lapis', desc: 'Text on lapis buttons' },
  { name: 'brass', desc: 'Section headings and ticks' },
  { name: 'ok', desc: 'Passing state' },
  { name: 'warn', desc: 'Warning state' },
  { name: 'fail', desc: 'Failing state' },
];

const SUNSTRIPE_TOKENS = [
  { name: 'sunstripe-0', desc: 'Quiet Sun (<80 sfu)' },
  { name: 'sunstripe-1', desc: 'Low activity (80-110 sfu)' },
  { name: 'sunstripe-2', desc: 'Moderate (110-140 sfu)' },
  { name: 'sunstripe-3', desc: 'Elevated (140-180 sfu)' },
  { name: 'sunstripe-4', desc: 'High (180-220 sfu)' },
  { name: 'sunstripe-5', desc: 'Extreme (>220 sfu)' },
];

export default function App(): React.JSX.Element {
  const [theme, setTheme] = useState<'paper' | 'night'>('paper');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'paper' ? 'night' : 'paper'));
  };

  return (
    <main className="app-container">
      <header className="app-header">
        <div>
          <h1 className="type-display-l">STORMPROOF</h1>
          <p className="type-body">Design Tokens & Theme Verification</p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn type-label"
        >
          Theme: {theme === 'paper' ? 'Switch to Night' : 'Switch to Paper'}
        </button>
      </header>

      <section>
        <h2 className="type-heading section-title">Theme Palette ({theme})</h2>
        <div className="swatch-grid">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} className="swatch-card">
              <div
                className="swatch-preview"
                style={{ backgroundColor: `var(--color-${token.name})` }}
              />
              <div className="swatch-info">
                <span className="type-data swatch-name">--{token.name}</span>
                <span className="type-small swatch-desc">{token.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="type-heading section-title">Sun Stripe Scale (F10.7 Activity)</h2>
        <div className="swatch-grid">
          {SUNSTRIPE_TOKENS.map((token) => (
            <div key={token.name} className="swatch-card">
              <div
                className="swatch-preview"
                style={{ backgroundColor: `var(--${token.name})` }}
              />
              <div className="swatch-info">
                <span className="type-data swatch-name">--{token.name}</span>
                <span className="type-small swatch-desc">{token.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
