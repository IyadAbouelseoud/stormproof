import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StormPolicy, TimelineDay } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum, reducedMotion } from '../format';
import { useMission, ROLES, majority } from '../store';
import { useNavigation } from '../navigation';
import { CONSTANTS, trackFromResult, partById, sunMonths } from '../engineAdapter';
import { AltitudeChart } from '../ui/AltitudeChart';
import { GroundMap } from '../ui/GroundMap';
import { Button, CheckMark, RoleChip } from '../ui/components';
import { SunStripe } from '../ui/SunStripe';
import { Illustration } from '../ui/Illustration';
import { EmptyState } from '../ui/EmptyState';
import { MissionLog } from '../ui/MissionLog';
import { playReentryLowTone } from '../sound';
import { ScreenFrame } from './ScreenFrame';
import { Term } from '../ui/Cadet';

/** Cadet air-thickness bar: log10 density mapped from 1e-14 (empty) to 1e-10 kg/m3 (full). Display only. */
const airFill = (rho: number): number => (rho > 0 ? Math.max(0, Math.min(1, (Math.log10(rho) + 14) / 4)) : 0);

const EMPTY_TL: TimelineDay[] = [];

/** Days advanced per second at each speed (display pacing only, not data). */
const SPEEDS = [
  { id: '1x', dps: 10 },
  { id: '4x', dps: 40 },
  { id: '16x', dps: 160 },
] as const;

function Odometer({ num }: { num: number }): React.JSX.Element {
  const digits = String(num).split('');
  return (
    <span className="odometer" aria-hidden="true">
      {digits.map((d, i) => (
        <span key={i} className="odometer-digit-box">
          <span
            className="odometer-digit-strip"
            style={{ transform: `translateY(-${Number(d) * 10}%)` }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n} className="odometer-digit">
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

function StormCard({ kp, date, onDone }: { kp: number; date: string; onDone: () => void }): React.JSX.Element {
  const { t, lang } = useI18n();
  const voted = useMission((s) => s.stormVoted);
  const policy = useMission((s) => s.flight?.design.stormPolicy ?? 'ride-out');
  const team = useMission((s) => s.teamMode);
  const names = useMission((s) => s.names);
  const votes = useMission((s) => s.votes);
  const setPolicy = useMission((s) => s.setStormPolicy);
  const castVote = useMission((s) => s.castVote);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const choose = (p: StormPolicy) => {
    setPolicy(p);
    onDone();
  };
  const policies: StormPolicy[] = ['ride-out', 'safe-mode'];

  return (
    <div className="storm-card" role="alertdialog" aria-labelledby="storm-h" aria-describedby="storm-d" tabIndex={-1} ref={ref}>
      <div className="storm-card-header">
        <div className="storm-countdown-wrap" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="32" height="32" className="storm-countdown-ring">
            <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-rule)" strokeWidth="2" />
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke="var(--color-sol)"
              strokeWidth="2"
              strokeDasharray="81.68"
              className="storm-countdown-arc"
            />
          </svg>
        </div>
        <h3 id="storm-h" className="type-heading storm-title">
          {t('storm.title', { kp: fmtNum(lang, kp) })}
        </h3>
      </div>
      <p id="storm-d" className="type-small">
        {t('storm.body', { date: fmtDate(lang, date) })}
      </p>
      {voted ? (
        <>
          <p className="type-body">{t('storm.standing', { policy: t(`policy.${policy}`) })}</p>
          <Button onClick={onDone}>{t('storm.continue')}</Button>
        </>
      ) : team ? (
        <div className="storm-votes">
          {ROLES.map((r) => (
            <div key={r} className="storm-vote-row">
              <RoleChip role={r} name={names[r]} />
              <div className="btn-row" role="group" aria-label={t('storm.vote_for', { role: t(`role.${r}`) })}>
                {policies.map((p) => (
                  <Button key={p} variant="secondary" pressed={votes[r] === p} onClick={() => castVote(r, p)}>
                    {t(`policy.${p}`)}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <p className="type-small">
            {t('storm.tally', { n: ROLES.filter((r) => votes[r]).length, majority: t(`policy.${majority(votes)}`) })}
          </p>
        </div>
      ) : (
        <div className="storm-choices">
          {policies.map((p) => (
            <div key={p} className="storm-choice">
              <Button onClick={() => choose(p)}>{t(`policy.${p}`)}</Button>
              <p className="type-small">{t(`policy.${p}.then`)}</p>
            </div>
          ))}
        </div>
      )}
      <p className="type-small storm-explain">{t('storm.once')}</p>
    </div>
  );
}

export function Flight(): React.JSX.Element {
  const { t, lang, cadet } = useI18n();
  const flight = useMission((s) => s.flight);
  const launch = useMission((s) => s.launch);
  const setScreen = useNavigation((s) => s.setScreen);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [alert, setAlert] = useState<number | null>(null);
  const [verdictVisible, setVerdictVisible] = useState(false);
  const seen = useRef(new Set<number>());
  const [slipSeen, setSlipSeen] = useState(false);
  const stormVoted = useMission((s) => s.stormVoted);

  useEffect(() => {
    if (!flight) launch();
  }, [flight, launch]);

  const tl = flight?.truth.timeline ?? EMPTY_TL;
  const n = tl.length;
  const ended = cursor >= n - 1;
  const outcome = flight?.truth.outcome;

  useEffect(() => {
    if (!ended) {
      setVerdictVisible(false);
      return;
    }
    if (outcome?.kind === 'reentered') {
      playReentryLowTone();
    }
    if (reducedMotion() || outcome?.kind !== 'reentered') {
      setVerdictVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVerdictVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, [ended, outcome?.kind]);

  const alerts = useMemo(
    () => tl.map((d, i) => (d.stormKp !== null && d.stormKp >= CONSTANTS.stormAlertKp ? i : -1)).filter((i) => i >= 0),
    [tl],
  );

  // Per-flight precomputation for battery and data
  const stats = useMemo(() => {
    const delivered = new Float64Array(tl.length);
    const lost = new Float64Array(tl.length);
    let d = 0;
    let l = 0;
    tl.forEach((x, i) => {
      d += x.dataDownlinkedMB;
      l += x.dataLostMB;
      delivered[i] = d;
      lost[i] = l;
    });
    const bins = Math.min(240, tl.length);
    const binMin: number[] = [];
    for (let b = 0; b < bins; b++) {
      let m = 100;
      const a = Math.floor((b * tl.length) / bins);
      const z = Math.max(a + 1, Math.floor(((b + 1) * tl.length) / bins));
      for (let i = a; i < z; i++) m = Math.min(m, tl[i]!.batteryPct);
      binMin.push(m);
    }
    return { delivered, lost, bins, binMin };
  }, [tl]);

  // Space bar toggles play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'BUTTON' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        if (ended) restart();
        else setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ended]);

  // Play loop
  const pos = useRef(0);
  const stormVotedRef = useRef(stormVoted);
  stormVotedRef.current = stormVoted;
  useEffect(() => {
    if (!playing || n === 0) return;
    let raf = 0;
    let last = performance.now();
    pos.current = cursor;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(n - 1, pos.current + dt * SPEEDS[speed]!.dps);
      const hit = stormVotedRef.current ? undefined : alerts.find((i) => i > pos.current && i <= next && !seen.current.has(i));
      if (hit !== undefined) {
        seen.current.add(hit);
        pos.current = hit;
        setCursor(hit);
        setPlaying(false);
        setAlert(hit);
        return;
      }
      pos.current = next;
      setCursor(Math.floor(next));
      if (next >= n - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, n, alerts]);

  if (!flight || n === 0) {
    return (
      <ScreenFrame id="Flight">
        <EmptyState icon="flight" text={t('flight.empty')} />
      </ScreenFrame>
    );
  }

  const safeIdx = Math.max(0, Math.min(Math.floor(cursor), n - 1));
  const day = tl[safeIdx] ?? tl[0];
  if (!day) {
    return (
      <ScreenFrame id="Flight">
        <EmptyState icon="flight" text={t('flight.empty')} />
      </ScreenFrame>
    );
  }

  const flightOutcome = flight.truth.outcome;
  const storage = (partById(flight.design.parts.computer) as unknown as { storageMB?: number } | undefined)?.storageMB;
  const ci = Math.min(cursor, n - 1);
  const delivered = stats.delivered[ci] ?? 0;
  const lost = stats.lost[ci] ?? 0;
  const track = trackFromResult(flight.truth, flight.design, 3, cursor * 15);
  const { bins, binMin } = stats;
  const curBin = Math.floor((cursor / n) * bins);
  const months = sunMonths();
  const mIdx = months ? Math.max(0, months.findIndex((m) => m.month === day.date.slice(0, 7))) : 0;
  const isStorm = day.stormKp !== null && day.stormKp >= CONSTANTS.stormAlertKp;

  const restart = () => {
    seen.current.clear();
    setCursor(0);
    setAlert(null);
    setVerdictVisible(false);
    setPlaying(true);
  };

  const densityStr = day.densityKgM3 ? day.densityKgM3.toExponential(2) : '—';
  const prevDay = tl[Math.max(0, safeIdx - 1)] ?? day;
  const fallingM = Math.max(0, (prevDay.altitudeKm - day.altitudeKm) * 1000);
  const slip = flight.truth.causes.find((c) => c.id === 'launch-slip');
  const reqData = flight.truth.score.requirements.find((q) => q.id === 'data-delivered');
  const reqLife = flight.truth.score.requirements.find((q) => q.id === 'lifetime');

  return (
    <ScreenFrame id="Flight">
      <Illustration id="p9" src="img/art/art-p9-flight-header-v1.webp" alt={t('flight.map')} className="flight-header-art" />

      {/* Flight Control Toolbar & Comprehensive Telemetry Instrument HUD */}
      <div className="flight-instrument-toolbar console-panel">
        <div className="flight-playback-controls flight-controls">
          <Button
            onClick={() => (ended ? restart() : setPlaying((p) => !p))}
            disabled={alert !== null}
            aria-label={playing ? t('flight.pause') : t('flight.play')}
          >
            {ended ? t('flight.replay') : playing ? t('flight.pause') : t('flight.play')}
          </Button>

          <div className="btn-row" role="group" aria-label={t('flight.speed')}>
            {SPEEDS.map((s, i) => (
              <Button key={s.id} variant="secondary" pressed={speed === i} onClick={() => setSpeed(i)}>
                <span className="type-data">{s.id}</span>
              </Button>
            ))}
          </div>

          <Button
            variant="quiet"
            onClick={() => {
              setCursor(n - 1);
              setPlaying(false);
              setVerdictVisible(true);
            }}
            disabled={alert !== null || ended}
          >
            {t('flight.skip')}
          </Button>
        </div>

        {/* Live Instrument HUD Readout */}
        <div className="flight-hud-readout type-data" aria-live="off">
          <div className="hud-metric">
            <span className="type-label hud-label">{t('launch.date')}</span>
            <span className="hud-val">{fmtDate(lang, day.date)}</span>
          </div>

          <div className="hud-metric hud-metric--day">
            <span className="type-label hud-label">{t('flight.day')}</span>
            <span className="hud-val"><Odometer num={cursor} /></span>
          </div>

          <div className="hud-metric">
            <span className="type-label hud-label">{t('orbit.altitude')}</span>
            <span className="hud-val">{fmtNum(lang, day.altitudeKm, 1)} {t('unit.km')}</span>
          </div>

          <div className="hud-metric">
            <span className="type-label hud-label">{t('flight.density')} <Term id="density" /></span>
            {cadet ? (
              <span className="hud-val hud-air" title={t('flight.density_tip', { v: densityStr })}>
                <span className="hud-air-bar" aria-hidden="true">
                  <span className="hud-air-fill" style={{ '--fill': airFill(day.densityKgM3) } as React.CSSProperties} />
                </span>
                <span className="pd-sr">{t('flight.density_tip', { v: densityStr })}</span>
              </span>
            ) : (
              <span className="hud-val">{densityStr} <span className="sp-unit">kg/m³</span></span>
            )}
          </div>

          <div className={`hud-metric ${isStorm ? 'hud-metric--storm' : ''}`}>
            <span className="type-label hud-label">{t('flight.storm_alert')} <Term id="kp" /></span>
            <span className="hud-val">
              {day.stormKp !== null ? t('flight.kp', { kp: fmtNum(lang, day.stormKp) }) : t('flight.nominal')}
            </span>
          </div>

          <div className="hud-metric">
            <span className="type-label hud-label">{t('flight.falling')}</span>
            <span className="hud-val" data-testid="hud-falling">{t('flight.falling_val', { m: fmtNum(lang, fallingM, fallingM < 10 ? 1 : 0) })}</span>
          </div>

          {day.forecast && <span className="flight-forecast type-label">{t('sun.forecast')}</span>}
        </div>
        <ul className="hud-goals">
          {reqData && (
            <li className={`hud-goal ${delivered / 1000 >= reqData.target ? 'hud-goal--ok' : ''}`}>
              <span className="type-small">{t('req.data-delivered')}</span>
              <span className="type-data">{fmtNum(lang, delivered / 1000, 0)} / {fmtNum(lang, reqData.target)} {t('unit.GB')}</span>
              <span aria-hidden="true">{delivered / 1000 >= reqData.target ? <CheckMark /> : null}</span>
            </li>
          )}
          {reqLife && (
            <li className={`hud-goal ${safeIdx >= reqLife.target ? 'hud-goal--ok' : ''}`}>
              <span className="type-small">{t('req.lifetime')}</span>
              <span className="type-data">{fmtNum(lang, safeIdx)} / {fmtNum(lang, reqLife.target)} {t('unit.days')}</span>
              <span aria-hidden="true">{safeIdx >= reqLife.target ? <CheckMark /> : null}</span>
            </li>
          )}
        </ul>
      </div>

      {slip && !slipSeen && (
        <section className="slip-card console-panel" role="status" data-testid="slip-card">
          <h3 className="type-heading">{t('slip.title', { months: fmtNum(lang, Number(slip.label.params.months ?? slip.effect.value)) })}</h3>
          <p className="type-body">
            {t('slip.body', { planned: fmtDate(lang, flight.design.launchDate), actual: fmtDate(lang, tl[0]!.date) })}{' '}
            {t(Number(slip.label.params.days ?? 0) >= 0 ? 'slip.gained' : 'slip.lost', { days: fmtNum(lang, Math.abs(Number(slip.label.params.days ?? 0))) })}
          </p>
          <Button variant="secondary" onClick={() => setSlipSeen(true)}>{t('slip.ok')}</Button>
        </section>
      )}

      {alert !== null && tl[alert] && (
        <div className="storm-overlay">
          <StormCard kp={tl[alert]!.stormKp ?? 0} date={tl[alert]!.date} onDone={() => { setAlert(null); setPlaying(true); }} />
        </div>
      )}

      {/* Row 1: Top Linked Instruments (Altitude Chart & Sun Stripe) */}
      <div className="flight-charts-row console-panel">
        <section className="flight-chart" aria-labelledby="alt-chart-h">
          <div className="console-panel-header">
            <h3 id="alt-chart-h" className="type-label section-label">
              {t('flight.altitude')}
            </h3>
            <span className="type-small type-data">
              {t('flight.scrub_hint')}
            </span>
          </div>
          <AltitudeChart
            title={t('flight.altitude')}
            lines={[
              { timeline: tl, kind: 'truth', label: t('chart.truth') },
              { timeline: flight.plan.timeline, kind: 'plan', label: t('chart.plan') },
            ]}
            gapFill
            reveal={!ended}
            cursor={cursor}
            burn={ended && flightOutcome.kind === 'reentered' && !reducedMotion()}
            event={flight.truth.eventReplay ? { date: flight.truth.eventReplay.date, label: t('jeddah.chart.event'), looks: flight.truth.eventReplay.looks } : undefined}
            onScrub={(i) => setCursor(i)}
          />
        </section>

        {months && (
          <section className="flight-sun" aria-label={t('launch.date')}>
            <SunStripe
              months={months}
              value={mIdx}
              label={t('launch.date')}
              pulseStorm={isStorm}
              onChange={(i) => {
                const m = months[i];
                if (m) {
                  const targetIdx = tl.findIndex((d) => d.date.startsWith(m.month));
                  if (targetIdx >= 0) setCursor(targetIdx);
                }
              }}
            />
          </section>
        )}
      </div>

      {/* Row 2: Ground Map and Mission Log Row (Side by Side) */}
      <div className="flight-map-log-row">
        {/* Left: Mission Log Panel */}
        <MissionLog
          result={flight.truth}
          currentDayIndex={safeIdx}
          ended={ended}
          onSelectDay={(idx) => setCursor(idx)}
        />

        {/* Right: Ground Map & Telemetry Instruments */}
        <div className="flight-map-telemetry-col">
          <section className="flight-map console-panel" aria-labelledby="map-h">
            <div className="console-panel-header">
              <h3 id="map-h" className="type-label section-label">
                {t('flight.map')}
              </h3>
            </div>
            <GroundMap track={track} title={t('flight.map')} cursor={cursor} />
            <p className="type-small map-note">{t('map.note')}</p>
          </section>

          {/* Telemetry gauges: Battery & Storage */}
          <div className="flight-telemetry-subgrid">
            <section className="flight-battery console-panel" aria-labelledby="bat-h">
              <h3 id="bat-h" className="type-label section-label">
                {t('flight.battery')}
              </h3>
              <svg viewBox={`0 0 ${bins} 40`} preserveAspectRatio="none" className="battery-strip" role="img" aria-label={t('flight.battery_aria', { pct: fmtNum(lang, day.batteryPct) })}>
                {binMin.map((m, b) => (
                  <rect
                    key={b}
                    x={b}
                    width={1.02}
                    y={40 - (m / 100) * 40}
                    height={(m / 100) * 40}
                    className={`battery-bar ${b <= curBin ? 'battery-bar--past' : ''} ${m < CONSTANTS.batteryFloorPct ? 'battery-bar--low' : ''}`}
                  />
                ))}
              </svg>
              <p className="type-data">
                {fmtNum(lang, day.batteryPct)}% <span className="type-small">{t('flight.battery_now')}</span>
              </p>
            </section>

            <section className="flight-data console-panel" aria-labelledby="data-h">
              <h3 id="data-h" className="type-label section-label">
                {t('flight.data')}
              </h3>
              <div className="bucket" aria-hidden="true">
                <div className="bucket-fill" style={{ '--fill': storage ? Math.min(1, day.dataStoredMB / storage) : 0 } as React.CSSProperties} />
              </div>
              <dl className="data-stats type-small">
                <div>
                  <dt>{t('flight.stored')}</dt>
                  <dd className="type-data">
                    {fmtNum(lang, day.dataStoredMB, 0)}
                    {storage ? ` / ${fmtNum(lang, storage, 0)}` : ''} {t('unit.MB')}
                  </dd>
                </div>
                <div>
                  <dt>{t('flight.delivered')}</dt>
                  <dd className="type-data">
                    {fmtNum(lang, delivered / 1000, 1)} {t('unit.GB')}
                  </dd>
                </div>
                <div>
                  <dt>{t('flight.lost')}</dt>
                  <dd className="type-data">
                    {fmtNum(lang, lost / 1000, 1)} {t('unit.GB')}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>

      {/* Outcome Verdict Section */}
      {ended && verdictVisible && (
        <section className="reentry console-panel" aria-live="polite">
          {flightOutcome.kind === 'reentered' ? (
            <>
              <p className="type-label">{t('flight.reentered_on', { date: fmtDate(lang, flightOutcome.date) })}</p>
              <p className="type-display-xl reentry-days">
                {fmtNum(lang, flight.truth.lifetimeDays)} <span className="type-data sp-unit">{t('unit.days')}</span>
              </p>
            </>
          ) : flightOutcome.kind === 'alive' ? (
            <p className="type-body">{t('flight.alive', { asOf: fmtDate(lang, flightOutcome.asOf), date: fmtDate(lang, flightOutcome.predictedReentry) })}</p>
          ) : (
            <p className="type-body">{t('flight.alive_end', { asOf: fmtDate(lang, flightOutcome.asOf), years: fmtNum(lang, flightOutcome.minYears) })}</p>
          )}
          <Button onClick={() => setScreen('Report')}>{t('flight.to_report')}</Button>
        </section>
      )}
    </ScreenFrame>
  );
}
