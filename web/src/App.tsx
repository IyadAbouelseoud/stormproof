import React, { useState, useEffect } from 'react';
import { useI18n } from './i18n';
import { LanguageToggle } from './ui/LanguageToggle';
import { CmlRail } from './ui/CmlRail';
import { NavigationControls } from './ui/NavigationControls';
import { useNavigation, ScreenId } from './navigation';
import {
  Brief,
  Build,
  Orbit,
  Launch,
  Flight,
  Report,
  Refly,
} from './screens';

const SCREEN_COMPONENTS: Record<ScreenId, React.ComponentType> = {
  Brief,
  Build,
  Orbit,
  Launch,
  Flight,
  Report,
  Refly,
};

const COLOR_TOKENS = [
  { name: 'ground', descKey: 'token.color.ground' },
  { name: 'ground-raised', descKey: 'token.color.ground-raised' },
  { name: 'ground-sunken', descKey: 'token.color.ground-sunken' },
  { name: 'rule', descKey: 'token.color.rule' },
  { name: 'ink', descKey: 'token.color.ink' },
  { name: 'ink-muted', descKey: 'token.color.ink-muted' },
  { name: 'ink-faint', descKey: 'token.color.ink-faint' },
  { name: 'sol', descKey: 'token.color.sol' },
  { name: 'sol-ink', descKey: 'token.color.sol-ink' },
  { name: 'sol-tint', descKey: 'token.color.sol-tint' },
  { name: 'lapis', descKey: 'token.color.lapis' },
  { name: 'lapis-tint', descKey: 'token.color.lapis-tint' },
  { name: 'on-lapis', descKey: 'token.color.on-lapis' },
  { name: 'brass', descKey: 'token.color.brass' },
  { name: 'ok', descKey: 'token.color.ok' },
  { name: 'warn', descKey: 'token.color.warn' },
  { name: 'fail', descKey: 'token.color.fail' },
];

const SUNSTRIPE_TOKENS = [
  { name: 'sunstripe-0', descKey: 'token.sunstripe.sunstripe-0' },
  { name: 'sunstripe-1', descKey: 'token.sunstripe.sunstripe-1' },
  { name: 'sunstripe-2', descKey: 'token.sunstripe.sunstripe-2' },
  { name: 'sunstripe-3', descKey: 'token.sunstripe.sunstripe-3' },
  { name: 'sunstripe-4', descKey: 'token.sunstripe.sunstripe-4' },
  { name: 'sunstripe-5', descKey: 'token.sunstripe.sunstripe-5' },
];

const TYPOGRAPHY_SAMPLES = [
  {
    className: 'type-display-xl',
    name: 'display-xl',
    desc: 'Big Shoulders Display 800, 88px / 0.92, UPPERCASE',
    sampleKey: 'demo.typography.display_xl',
  },
  {
    className: 'type-display-l',
    name: 'display-l',
    desc: 'Big Shoulders Display 800, 56px / 0.95, UPPERCASE',
    sampleKey: 'demo.typography.display_l',
  },
  {
    className: 'type-display-ar',
    name: 'display-ar',
    desc: 'IBM Plex Sans Arabic 700, 48px / 1.2, Arabic Display',
    sampleKey: 'demo.typography.display_ar',
  },
  {
    className: 'type-heading',
    name: 'heading',
    desc: 'IBM Plex Sans 600, 22px / 1.2',
    sampleKey: 'demo.typography.heading',
  },
  {
    className: 'type-body',
    name: 'body',
    desc: 'IBM Plex Sans 400, 16px / 1.5',
    sampleKey: 'demo.typography.body',
  },
  {
    className: 'type-small',
    name: 'small',
    desc: 'IBM Plex Sans 400, 13px / 1.4',
    sampleKey: 'demo.typography.small',
  },
  {
    className: 'type-data-l',
    name: 'data-l',
    desc: 'IBM Plex Mono 500, 32px / 1',
    sampleKey: 'demo.typography.data_l',
  },
  {
    className: 'type-data',
    name: 'data',
    desc: 'IBM Plex Mono 400, 14px / 1.35',
    sampleKey: 'demo.typography.data',
  },
  {
    className: 'type-label',
    name: 'label',
    desc: 'IBM Plex Sans 600, 11px / 1.2, UPPERCASE, 0.08em tracking',
    sampleKey: 'demo.typography.label',
  },
];

export default function App(): React.JSX.Element {
  const [theme, setTheme] = useState<'paper' | 'night'>('paper');
  const [showSwatches, setShowSwatches] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (window.location.hash === '#tokens' || window.location.hash === '#swatches')
    );
  });
  const { t } = useI18n();
  const { currentScreen } = useNavigation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleHash = () => {
      setShowSwatches(
        window.location.hash === '#tokens' || window.location.hash === '#swatches'
      );
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'paper' ? 'night' : 'paper'));
  };

  const toggleSwatches = () => {
    const nextState = !showSwatches;
    setShowSwatches(nextState);
    if (nextState) {
      window.location.hash = '#tokens';
    } else {
      window.history.pushState(
        '',
        document.title,
        window.location.pathname + window.location.search
      );
    }
  };

  const ActiveScreen = SCREEN_COMPONENTS[currentScreen];

  return (
    <main className="app-container" data-theme={theme}>
      <header className="app-header">
        <div className="app-title-group">
          <h1 className="type-display-l app-title">{t('app.title')}</h1>
          <p className="type-body app-pitch">{t('app.pitch')}</p>
        </div>
        <div className="header-controls">
          <LanguageToggle />
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn type-label"
          >
            {theme === 'paper'
              ? t('theme.switch_to_night')
              : t('theme.switch_to_paper')}
          </button>
        </div>
      </header>

      {showSwatches ? (
        <section>
          <h2 className="type-heading section-title">
            {t('theme.palette_title', { theme })}
          </h2>
          <div className="swatch-grid">
            {COLOR_TOKENS.map((token) => (
              <div key={token.name} className="swatch-card">
                <div
                  className="swatch-preview"
                  style={{ backgroundColor: `var(--color-${token.name})` }}
                />
                <div className="swatch-info">
                  <span className="type-data swatch-name">--{token.name}</span>
                  <span className="type-small swatch-desc">{t(token.descKey)}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="type-heading section-title">{t('theme.sunstripe_title')}</h2>
          <div className="swatch-grid">
            {SUNSTRIPE_TOKENS.map((token) => (
              <div key={token.name} className="swatch-card">
                <div
                  className="swatch-preview"
                  style={{ backgroundColor: `var(--${token.name})` }}
                />
                <div className="swatch-info">
                  <span className="type-data swatch-name">--{token.name}</span>
                  <span className="type-small swatch-desc">{t(token.descKey)}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="type-heading section-title">{t('theme.typography_title')}</h2>
          <div className="type-specimen-list">
            {TYPOGRAPHY_SAMPLES.map((item) => (
              <div key={item.name} className="type-specimen-card">
                <div className="type-label type-specimen-meta">
                  {item.name} — {item.desc}
                </div>
                <div className={item.className}>{t(item.sampleKey)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mission-flow-container">
          <CmlRail />
          <ActiveScreen />
          <NavigationControls />
        </section>
      )}

      <footer className="app-footer">
        <button
          type="button"
          onClick={toggleSwatches}
          className="view-toggle-btn type-label"
        >
          {showSwatches
            ? t('shell.switch_to_mission')
            : t('shell.switch_to_swatches')}
        </button>
      </footer>
    </main>
  );
}
