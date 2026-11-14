import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SimResult, MissionDesign } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum, fmtSigned, reducedMotion } from '../format';
import { partName, rocketName } from '../content';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { AltitudeChart } from '../ui/AltitudeChart';
import { Button, BoltMark, VerdictStamp } from '../ui/components';
import { MainVerdict } from './Report';
import { ReflyVariants } from '../ui/Jeddah';
import { Illustration } from '../ui/Illustration';
import { playLaunchTick } from '../sound';
import { ScreenFrame } from './ScreenFrame';

function RocketAndOrbitIllustration(): React.JSX.Element {
  return (
    <svg viewBox="0 0 200 120" width="160" height="96" className="empty-orbit-svg" aria-hidden="true">
      {/* Earth Arc */}
      <path d="M 20 110 A 140 140 0 0 1 180 110" fill="none" stroke="var(--color-rule)" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Orbit 1 */}
      <path d="M 35 90 A 110 80 0 0 1 165 90" fill="none" stroke="var(--color-lapis)" strokeWidth="2" />
      {/* Orbit 2 */}
      <path d="M 50 70 A 90 60 0 0 1 150 70" fill="none" stroke="var(--color-sol)" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* Satellite 1 */}
      <circle cx="100" cy="50" r="4" fill="var(--color-lapis)" />
      <line x1="94" y1="50" x2="106" y2="50" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* Satellite 2 */}
      <circle cx="130" cy="58" r="3" fill="var(--color-sol)" />
    </svg>
  );
}

function RunColumn({ label, r }: { label: string; r: SimResult }): React.JSX.Element {
  const { t, lang } = useI18n();
  const d = r.design;
  return (
    <section className="refly-col console-panel" aria-label={label}>
      <div className="console-panel-header">
        <h3 className="type-label section-label">{label}</h3>
      </div>
      <MainVerdict r={r} />
      <p className="type-data refly-design">
        {d.formFactor} · {t(`orbit.${d.orbit.type}`)} {fmtNum(lang, d.orbit.altitudeKm)} {t('unit.km')} · {fmtDate(lang, d.launchDate)}
      </p>
      <div className="req-row">
        {r.score.requirements.map((q) => (
          <VerdictStamp key={q.id} size="s" state={q.met ? 'ok' : 'fail'} title={t(`req.${q.id}`)} />
        ))}
      </div>
      <p className="type-small">
        {t('report.score', { met: r.score.requirementsMet, total: r.score.requirements.length, score: r.score.total })}
      </p>
    </section>
  );
}

interface DeltaRow {
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

export function Refly(): React.JSX.Element {
  const { t, lang } = useI18n();
  const baseline = useMission((s) => s.baseline);
  const flight = useMission((s) => s.flight);
  const keepBaseline = useMission((s) => s.keepBaseline);
  const clearBaseline = useMission((s) => s.clearBaseline);
  const setScreen = useNavigation((s) => s.setScreen);
  const loadDesign = useMission((s) => s.loadDesign);
  const launch = useMission((s) => s.launch);
  const [ceremony, setCeremony] = useState<'idle' | 'countdown'>('idle');
  const [count, setCount] = useState<number>(3);
  const finished = useRef(false);

  const same = baseline && flight && baseline.truth === flight.truth;

  const flyVariant = (d: MissionDesign) => {
    if (!baseline) keepBaseline();
    loadDesign(d);
    launch();
    setScreen('Flight');
  };

  const changeOne = () => {
    keepBaseline();
    setScreen('Build');
  };

  const finishLaunch = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    launch();
    setScreen('Flight');
  }, [launch, setScreen]);

  const startCeremony = () => {
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
    let timer: number;
    if (count > 1) {
      timer = window.setTimeout(() => {
        playLaunchTick();
        setCount((c) => c - 1);
      }, 240);
    } else {
      timer = window.setTimeout(() => {
        finishLaunch();
      }, 240);
    }
    return () => window.clearTimeout(timer);
  }, [ceremony, count, finishLaunch]);

  // Compute design deltas if baseline exists
  const deltas: DeltaRow[] = [];
  if (baseline && flight) {
    const b = baseline.truth.design;
    const f = flight.truth.design;

    deltas.push({
      label: t('build.frame'),
      before: b.formFactor,
      after: f.formFactor,
      changed: b.formFactor !== f.formFactor,
    });
    deltas.push({
      label: t('orbit.altitude'),
      before: `${fmtNum(lang, b.orbit.altitudeKm)} ${t('unit.km')}`,
      after: `${fmtNum(lang, f.orbit.altitudeKm)} ${t('unit.km')}`,
      changed: b.orbit.altitudeKm !== f.orbit.altitudeKm,
    });
    deltas.push({
      label: t('orbit.type'),
      before: t(`orbit.${b.orbit.type}`),
      after: t(`orbit.${f.orbit.type}`),
      changed: b.orbit.type !== f.orbit.type,
    });
    deltas.push({
      label: t('orbit.rocket'),
      before: rocketName(b.rocketId, lang, b.rocketId),
      after: rocketName(f.rocketId, lang, f.rocketId),
      changed: b.rocketId !== f.rocketId,
    });
    // Check parts
    Object.keys(b.parts).forEach((slot) => {
      const p1 = (b.parts as Record<string, string>)[slot];
      const p2 = (f.parts as Record<string, string>)[slot];
      if (p1 !== p2) {
        deltas.push({
          label: t(`slot.${slot}`),
          before: p1 ? partName(p1, lang, p1) : '—',
          after: p2 ? partName(p2, lang, p2) : '—',
          changed: true,
        });
      }
    });
  }

  // 3 Suggested Tweaks derived from engine closest-design hint and rules
  const tweaks = flight ? [
    {
      id: 'alt',
      label: t('refly.tweak_alt'),
      apply: () => {
        flyVariant({
          ...flight.design,
          orbit: { ...flight.design.orbit, altitudeKm: Math.min(800, flight.design.orbit.altitudeKm + 50) },
        });
      },
    },
    {
      id: 'battery',
      label: t('refly.tweak_battery'),
      apply: () => {
        flyVariant({
          ...flight.design,
          parts: { ...flight.design.parts, battery: 'battery-large' },
        });
      },
    },
    {
      id: 'closest',
      label: t('refly.tweak_closest', { name: flight.truth.closest.mission }),
      apply: () => {
        flyVariant({
          ...flight.design,
          formFactor: flight.truth.closest.formFactor,
          orbit: { ...flight.design.orbit, altitudeKm: flight.truth.closest.altitudeKm },
        });
      },
    },
  ] : [];

  if (!flight) {
    return (
      <ScreenFrame id="Refly">
        <div className="refly-empty-state console-panel">
          <Illustration id="art-p22-empty-orbit-v1" src="img/art/art-p22-empty-orbit-v1.webp" alt="Empty orbit" className="refly-empty-art" />
          <div className="refly-empty-fallback">
            <RocketAndOrbitIllustration />
          </div>
          <h3 className="type-heading">{t('refly.need_flight')}</h3>
          <p className="type-body refly-empty-desc">{t('refly.empty_instruction')}</p>
          <Button onClick={() => setScreen('Launch')}>{t('screens.launch')}</Button>
        </div>
      </ScreenFrame>
    );
  }

  const baseLife = baseline ? baseline.truth.lifetimeDays : 0;
  const newLife = flight.truth.lifetimeDays;
  const maxLife = Math.max(1, baseLife, newLife);
  const lifeDelta = baseline ? newLife - baseLife : 0;
  const scoreDelta = baseline ? flight.truth.score.total - baseline.truth.score.total : 0;

  return (
    <ScreenFrame id="Refly">
      <div className="refly-header-strip console-panel">
        <Illustration id="art-p20-refly-diptych-v1" src="img/art/art-p20-refly-diptych-v1.webp" alt="Refly diptych" className="refly-diptych-art" />
        <div className="refly-header-meta">
          <span className="type-label">{t('refly.seed', { seed: flight.design.seed })}</span>
          <p className="type-small">{t('refly.explain')}</p>
        </div>
      </div>

      {baseline && !same ? (
        <div className="refly-tri-layout">
          {/* Left Column: What Changed Delta Table */}
          <section className="refly-deltas-col console-panel" aria-labelledby="deltas-h">
            <div className="console-panel-header">
              <h3 id="deltas-h" className="type-label section-label">
                {t('refly.what_changed')}
              </h3>
            </div>
            <table className="refly-deltas-table type-small">
              <thead>
                <tr>
                  <th scope="col">{t('refly.param')}</th>
                  <th scope="col">{t('refly.first')}</th>
                  <th scope="col">{t('refly.second')}</th>
                </tr>
              </thead>
              <tbody>
                {deltas.map((d, i) => (
                  <tr key={d.label} className={`delta-row ${d.changed ? 'delta-row--changed' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                    <td className="type-label">{d.label}</td>
                    <td className="type-data">{d.before}</td>
                    <td className="type-data delta-new-val">{d.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Centre Column: Big Dual-Run Comparison */}
          <section className="refly-comparison-col console-panel" aria-labelledby="comp-h">
            <div className="console-panel-header">
              <h3 id="comp-h" className="type-label section-label">
                {t('refly.lifetime_comparison')}
              </h3>
              <div className="refly-deltas-chips">
                <span className={`delta-chip ${lifeDelta >= 0 ? 'delta-chip--up' : 'delta-chip--down'}`}>
                  <span className="delta-arrow" aria-hidden="true">{lifeDelta >= 0 ? '↑' : '↓'}</span>
                  <span className="type-data">{fmtSigned(lang, lifeDelta)} {t('unit.days')}</span>
                </span>
                <span className={`delta-chip ${scoreDelta >= 0 ? 'delta-chip--up' : 'delta-chip--down'}`}>
                  <span className="delta-arrow" aria-hidden="true">{scoreDelta >= 0 ? '↑' : '↓'}</span>
                  <span className="type-data">{fmtSigned(lang, scoreDelta)} pts</span>
                </span>
              </div>
            </div>

            {/* Racing Lifetime Bars */}
            <div className="refly-racing-bars">
              <div className="racing-bar-item">
                <div className="racing-bar-labels type-small">
                  <span>{t('refly.first')}</span>
                  <span className="type-data">{fmtNum(lang, Math.round(baseLife))} {t('unit.days')}</span>
                </div>
                <div className="racing-bar-track" aria-hidden="true">
                  <div className="racing-bar-fill racing-bar-fill--base" style={{ inlineSize: `${(baseLife / maxLife) * 100}%` }} />
                </div>
              </div>

              <div className="racing-bar-item">
                <div className="racing-bar-labels type-small">
                  <span>{t('refly.second')}</span>
                  <span className="type-data">{fmtNum(lang, Math.round(newLife))} {t('unit.days')}</span>
                </div>
                <div className="racing-bar-track" aria-hidden="true">
                  <div className="racing-bar-fill racing-bar-fill--new" style={{ inlineSize: `${(newLife / maxLife) * 100}%` }} />
                </div>
              </div>
            </div>

            <AltitudeChart
              title={t('refly.chart')}
              lines={[
                { timeline: flight.truth.timeline, kind: 'truth', label: t('refly.second') },
                { timeline: baseline.truth.timeline, kind: 'alt', label: t('refly.first') },
              ]}
            />
          </section>

          {/* Right Column: 3 One-Click Tweaks */}
          <section className="refly-tweaks-col console-panel" aria-labelledby="tweaks-h">
            <div className="console-panel-header">
              <h3 id="tweaks-h" className="type-label section-label">
                {t('refly.try_next')}
              </h3>
            </div>
            <div className="refly-tweaks-list">
              {tweaks.map((tw) => (
                <button
                  key={tw.id}
                  type="button"
                  className="refly-tweak-btn console-tile"
                  onClick={tw.apply}
                >
                  <span className="tweak-icon" aria-hidden="true"><BoltMark /></span>
                  <span className="type-small tweak-label">{tw.label}</span>
                </button>
              ))}
            </div>

            {flight.truth.eventReplay && <ReflyVariants onFly={flyVariant} />}
          </section>
        </div>
      ) : (
        <div className="refly-single-layout console-panel">
          <RunColumn label={t('refly.first')} r={flight.truth} />
          {/* Final pass: the one-click tweaks are most useful right after the first flight (they keep it as the baseline). */}
          <section className="refly-first-tweaks" aria-labelledby="tweaks-first-h">
            <h3 id="tweaks-first-h" className="type-label section-label">{t('refly.try_next')}</h3>
            <div className="refly-tweaks-list">
              {tweaks.map((tw) => (
                <button key={tw.id} type="button" className="refly-tweak-btn console-tile" onClick={tw.apply}>
                  <span className="tweak-icon" aria-hidden="true"><BoltMark /></span>
                  <span className="type-small tweak-label">{tw.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Fly Again Ceremony Button */}
      <div className="refly-actions console-panel">
        {ceremony === 'idle' ? (
          <Button className="refly-fly-again-btn" onClick={startCeremony}>
            <span className="type-display-l">{t('refly.fly_again')}</span>
          </Button>
        ) : (
          <div className="refly-ceremony" role="status" aria-live="assertive">
            <p className="launch-countdown-num type-data-l">{count}</p>
          </div>
        )}

        <div className="btn-row">
          <Button variant="secondary" onClick={changeOne}>{t('refly.change_one')}</Button>
          {baseline && (
            <Button variant="quiet" onClick={clearBaseline}>
              {t('refly.clear')}
            </Button>
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}
