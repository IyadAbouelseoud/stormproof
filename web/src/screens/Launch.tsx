import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum, reducedMotion } from '../format';
import { rocketName } from '../content';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { rockets, sunMonths, useEngineStatus, type Rocket } from '../engineAdapter';
import { Button, CheckMark, CrossMark, SrcTag } from '../ui/components';
import { SunStripe } from '../ui/SunStripe';
import { Illustration } from '../ui/Illustration';
import { playLaunchTick } from '../sound';
import { AliveIndicator } from '../ui/Jeddah';
import { ScreenFrame } from './ScreenFrame';
import { ReqTracker } from '../ui/ReqTracker';
import { Term } from '../ui/Cadet';

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

function RocketSilhouette(): React.JSX.Element {
  return (
    <svg viewBox="0 0 40 80" width="32" height="64" className="rocket-silhouette-svg" aria-hidden="true">
      <polygon points="20,8 14,24 26,24" fill="var(--color-ink-muted)" />
      <rect x="14" y="24" width="12" height="36" fill="var(--color-ink-muted)" />
      <polygon points="14,50 8,64 14,64" fill="var(--color-ink-muted)" />
      <polygon points="26,50 32,64 26,64" fill="var(--color-ink-muted)" />
      <rect x="16" y="64" width="8" height="4" fill="var(--color-ink-muted)" />
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
  const { t, tMsg, lang } = useI18n();
  const design = useMission((s) => s.design);
  const setLaunchDate = useMission((s) => s.setLaunchDate);
  const setRocket = useMission((s) => s.setRocket);
  const launch = useMission((s) => s.launch);
  const result = useMission((s) => s.result);
  const setScreen = useNavigation((s) => s.setScreen);
  useEngineStatus((s) => s.status); // re-render when the data arrives

  const months = sunMonths();
  const idx = months ? Math.max(0, months.findIndex((m) => m.month === design.launchDate.slice(0, 7))) : 0;
  const blocked = result.fit.filter((f) => !f.pass);
  const availableRockets = rockets();

  const [ceremony, setCeremony] = useState<'idle' | 'countdown' | 'liftoff'>('idle');
  const [count, setCount] = useState<number>(3);
  const finished = useRef(false);

  // Pre-flight checklist sequential ticking (120ms per row)
  const checks = result.fit;
  const [tickedCount, setTickedCount] = useState<number>(() => (reducedMotion() ? checks.length : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setTickedCount(checks.length);
      return;
    }
    setTickedCount(0);
    let current = 0;
    const interval = window.setInterval(() => {
      current++;
      setTickedCount(current);
      if (current >= checks.length) {
        window.clearInterval(interval);
      }
    }, 120);
    return () => window.clearInterval(interval);
  }, [checks.length, design.rocketId, design.launchDate]);

  const checklistReady = tickedCount >= checks.length;

  const finishLaunch = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    launch();
    setScreen('Flight');
  }, [launch, setScreen]);

  const startLaunch = () => {
    if (!checklistReady) return;
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
          if (!reducedMotion()) {
            window.dispatchEvent(new CustomEvent('sp-warp'));
          }
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

  const satMassKg = result.gauges.mass?.value ?? 0;

  return (
    <ScreenFrame id="Launch">
      <div className="tracker-sticky"><ReqTracker /></div>
      <Illustration id="p8" src="img/art/art-p8-launch-header-v1.webp" alt={t('launch.go')} className="launch-header-art" />

      {/* Launch Date & Solar Stripe section */}
      <section aria-labelledby="date-h" className="launch-section console-panel">
        <div className="console-panel-header">
          <h3 id="date-h" className="type-label section-label">
            {t('launch.date')}
          </h3>
          <p className="type-data-l">{fmtDate(lang, design.launchDate)}</p>
        </div>

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
          {t('sun.legend')} <span className="type-data">{t('sun.steps')}</span> <Term id="sun" />
        </p>

        <PlanTruthNote />
        <p className="type-small">{t('ptn.explain')}</p>
      </section>

      {/* Pre-Flight Baseline Grid: Rockets and Checklist */}
      <div className="launch-prep-grid">
        {/* Rocket Selection Cards */}
        <section aria-labelledby="rocket-h" className="launch-rockets-col console-panel">
          <div className="console-panel-header">
            <h3 id="rocket-h" className="type-label section-label">
              {t('launch.rocket_selection')}
            </h3>
          </div>
          <div className="rocket-card-grid">
            {availableRockets.map((r: Rocket) => {
              const selected = design.rocketId === r.id;
              const orbitFit =
                r.orbits.includes(design.orbit.type) &&
                design.orbit.altitudeKm >= r.minAltKm &&
                design.orbit.altitudeKm <= r.maxAltKm;
              const massFit = satMassKg <= r.capacityKg;
              const isFit = orbitFit && massFit;
              const massPct = Math.min(100, Math.round((satMassKg / r.capacityKg) * 100));
              const artId = r.id === 'electron' ? 'art-p18-rocket-light-card-v1' : 'art-p19-rocket-heavy-card-v1';
              const artSrc = r.id === 'electron' ? 'img/art/art-p18-rocket-light-card-v1.webp' : 'img/art/art-p19-rocket-heavy-card-v1.webp';

              return (
                <button
                  key={r.id}
                  type="button"
                  className={`rocket-card console-tile ${selected ? 'rocket-card--selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => setRocket(r.id)}
                >
                  <div className="rocket-portrait-slot">
                    <Illustration
                      id={artId}
                      src={artSrc}
                      alt={rocketName(r.id, lang, r.name)}
                      className="rocket-card-art"
                    />
                    <div className="rocket-portrait-fallback">
                      <RocketSilhouette />
                    </div>
                  </div>

                  <div className="rocket-card-body">
                    <div className="rocket-card-head">
                      <span className="type-heading rocket-name">{rocketName(r.id, lang, r.name)}</span>
                      <SrcTag src={r.src} />
                    </div>

                    {/* Capacity Bar vs Satellite Mass */}
                    <div className="rocket-cap-wrap">
                      <div className="rocket-cap-labels type-small">
                        <span>{t('rocket.capacity')}</span>
                        <span className="type-data">{fmtNum(lang, satMassKg)} / {fmtNum(lang, r.capacityKg)} {t('unit.kg')}</span>
                      </div>
                      <div className="rocket-cap-bar" aria-hidden="true">
                        <div
                          className={`rocket-cap-fill ${massFit ? 'rocket-cap-fill--ok' : 'rocket-cap-fill--over'}`}
                          style={{ inlineSize: `${massPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Orbit Fit & Range */}
                    <div className="rocket-card-specs type-small">
                      <div className={`rocket-fit-status ${isFit ? 'rocket-fit--ok' : 'rocket-fit--mismatch'}`}>
                        <span className="fit-icon" aria-hidden="true">{isFit ? <CheckMark /> : <CrossMark />}</span>
                        <span>{isFit ? t('launch.orbit_fit') : t('launch.orbit_mismatch')}</span>
                      </div>
                      <div className="rocket-range-row">
                        <span>{r.minAltKm}-{r.maxAltKm} {t('unit.km')}</span>
                        <span>{r.orbits.map((o) => t(`orbit.${o}`)).join(' / ')}</span>
                      </div>
                    </div>

                    {/* Price Tag */}
                    <div className="rocket-price type-small">
                      {r.minPriceUsd !== undefined ? (
                        <span>
                          {fmtNum(lang, r.minPriceUsd)} <span className="sp-unit">{t('unit.USD')}</span>
                        </span>
                      ) : (
                        <span>
                          {fmtNum(lang, r.priceUsdPerKg)} <span className="sp-unit">{t('unit.USD/kg')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pre-Flight Checklist Column */}
        <section aria-labelledby="check-h" className="launch-checklist-col console-panel">
          <div className="console-panel-header">
            <h3 id="check-h" className="type-label section-label">
              {t('launch.checklist_title')}
            </h3>
            <span className="type-data type-small">
              {checklistReady ? t('launch.checklist_ready') : t('launch.checklist_pending')}
            </span>
          </div>

          <ul className="preflight-checklist" role="list">
            {checks.map((f, i) => {
              const isTicked = i < tickedCount;
              return (
                <li
                  key={f.check}
                  className={`preflight-item preflight-item--${f.pass ? 'pass' : 'fail'} ${isTicked ? 'preflight-item--ticked' : 'preflight-item--pending'}`}
                >
                  <span className="preflight-checkbox" aria-hidden="true">
                    {isTicked ? (f.pass ? <CheckMark /> : <CrossMark />) : '○'}
                  </span>
                  <div className="preflight-details">
                    <span className="type-label preflight-check-name">{t(`check.${f.check}`)}</span>
                    <span className="type-small preflight-reason">{tMsg(f.reason)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <AliveIndicator result={result} />

      {/* Countdown and Launch Button Centred with Fixed Min Height */}
      <section className="launch-go console-panel">
        {blocked.length > 0 && ceremony === 'idle' && (
          <p className="type-small launch-warn">{t('launch.blocked', { n: blocked.length })}</p>
        )}
        {ceremony === 'idle' ? (
          <Button
            className="launch-btn"
            onClick={startLaunch}
            disabled={!checklistReady}
          >
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
