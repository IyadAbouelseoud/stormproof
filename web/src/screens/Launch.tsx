import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum, reducedMotion } from '../format';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { sunMonths, useEngineStatus } from '../engineAdapter';
import { Button } from '../ui/components';
import { SunStripe } from '../ui/SunStripe';
import { Illustration } from '../ui/Illustration';
import { playLaunchTick } from '../sound';
import { AliveIndicator } from '../ui/Jeddah';
import { ScreenFrame } from './ScreenFrame';

function RocketSvg({ liftoff }: { liftoff: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 120" className="launch-rocket-svg" role="img" aria-hidden="true">
      {/* Pad ground line */}
      <line x1="4" y1="118" x2="44" y2="118" stroke="var(--color-rule)" strokeWidth="2" strokeLinecap="round" />
      {/* Small gantry frame */}
      <line x1="8" y1="118" x2="8" y2="40" stroke="var(--color-rule)" strokeWidth="1" />
      <line x1="8" y1="50" x2="16" y2="50" stroke="var(--color-rule)" strokeWidth="1" />
      <line x1="8" y1="80" x2="16" y2="80" stroke="var(--color-rule)" strokeWidth="1" />
      {/* Nose cone */}
      <polygon points="24,14 16,38 32,38" fill="var(--color-ground-raised)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Stage 2 body */}
      <rect x="16" y="38" width="16" height="26" fill="var(--color-ground-raised)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Lapis accent ring */}
      <rect x="16" y="56" width="16" height="4" fill="var(--color-lapis)" />
      {/* Interstage separation line */}
      <line x1="16" y1="64" x2="32" y2="64" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Stage 1 body */}
      <rect x="16" y="64" width="16" height="38" fill="var(--color-ground-raised)" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Fins */}
      <polygon points="16,92 10,102 16,102" fill="var(--color-lapis)" stroke="var(--color-ink)" strokeWidth="1" />
      <polygon points="32,92 38,102 32,102" fill="var(--color-lapis)" stroke="var(--color-ink)" strokeWidth="1" />
      {/* Nozzle */}
      <polygon points="19,102 29,102 30,110 18,110" fill="var(--color-ink)" />
      {/* Flat flame during liftoff */}
      {liftoff && <polygon points="19,110 29,110 24,118" fill="var(--color-sol)" />}
    </svg>
  );
}

export function PlanTruthNote(): React.JSX.Element {
  const { t, lang } = useI18n();
  const r = useMission((s) => s.result);
  const p = r.planVsTruth;
  const lb = (b: boolean) => (b ? t('common.at_least') + ' ' : '');
  return (
    <dl className="ptn">
      <div className="ptn-row">
        <dt className="type-label">{t('ptn.plan')}</dt>
        <dd className="type-data-l">
          {lb(p.planIsLowerBound)}
          {fmtNum(lang, p.planLifetimeDays)} <span className="type-data sp-unit">{t('unit.days')}</span>
        </dd>
      </div>
      <div className="ptn-row">
        <dt className="type-label">{t('ptn.truth')}</dt>
        <dd className="type-data-l">
          {lb(p.truthIsLowerBound)}
          {fmtNum(lang, p.truthLifetimeDays)} <span className="type-data sp-unit">{t('unit.days')}</span>
        </dd>
      </div>
      <div className="ptn-row ptn-row--sun">
        <dt className="type-label">{p.sunTookDays >= 0 ? t('ptn.sun_took') : t('ptn.sun_gave')}</dt>
        <dd className="type-data-l">
          {fmtNum(lang, Math.abs(p.sunTookDays))} <span className="type-data sp-unit">{t('unit.days')}</span>
        </dd>
      </div>
    </dl>
  );
}

export function Launch(): React.JSX.Element {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const setLaunchDate = useMission((s) => s.setLaunchDate);
  const launch = useMission((s) => s.launch);
  const result = useMission((s) => s.result);
  const setScreen = useNavigation((s) => s.setScreen);
  useEngineStatus((s) => s.status); // re-render when the data arrives
  const months = sunMonths();
  const idx = months ? Math.max(0, months.findIndex((m) => m.month === design.launchDate.slice(0, 7))) : 0;
  const blocked = result.fit.filter((f) => !f.pass);
  const [ceremony, setCeremony] = useState<'idle' | 'countdown' | 'liftoff'>('idle');
  const [count, setCount] = useState<number>(3);
  const finished = useRef(false);

  const finishLaunch = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    launch();
    setScreen('Flight');
  }, [launch, setScreen]);

  const startLaunch = () => {
    if (reducedMotion()) {
      finishLaunch();
      return;
    }
    playLaunchTick();
    setCeremony('countdown');
    setCount(3);
  };

  useEffect(() => {
    if (ceremony === 'idle') return;

    // Skippable with any key or click
    const handleSkip = () => finishLaunch();
    window.addEventListener('keydown', handleSkip);
    window.addEventListener('pointerdown', handleSkip);

    let timer: number;
    if (ceremony === 'countdown') {
      if (count > 1) {
        timer = window.setTimeout(() => {
          playLaunchTick();
          setCount((c) => c - 1);
        }, 240);
      } else {
        timer = window.setTimeout(() => {
          setCeremony('liftoff');
          const root = document.documentElement;
          root.classList.add('theme-turning');
          root.setAttribute('data-theme', 'night');
        }, 240);
      }
    } else if (ceremony === 'liftoff') {
      timer = window.setTimeout(() => {
        finishLaunch();
      }, 600);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleSkip);
      window.removeEventListener('pointerdown', handleSkip);
    };
  }, [ceremony, count, finishLaunch]);

  return (
    <ScreenFrame id="Launch">
      <Illustration id="p8" src="img/art/art-p8-launch-header-v1.webp" alt={t('launch.go')} className="launch-header-art" />
      <section aria-labelledby="date-h">
        <h3 id="date-h" className="type-label section-label">
          {t('launch.date')}
        </h3>
        <p className="type-data-l">{fmtDate(lang, design.launchDate)}</p>
        <Illustration id="p11" src="img/art/art-p11-solar-storm-v1.webp" alt={t('sun.legend')} className="launch-storm-art" />
        {months ? (
          <SunStripe
            months={months}
            value={idx}
            label={t('launch.date')}
            onChange={(i) => {
              const m = months[i];
              if (m) setLaunchDate(`${m.month}-15`);
            }}
          />
        ) : (
          <div className="art-slot type-small">{t('engine.loading')}</div>
        )}
        <p className="type-small sun-legend">
          {t('sun.legend')} <span className="type-data">{t('sun.steps')}</span>
        </p>
      </section>

      <section aria-labelledby="ptn-h">
        <h3 id="ptn-h" className="type-label section-label">
          {t('ptn.title')}
        </h3>
        <PlanTruthNote />
        <p className="type-small">{t('ptn.explain')}</p>
      </section>

      <AliveIndicator result={result} />
      <section className="launch-go">
        {blocked.length > 0 && ceremony === 'idle' && (
          <p className="type-small launch-warn">{t('launch.blocked', { n: blocked.length })}</p>
        )}
        {ceremony === 'idle' ? (
          <Button className="launch-btn" onClick={startLaunch}>
            <span className="type-display-l">{t('launch.go')}</span>
          </Button>
        ) : (
          <div
            className={`launch-ceremony ${ceremony === 'liftoff' ? 'launch-ceremony--liftoff' : ''}`}
            role="status"
            aria-live="assertive"
            onClick={finishLaunch}
          >
            <div className="launch-ceremony-rocket-box">
              <RocketSvg liftoff={ceremony === 'liftoff'} />
            </div>
            <p className="launch-countdown-num type-data-l">
              {ceremony === 'liftoff' ? t('launch.liftoff') : count}
            </p>
            <span className="type-small launch-ceremony-skip">{t('launch.ceremony_skip')}</span>
          </div>
        )}
      </section>
    </ScreenFrame>
  );
}
