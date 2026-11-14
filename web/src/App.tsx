import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';
import { LanguageToggle } from './ui/LanguageToggle';
import { CmlRail } from './ui/CmlRail';
import { NavigationControls } from './ui/NavigationControls';
import { useNavigation, type ScreenId } from './navigation';
import { useMission } from './store';
import { loadEngine, useEngineStatus } from './engineAdapter';
import { reducedMotion } from './format';
import { Brief, Build, Orbit, Launch, Flight, Report, Refly } from './screens';
import { Gallery } from './screens/Gallery';
import { Handover } from './screens/Handover';
import { TokenSwatches } from './screens/TokenSwatches';

const SCREEN_COMPONENTS: Record<ScreenId, React.ComponentType> = { Brief, Build, Orbit, Launch, Flight, Report, Refly };

type View = 'mission' | 'gallery' | 'tokens';
const viewOf = (hash: string): View =>
  hash === '#gallery' ? 'gallery' : hash === '#tokens' || hash === '#swatches' ? 'tokens' : 'mission';

export default function App(): React.JSX.Element {
  const { t } = useI18n();
  const currentScreen = useNavigation((s) => s.currentScreen);
  const handoverTo = useNavigation((s) => s.handoverTo);
  const status = useEngineStatus((s) => s.status);
  const refresh = useMission((s) => s.refresh);
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

  // Paper everywhere except Flight (Night). The turn to Night takes --dur-launch (instant if reduced motion).
  const theme = view === 'mission' && currentScreen === 'Flight' && !handoverTo ? 'night' : 'paper';
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
    <div className="app-container">
      <a className="skip-link type-label" href="#main">
        {t('shell.skip')}
      </a>
      <header className="app-header">
        <div className="app-title-group">
          <h1 className="type-display-l app-title">{t('app.title')}</h1>
          <p className="type-small app-pitch">{t('app.pitch')}</p>
        </div>
        <div className="header-controls">
          {status === 'loading' && <span className="type-label engine-status">{t('engine.loading')}</span>}
          {status === 'mock' && <span className="type-label engine-status engine-status--mock">{t('engine.mock')}</span>}
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
  );
}
