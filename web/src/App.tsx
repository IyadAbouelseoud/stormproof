import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';
import { LanguageToggle } from './ui/LanguageToggle';
import { CmlRail } from './ui/CmlRail';
import { NavigationControls } from './ui/NavigationControls';
import { useNavigation, type ScreenId } from './navigation';
import { useMission } from './store';
import { loadEngine, scenario, useEngineStatus } from './engineAdapter';
import { tx, scenarioText } from './content';
import { isSoundEnabled, setSoundEnabled, playPartSnap } from './sound';
import { reducedMotion } from './format';
import { Brief, Build, Orbit, Launch, Flight, Report, Refly } from './screens';
import { Gallery } from './screens/Gallery';
import { Handover } from './screens/Handover';
import { Starfield } from './ui/Starfield';
import { HeaderOrbitScene } from './ui/HeaderOrbitScene';
import { TokenSwatches } from './screens/TokenSwatches';

const SCREEN_COMPONENTS: Record<ScreenId, React.ComponentType> = { Brief, Build, Orbit, Launch, Flight, Report, Refly };

type View = 'mission' | 'gallery' | 'tokens';
const viewOf = (hash: string): View =>
  hash === '#gallery' ? 'gallery' : hash === '#tokens' || hash === '#swatches' ? 'tokens' : 'mission';

function ScoreCountUp({ target }: { target: number }): React.JSX.Element {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (reducedMotion() || prev.current === target) {
      setVal(target);
      prev.current = target;
      return;
    }
    const startVal = prev.current;
    prev.current = target;
    const start = performance.now();
    const dur = 240;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setVal(Math.round(startVal + p * (target - startVal)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val}</>;
}

function SoundToggle(): React.JSX.Element {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(isSoundEnabled);
  const [showTooltip, setShowTooltip] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('sp-sound-tooltip-seen') !== '1';
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setShowTooltip(false);
    try {
      localStorage.setItem('sp-sound-tooltip-seen', '1');
    } catch {}
  };

  const toggle = () => {
    dismiss();
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) playPartSnap();
  };

  return (
    <div className="sound-toggle-wrapper">
      <button
        type="button"
        className="sound-toggle-btn"
        onClick={toggle}
        aria-label={t('sound.toggle')}
        aria-pressed={enabled}
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" className="sound-icon">
          {enabled ? (
            <path d="M6 3 L3 5.5 L1 5.5 L1 10.5 L3 10.5 L6 13 Z M9 5 A4 4 0 0 1 9 11 M11 3 A7 7 0 0 1 11 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
          ) : (
            <path d="M6 3 L3 5.5 L1 5.5 L1 10.5 L3 10.5 L6 13 Z M9.5 6.5 L13.5 10.5 M13.5 6.5 L9.5 10.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          )}
        </svg>
      </button>
      {showTooltip && (
        <div className="sound-tooltip type-small" role="tooltip" onClick={dismiss}>
          <span>{t('sound.tooltip')}</span>
          <button type="button" className="sound-tooltip-close" aria-label="Dismiss" onClick={dismiss}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: 'night' | 'paper'; onToggle: () => void }): React.JSX.Element {
  const { t } = useI18n();
  const label = t(theme === 'night' ? 'theme.switch_to_paper' : 'theme.switch_to_night');
  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" className="theme-icon">
        {theme === 'night' ? (
          <path d="M13.5 10.5 A6 6 0 1 1 5.5 2.5 A5 5 0 0 0 13.5 10.5 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        ) : (
          <path d="M8 3.5 A4.5 4.5 0 1 1 8 12.5 A4.5 4.5 0 1 1 8 3.5 M8 1 L8 2.5 M8 13.5 L8 15 M1 8 L2.5 8 M13.5 8 L15 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}

export default function App(): React.JSX.Element {
  const { t, lang } = useI18n();
  const currentScreen = useNavigation((s) => s.currentScreen);
  const handoverTo = useNavigation((s) => s.handoverTo);
  const status = useEngineStatus((s) => s.status);
  const refresh = useMission((s) => s.refresh);
  const result = useMission((s) => s.result);
  const sc = scenario(result.design.scenarioId);
  const [view, setView] = useState<View>(() => viewOf(window.location.hash));

  useEffect(() => {
    loadEngine();
  }, []);
  // once real data is in, recompute the live result (it was the mock until then)
  useEffect(() => {
    if (status === 'ready') refresh();
  }, [status, refresh]);

  useEffect(() => {
    const onHash = () => setView(viewOf(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Space (Night, with the star field) for the whole game; Paper as optional toggle (saved in localStorage).
  const [missionTheme, setMissionTheme] = useState<'night' | 'paper'>(() => {
    if (typeof window === 'undefined') return 'night';
    try {
      const saved = localStorage.getItem('sp-mission-theme');
      if (saved === 'paper' || saved === 'night') return saved;
    } catch {}
    return 'night';
  });

  const toggleTheme = () => {
    const next = missionTheme === 'night' ? 'paper' : 'night';
    setMissionTheme(next);
    try {
      localStorage.setItem('sp-mission-theme', next);
    } catch {}
  };

  const theme = view === 'mission' ? missionTheme : 'paper';
  const prevTheme = useRef(theme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (prevTheme.current !== theme && !reducedMotion()) {
      root.classList.add('theme-turning');
      const id = window.setTimeout(() => root.classList.remove('theme-turning'), 700);
      prevTheme.current = theme;
      root.setAttribute('data-theme', theme);
      return () => window.clearTimeout(id);
    }
    prevTheme.current = theme;
    root.setAttribute('data-theme', theme);
    return undefined;
  }, [theme]);

  // move focus to the new screen heading on navigation (keyboard and screen-reader users)
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.querySelector<HTMLElement>('h2')?.focus();
    window.scrollTo({ top: 0 });
  }, [currentScreen, handoverTo]);

  const ActiveScreen = SCREEN_COMPONENTS[currentScreen];

  return (
    <>
    <Starfield />
    <div className="app-container">
      <a className="skip-link type-label" href="#main">
        {t('shell.skip')}
      </a>
      <header className="app-header">
        <div className="app-title-group">
          <h1 className="type-display-l app-title">{t('app.title')}</h1>
          <p className="type-small app-pitch">{t('app.pitch')}</p>
          <div className="header-status-strip type-data" aria-live="polite">
            {t('header.status', { name: (tx(scenarioText(result.design.scenarioId)?.title, lang, sc?.name || result.design.scenarioId)) })} <ScoreCountUp target={result.score.total} />/100
          </div>
        </div>
        <div className="header-controls">
          <HeaderOrbitScene />
          {status === 'loading' && <span className="type-label engine-status">{t('engine.loading')}</span>}
          {status === 'mock' && <span className="type-label engine-status engine-status--mock">{t('engine.mock')}</span>}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <SoundToggle />
          <LanguageToggle />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1}>
        {view === 'gallery' ? (
          <Gallery />
        ) : view === 'tokens' ? (
          <TokenSwatches />
        ) : (
          <section className="mission-flow-container">
            <CmlRail />
            {handoverTo ? <Handover role={handoverTo} /> : <ActiveScreen />}
            {!handoverTo && <NavigationControls />}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <nav className="footer-links type-label" aria-label={t('shell.views')}>
          <a href="#" aria-current={view === 'mission' ? 'page' : undefined}>
            {t('shell.switch_to_mission')}
          </a>
          <a href="#gallery" aria-current={view === 'gallery' ? 'page' : undefined}>
            {t('gallery.title')}
          </a>
          <a href="#tokens" aria-current={view === 'tokens' ? 'page' : undefined}>
            {t('shell.switch_to_swatches')}
          </a>
        </nav>
        <p className="type-small footer-credit">{t('shell.credit')}</p>
      </footer>
    </div>
    </>
  );
}
