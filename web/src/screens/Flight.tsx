import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StormPolicy, TimelineDay } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum, reducedMotion } from '../format';
import { useMission, ROLES, majority } from '../store';
import { useNavigation } from '../navigation';
import { CONSTANTS, groundTrack, partById } from '../engineAdapter';
import { AltitudeChart } from '../ui/AltitudeChart';
import { GroundMap } from '../ui/GroundMap';
import { Button, RoleChip } from '../ui/components';
import { ScreenFrame } from './ScreenFrame';

const EMPTY_TL: TimelineDay[] = [];

/** Days advanced per second at each speed (display pacing only, not data). */
const SPEEDS = [
  { id: '1x', dps: 10 },
  { id: '10x', dps: 100 },
  { id: '100x', dps: 1000 },
] as const;

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
      <h3 id="storm-h" className="type-heading storm-title">
        {t('storm.title', { kp: fmtNum(lang, kp) })}
      </h3>
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
        <div className="btn-row">
          {policies.map((p) => (
            <Button key={p} onClick={() => choose(p)}>
              {t(`policy.${p}`)}
            </Button>
          ))}
        </div>
      )}
      <p className="type-small storm-explain">{t('storm.explain')}</p>
    </div>
  );
}

export function Flight(): React.JSX.Element {
  const { t, lang } = useI18n();
  const flight = useMission((s) => s.flight);
  const launch = useMission((s) => s.launch);
  const setScreen = useNavigation((s) => s.setScreen);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [alert, setAlert] = useState<number | null>(null);
  const seen = useRef(new Set<number>());

  useEffect(() => {
    if (!flight) launch();
  }, [flight, launch]);

  const tl = flight?.truth.timeline ?? EMPTY_TL;
  const n = tl.length;
  const alerts = useMemo(
    () => tl.map((d, i) => (d.stormKp !== null && d.stormKp >= CONSTANTS.stormAlertKp ? i : -1)).filter((i) => i >= 0),
    [tl],
  );

  // per-flight precomputation, so each animation frame is O(1) apart from the chart
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

  // play loop
  const pos = useRef(0);
  useEffect(() => {
    if (!playing || n === 0) return;
    let raf = 0;
    let last = performance.now();
    pos.current = cursor;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = Math.min(n - 1, pos.current + dt * SPEEDS[speed]!.dps);
      const hit = alerts.find((i) => i > pos.current && i <= next && !seen.current.has(i));
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

  if (!flight || n === 0) return <ScreenFrame id="Flight">{t('engine.loading')}</ScreenFrame>;

  const day = tl[Math.min(cursor, n - 1)]!;
  const ended = cursor >= n - 1;
  const outcome = flight.truth.outcome;
  const storage = (partById(flight.design.parts.computer) as unknown as { storageMB?: number } | undefined)?.storageMB;
  const ci = Math.min(cursor, n - 1);
  const delivered = stats.delivered[ci] ?? 0;
  const lost = stats.lost[ci] ?? 0;
  const track = groundTrack(flight.design, 3, cursor * 15);
  const { bins, binMin } = stats;
  const curBin = Math.floor((cursor / n) * bins);

  const restart = () => {
    seen.current.clear();
    setCursor(0);
    setAlert(null);
    setPlaying(true);
  };

  return (
    <ScreenFrame id="Flight">
      <div className="flight-controls">
        <Button onClick={() => (ended ? restart() : setPlaying((p) => !p))} disabled={alert !== null} aria-label={playing ? t('flight.pause') : t('flight.play')}>
          {ended ? t('flight.replay') : playing ? t('flight.pause') : t('flight.play')}
        </Button>
        <div className="btn-row" role="group" aria-label={t('flight.speed')}>
          {SPEEDS.map((s, i) => (
            <Button key={s.id} variant="secondary" pressed={speed === i} onClick={() => setSpeed(i)}>
              <span className="type-data">{s.id}</span>
            </Button>
          ))}
        </div>
        <Button variant="quiet" onClick={() => { setCursor(n - 1); setPlaying(false); }} disabled={alert !== null || ended}>
          {t('flight.skip')}
        </Button>
        <p className="flight-clock type-data" aria-live="off">
          <span>{fmtDate(lang, day.date)}</span>
          <span>
            {t('flight.day')} {fmtNum(lang, cursor)}
          </span>
          <span>
            {fmtNum(lang, day.altitudeKm)} {t('unit.km')}
          </span>
          {day.forecast && <span className="flight-forecast type-label">{t('sun.forecast')}</span>}
        </p>
      </div>

      {alert !== null && tl[alert] && <StormCard kp={tl[alert]!.stormKp ?? 0} date={tl[alert]!.date} onDone={() => { setAlert(null); setPlaying(true); }} />}

      <div className="flight-grid">
        <section className="flight-chart" aria-labelledby="alt-chart-h">
          <h3 id="alt-chart-h" className="type-label section-label">
            {t('flight.altitude')}
          </h3>
          <AltitudeChart
            title={t('flight.altitude')}
            lines={[
              { timeline: tl, kind: 'truth', label: t('chart.truth') },
              { timeline: flight.plan.timeline, kind: 'plan', label: t('chart.plan') },
            ]}
            gapFill
            reveal={!ended}
            cursor={cursor}
            burn={ended && outcome.kind === 'reentered' && !reducedMotion()}
            event={flight.truth.eventReplay ? { date: flight.truth.eventReplay.date, label: t('jeddah.chart.event'), looks: flight.truth.eventReplay.looks } : undefined}
          />
        </section>
        <section className="flight-map" aria-labelledby="map-h">
          <h3 id="map-h" className="type-label section-label">
            {t('flight.map')}
          </h3>
          <GroundMap track={track} title={t('flight.map')} />
          <p className="type-small">{t('map.note')}</p>
        </section>
        <section className="flight-battery" aria-labelledby="bat-h">
          <h3 id="bat-h" className="type-label section-label">
            {t('flight.battery')}
          </h3>
          <svg viewBox={`0 0 ${bins} 40`} preserveAspectRatio="none" className="battery-strip" role="img" aria-label={t('flight.battery_aria', { pct: fmtNum(lang, day.batteryPct) })}>
            {binMin.map((m, b) => (
              <rect key={b} x={b} width={1.02} y={40 - (m / 100) * 40} height={(m / 100) * 40} className={`battery-bar ${b <= curBin ? 'battery-bar--past' : ''} ${m < CONSTANTS.batteryFloorPct ? 'battery-bar--low' : ''}`} />
            ))}
          </svg>
          <p className="type-data">
            {fmtNum(lang, day.batteryPct)}% <span className="type-small">{t('flight.battery_now')}</span>
          </p>
        </section>
        <section className="flight-data" aria-labelledby="data-h">
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

      {ended && (
        <section className="reentry" aria-live="polite">
          {outcome.kind === 'reentered' ? (
            <>
              <p className="type-label">{t('flight.reentered_on', { date: fmtDate(lang, outcome.date) })}</p>
              <p className="type-data-l reentry-days">
                {fmtNum(lang, flight.truth.lifetimeDays)} <span className="type-data sp-unit">{t('unit.days')}</span>
              </p>
            </>
          ) : outcome.kind === 'alive' ? (
            <p className="type-body">{t('flight.alive', { asOf: fmtDate(lang, outcome.asOf), date: fmtDate(lang, outcome.predictedReentry) })}</p>
          ) : (
            <p className="type-body">{t('flight.alive_end', { asOf: fmtDate(lang, outcome.asOf), years: fmtNum(lang, outcome.minYears) })}</p>
          )}
          <Button onClick={() => setScreen('Report')}>{t('flight.to_report')}</Button>
        </section>
      )}
    </ScreenFrame>
  );
}
