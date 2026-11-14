import React, { useEffect, useState } from 'react';
import type { OrbitType } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';
import { useMission } from '../store';
import { ALT_MAX_KM, ALT_MIN_KM, altitudeBands, rockets, useEngineStatus, type AltitudeBands } from '../engineAdapter';
import { Button, SrcTag, VerdictStamp } from '../ui/components';
import { ScreenFrame } from './ScreenFrame';

export function FitVerdicts(): React.JSX.Element {
  const { t, tMsg } = useI18n();
  const result = useMission((s) => s.result);
  const fails = result.fit.filter((f) => !f.pass);
  const warns = Object.values(result.gauges).filter((g) => g.state === 'warn');
  const state = fails.length ? 'fail' : warns.length ? 'warn' : 'ok';
  return (
    <section className="fit" aria-labelledby="fit-h">
      <h3 id="fit-h" className="type-label section-label">
        {t('fit.title')}
      </h3>
      <VerdictStamp
        state={state}
        size="s"
        title={t(`fit.verdict.${state}`)}
        detail={t('fit.count', { fail: fails.length, total: result.fit.length })}
      />
      <ul className="fit-list">
        {[...fails, ...result.fit.filter((f) => f.pass)].map((f) => (
          <li key={f.check} className={`fit-item fit-item--${f.pass ? 'ok' : 'fail'}`}>
            <span className="type-label fit-mark">{f.pass ? t('fit.pass') : t('fit.fail')}</span>
            <span className="type-label fit-check">{t(`check.${f.check}`)}</span>
            <span className="type-small">{tMsg(f.reason)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Orbit(): React.JSX.Element {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const setAltitude = useMission((s) => s.setAltitude);
  const setOrbitType = useMission((s) => s.setOrbitType);
  const setRocket = useMission((s) => s.setRocket);
  const status = useEngineStatus((s) => s.status);
  const [bands, setBands] = useState<AltitudeBands | null>(null);
  const [alt, setAlt] = useState(design.orbit.altitudeKm);
  useEffect(() => setAlt(design.orbit.altitudeKm), [design.orbit.altitudeKm]);

  // the band depends on everything except altitude; computed after first paint (about 12 engine runs)
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
  const commit = () => setAltitude(alt);

  return (
    <ScreenFrame id="Orbit">
      <section aria-labelledby="alt-h" className="orbit-alt">
        <h3 id="alt-h" className="type-label section-label">
          {t('orbit.altitude')}
        </h3>
        <p className="type-data-l orbit-alt-value">
          {fmtNum(lang, alt)} <span className="type-data sp-unit">{t('unit.km')}</span>
        </p>
        <div className="alt-slider" dir="ltr">
          <div className="alt-band" aria-hidden="true">
            {bands?.dragBelowKm != null && <div className="alt-band-drag" style={{ insetInlineStart: 0, inlineSize: pct(bands.dragBelowKm) }} />}
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
            onChange={(e) => setAlt(Number(e.target.value))}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
          />
          <div className="alt-scale type-data" aria-hidden="true">
            <span>{ALT_MIN_KM}</span>
            <span>{ALT_MAX_KM}</span>
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
          <li className="alt-legend-basis">{bands?.basis === 'placeholder' ? t('orbit.band_placeholder') : t('orbit.band_basis')}</li>
        </ul>
      </section>

      <section aria-labelledby="otype-h">
        <h3 id="otype-h" className="type-label section-label">
          {t('orbit.type')}
        </h3>
        <div className="btn-row" role="group" aria-labelledby="otype-h">
          {types.map((ty) => (
            <Button key={ty} variant="secondary" pressed={design.orbit.type === ty} onClick={() => setOrbitType(ty)}>
              {t(`orbit.${ty}`)}
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="rocket-h">
        <h3 id="rocket-h" className="type-label section-label">
          {t('orbit.rocket')}
        </h3>
        <div className="part-grid">
          {rockets().map((r) => (
            <button
              key={r.id}
              type="button"
              className={`sp-part ${design.rocketId === r.id ? 'sp-part--selected' : ''}`}
              aria-pressed={design.rocketId === r.id}
              onClick={() => setRocket(r.id)}
            >
              <span className="sp-part-head">
                <span className="type-body sp-part-name">{r.name}</span>
                <SrcTag src={r.src} />
              </span>
              <span className="sp-part-stats">
                <span className="sp-part-row">
                  <span className="type-small sp-part-label">{t('rocket.capacity')}</span>
                  <span className="type-data">
                    {fmtNum(lang, r.capacityKg)} <span className="sp-unit">{t('unit.kg')}</span>
                  </span>
                </span>
                <span className="sp-part-row">
                  <span className="type-small sp-part-label">{t('rocket.range')}</span>
                  <span className="type-data">
                    {r.minAltKm}-{r.maxAltKm} <span className="sp-unit">{t('unit.km')}</span>
                  </span>
                </span>
                <span className="sp-part-row">
                  <span className="type-small sp-part-label">{t('rocket.orbits')}</span>
                  <span className="type-data">{r.orbits.map((o) => t(`orbit.${o}`)).join(' / ')}</span>
                </span>
                <span className="sp-part-row">
                  <span className="type-small sp-part-label">{t('rocket.price')}</span>
                  <span className="type-data">
                    {fmtNum(lang, r.priceUsdPerKg)} <span className="sp-unit">{t('unit.USD/kg')}</span>
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <FitVerdicts />
    </ScreenFrame>
  );
}
