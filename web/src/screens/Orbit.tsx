import React, { useEffect, useRef, useState } from 'react';
import type { OrbitType } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { AliveIndicator } from '../ui/Jeddah';
import { fmtNum, reducedMotion } from '../format';
import { useMission } from '../store';
import { ALT_MAX_KM, ALT_MIN_KM, altitudeBands, useEngineStatus, type AltitudeBands } from '../engineAdapter';
import { CheckMark, CrossMark, VerdictStamp } from '../ui/components';
import { OrbitScene } from '../ui/OrbitScene';
import { Illustration } from '../ui/Illustration';
import { ScreenFrame } from './ScreenFrame';

function CountUpNumber({ target }: { target: number }): React.JSX.Element {
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

export function FitVerdicts(): React.JSX.Element {
  const { t, tMsg } = useI18n();
  const result = useMission((s) => s.result);
  const fails = result.fit.filter((f) => !f.pass);
  const warns = Object.values(result.gauges).filter((g) => g.state === 'warn');
  const state = fails.length ? 'fail' : warns.length ? 'warn' : 'ok';
  return (
    <section className="fit-summary console-panel" aria-labelledby="fit-h">
      <div className="console-panel-header">
        <h3 id="fit-h" className="type-label section-label">
          {t('fit.title')}
        </h3>
        <span className="type-data type-small">
          {t('fit.count', { fail: fails.length, total: result.fit.length })}
        </span>
      </div>
      <VerdictStamp
        state={state}
        size="s"
        title={t(`fit.verdict.${state}`)}
        detail={t('fit.count', { fail: fails.length, total: result.fit.length })}
      />
      <ul className="fit-list">
        {[...fails, ...result.fit.filter((f) => f.pass)].slice(0, 4).map((f) => (
          <li key={f.check} className={`fit-item fit-item--${f.pass ? 'ok' : 'fail'}`}>
            <span className="type-label fit-mark">{f.pass ? <CheckMark /> : <CrossMark />}</span>
            <span className="type-label fit-check">{t(`check.${f.check}`)}</span>
            <span className="type-small">{tMsg(f.reason)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniRingIcon({ type }: { type: OrbitType }): React.JSX.Element {
  const isSSO = type === 'SSO';
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" className="orbit-mini-ring-svg" aria-hidden="true">
      <circle cx="18" cy="18" r="7" fill="var(--color-ground-raised)" stroke="var(--color-ink)" strokeWidth="1" />
      <ellipse
        cx="18"
        cy="18"
        rx="14"
        ry={isSSO ? 14 : 7}
        transform={isSSO ? 'rotate(-8 18 18)' : 'rotate(-51.6 18 18)'}
        fill="none"
        stroke="var(--color-lapis)"
        strokeWidth="1.5"
      />
      <circle
        cx={isSSO ? 18 + 14 * Math.cos(-0.14) : 18 + 14 * Math.cos(-0.9)}
        cy={isSSO ? 18 + 14 * Math.sin(-0.14) : 18 + 7 * Math.sin(-0.9)}
        r="2"
        fill="var(--color-brass)"
      />
    </svg>
  );
}

export function Orbit(): React.JSX.Element {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const setAltitude = useMission((s) => s.setAltitude);
  const setOrbitType = useMission((s) => s.setOrbitType);
  const result = useMission((s) => s.result);
  const status = useEngineStatus((s) => s.status);
  const [bands, setBands] = useState<AltitudeBands | null>(null);
  const [alt, setAlt] = useState(design.orbit.altitudeKm);

  useEffect(() => {
    setAlt(design.orbit.altitudeKm);
  }, [design.orbit.altitudeKm]);

  // The band depends on everything except altitude; computed after first paint
  const bandKey = JSON.stringify({ ...design, orbit: { ...design.orbit, altitudeKm: 0 } });
  useEffect(() => {
    setBands(null);
    const id = window.setTimeout(() => setBands(altitudeBands(design)), 30);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandKey, status]);

  const span = ALT_MAX_KM - ALT_MIN_KM;
  const pct = (km: number) => `${((km - ALT_MIN_KM) / span) * 100}%`;
  const types: OrbitType[] = ['SSO', 'ISS51.6'];

  const handleAltSlider = (val: number) => {
    setAlt(val);
    setAltitude(val);
  };

  const p = result.planVsTruth;
  const truthDays = Math.round(p.truthLifetimeDays);
  const planDays = Math.round(p.planLifetimeDays);
  const sunDiff = Math.round(Math.abs(p.sunTookDays));
  const fccCompliant = truthDays <= 1826;

  return (
    <ScreenFrame id="Orbit">
      <div className="orbit-table-layout">
        {/* Left 60%: Big Orbit Scene, live drag ring, and altitude controls */}
        <div className="orbit-col-scene">
          <section className="orbit-scene-panel console-panel" aria-labelledby="alt-h">
            <div className="console-panel-header">
              <h3 id="alt-h" className="type-label section-label">
                {t('orbit.altitude')}
              </h3>
              <p className="type-data-l orbit-alt-value">
                <CountUpNumber target={alt} /> <span className="type-data sp-unit">{t('unit.km')}</span>
              </p>
            </div>

            <OrbitScene altitudeKm={alt} orbitType={design.orbit.type} bands={bands} />

            <div className="alt-slider" dir="ltr">
              <div className="alt-band" aria-hidden="true">
                {bands?.dragBelowKm != null && (
                  <div className="alt-band-drag" style={{ insetInlineStart: 0, inlineSize: pct(bands.dragBelowKm) }} />
                )}
                {bands?.disposalAboveKm != null && (
                  <div className="alt-band-disposal" style={{ insetInlineStart: pct(bands.disposalAboveKm), insetInlineEnd: 0 }} />
                )}
              </div>
              <input
                type="range"
                className="alt-range"
                min={ALT_MIN_KM}
                max={ALT_MAX_KM}
                step={10}
                value={alt}
                aria-label={t('orbit.altitude')}
                aria-valuetext={`${alt} ${t('unit.km')}`}
                onChange={(e) => handleAltSlider(Number(e.target.value))}
              />
              <div className="alt-scale type-data" aria-hidden="true">
                <span>{ALT_MIN_KM} km</span>
                <span className="alt-scale-fcc-mark">FCC 5y</span>
                <span>{ALT_MAX_KM} km</span>
              </div>
            </div>

            <ul className="alt-legend type-small">
              <li className="alt-legend-drag">
                {bands === null
                  ? t('orbit.band_computing')
                  : bands.dragBelowKm == null
                    ? t('orbit.drag_none')
                    : t('orbit.drag_below', { km: bands.dragBelowKm })}
              </li>
              <li className="alt-legend-disposal">
                {bands === null
                  ? t('orbit.band_computing')
                  : bands.disposalAboveKm == null
                    ? t('orbit.disposal_none')
                    : t('orbit.disposal_above', { km: bands.disposalAboveKm })}
              </li>
              <li className="alt-legend-basis">
                {bands?.basis === 'placeholder' ? t('orbit.band_placeholder') : t('orbit.band_basis')}
              </li>
            </ul>
          </section>
        </div>

        {/* Right 40%: Orbit-type cards, Sun risk strip, and fit checks */}
        <div className="orbit-col-controls">
          {/* Orbit Type Selection Tiles */}
          <section className="orbit-type-section console-panel" aria-labelledby="otype-h">
            <h3 id="otype-h" className="type-label section-label">
              {t('orbit.type')}
            </h3>
            <div className="orbit-type-tiles" role="group" aria-labelledby="otype-h">
              {types.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  className={`orbit-tile console-tile ${design.orbit.type === ty ? 'orbit-tile--selected' : ''}`}
                  aria-pressed={design.orbit.type === ty}
                  onClick={() => setOrbitType(ty)}
                >
                  <div className="orbit-tile-icon-wrap">
                    <MiniRingIcon type={ty} />
                  </div>
                  <div className="orbit-tile-content">
                    <span className="type-heading orbit-tile-title">{t(`orbit.${ty}`)}</span>
                    <span className="type-small orbit-tile-desc">
                      {ty === 'SSO' ? t('orbit.sso_detail') : t('orbit.iss_detail')}
                    </span>
                  </div>
                  {design.orbit.type === ty && <span className="orbit-tile-check" aria-hidden="true"><CheckMark /></span>}
                </button>
              ))}
            </div>
          </section>

          {/* Sun Risk Strip with Live Forecast vs Truth & FCC 5y marker */}
          <section className="sun-risk-strip console-panel" aria-labelledby="risk-h">
            <div className="console-panel-header">
              <h3 id="risk-h" className="type-label section-label">
                {t('orbit.sun_risk_title')}
              </h3>
              <span className={`fcc-snap-badge type-label ${fccCompliant ? 'fcc-snap-badge--ok' : 'fcc-snap-badge--warn'}`}>
                {fccCompliant ? t('orbit.fcc_marker_pass') : t('orbit.fcc_marker_warn')}
              </span>
            </div>

            <div className="sun-risk-grid">
              <div className="sun-risk-tile">
                <span className="type-label risk-tile-label">{t('orbit.truth_life')}</span>
                <span className="type-data-l risk-tile-val">
                  <CountUpNumber target={truthDays} />
                  <span className="type-small sp-unit"> {t('unit.days')}</span>
                </span>
                <span className="type-small risk-tile-sub">
                  ({fmtNum(lang, truthDays / 365.25, 1)} {t('unit.years')})
                </span>
              </div>

              <div className="sun-risk-tile">
                <span className="type-label risk-tile-label">{t('orbit.forecast_life')}</span>
                <span className="type-data-l risk-tile-val">
                  <CountUpNumber target={planDays} />
                  <span className="type-small sp-unit"> {t('unit.days')}</span>
                </span>
                <span className="type-small risk-tile-sub">
                  ({fmtNum(lang, planDays / 365.25, 1)} {t('unit.years')})
                </span>
              </div>

              <div className="sun-risk-tile sun-risk-tile--delta">
                <span className="type-label risk-tile-label">{t('orbit.sun_impact')}</span>
                <span className="type-data-l risk-tile-val">
                  {p.sunTookDays >= 0 ? '-' : '+'}
                  <CountUpNumber target={sunDiff} />
                  <span className="type-small sp-unit"> {t('unit.days')}</span>
                </span>
                <span className="type-small risk-tile-sub">
                  {p.sunTookDays >= 0 ? t('ptn.sun_took') : t('ptn.sun_gave')}
                </span>
              </div>
            </div>
          </section>

          {/* Fit Check Summary Card */}
          <FitVerdicts />

          {/* Jeddah Scenario Alive Indicator */}
          <AliveIndicator result={result} />

          {/* Art Ornament Slot (P3 ground station) */}
          <Illustration id="p3" src="img/art/art-p3-ground-station-v1.webp" alt={t('map.station')} className="orbit-ground-art" />
        </div>
      </div>
    </ScreenFrame>
  );
}
