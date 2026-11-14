import React, { useEffect, useRef, useState } from 'react';
import type { SimResult } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { EventReport } from '../ui/Jeddah';
import { fmtDate, fmtNum, reducedMotion } from '../format';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { gibsImages, reportSources, type GibsImage } from '../engineAdapter';
import { Button, CauseChain, MissionTicket, VerdictStamp, unitText } from '../ui/components';
import { Illustration } from '../ui/Illustration';
import { EmptyState } from '../ui/EmptyState';
import { ReportMedals } from '../ui/ReportMedals';
import { DisposalDial } from '../ui/DisposalDial';
import { playStampThud, playSuccessChord } from '../sound';
import { ScreenFrame } from './ScreenFrame';

function CountUp({ target, durationMs = 600 }: { target: number; durationMs?: number }): React.JSX.Element {
  const [val, setVal] = useState(reducedMotion() ? target : 0);
  useEffect(() => {
    if (reducedMotion() || target === 0) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setVal(Math.round(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return <>{val}</>;
}

/** Main verdict: LIVED if the lifetime requirement is met, else DIED; with date and "the Sun took N days". */
export function MainVerdict({ r }: { r: SimResult }): React.JSX.Element {
  const { t, lang } = useI18n();
  const life = r.score.requirements.find((q) => q.id === 'lifetime');
  const lived = life?.met ?? false;
  const o = r.outcome;
  const when =
    o.kind === 'reentered'
      ? t('verdict.reentered', { date: fmtDate(lang, o.date) })
      : o.kind === 'alive'
        ? t('verdict.alive', { date: fmtDate(lang, o.predictedReentry) })
        : t('verdict.forecast_end', { years: fmtNum(lang, o.minYears) });
  const p = r.planVsTruth;
  const sun =
    p.sunTookDays >= 0
      ? t('verdict.sun_took', { n: fmtNum(lang, p.sunTookDays) })
      : t('verdict.sun_gave', { n: fmtNum(lang, -p.sunTookDays) });
  return <VerdictStamp state={lived ? 'ok' : 'fail'} title={lived ? t('verdict.lived') : t('verdict.died')} detail={`${when} · ${sun}`} />;
}

/** Dry HLS baseline of the scenario's place (Jeddah: 2024 dry baseline, never the flood). */
const gibsKey = (scenarioId: string): string => (scenarioId === 'jeddah-flood' ? 'jeddah_hls' : 'angola');

function SatelliteView({ gsdM, scenarioId }: { gsdM: number; scenarioId: string }): React.JSX.Element {
  const { t, lang } = useI18n();
  const [img, setImg] = useState<GibsImage | null | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    gibsImages().then((list) => setImg(list.find((g) => g.file.includes(gibsKey(scenarioId)) && g.resolutionM <= 30) ?? list[0] ?? null));
  }, [scenarioId]);

  // Blur radius in source pixels = player GSD / image resolution
  const factor = img ? Math.max(1, gsdM / img.resolutionM) : 1;
  useEffect(() => {
    if (!img || !canvas.current) return;
    const c = canvas.current;
    const im = new Image();
    im.onload = () => {
      const w = 640;
      const h = Math.round((im.height / im.width) * w);
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const px = ((factor - 1) * w) / im.width;
      ctx.filter = factor > 1 ? `blur(${px.toFixed(2)}px)` : 'none';
      ctx.drawImage(im, 0, 0, w, h);
    };
    im.src = img.url;
  }, [img, factor]);

  if (img === undefined) return <div className="art-slot type-small">{t('engine.loading')}</div>;
  if (img === null)
    return (
      <div className="art-slot" role="img" aria-label={t('report.image_missing')}>
        <span className="type-label">{t('report.image_missing')}</span>
      </div>
    );
  return (
    <div className="satview-viewfinder">
      <div className="viewfinder-frame">
        <canvas ref={canvas} className="satview-canvas" role="img" aria-label={t('report.image_alt')} />
        <span className="viewfinder-bracket tl" aria-hidden="true" />
        <span className="viewfinder-bracket tr" aria-hidden="true" />
        <span className="viewfinder-bracket bl" aria-hidden="true" />
        <span className="viewfinder-bracket br" aria-hidden="true" />
      </div>
      <figcaption className="type-small satview-caption">
        {factor > 1
          ? t('report.blur_caption', { gsd: fmtNum(lang, gsdM), res: img.resolutionM, x: fmtNum(lang, factor) })
          : t('report.sharp_caption', { gsd: fmtNum(lang, gsdM), res: img.resolutionM })}{' '}
        <span className="satview-credit">{t('report.gibs_credit', { credit: img.credit, date: img.date })}</span>
      </figcaption>
    </div>
  );
}

export function Report(): React.JSX.Element {
  const { t, tMsg, lang } = useI18n();
  const flight = useMission((s) => s.flight);
  const live = useMission((s) => s.result);
  const keepBaseline = useMission((s) => s.keepBaseline);
  const loadDesign = useMission((s) => s.loadDesign);
  const setScreen = useNavigation((s) => s.setScreen);
  const r = flight?.truth ?? live;
  const life = r.score.requirements.find((q) => q.id === 'lifetime');
  const lived = life?.met ?? false;
  const [gibs, setGibs] = useState<GibsImage | null>(null);
  const [appliedClosest, setAppliedClosest] = useState(false);

  useEffect(() => {
    gibsImages().then((l) => setGibs(l.find((g) => g.file.includes(gibsKey(r.design.scenarioId)) && g.resolutionM <= 30) ?? null));
  }, [r.design.scenarioId]);

  const gsd = r.score.requirements.find((q) => q.id === 'gsd');
  const sources = reportSources(r, gibs);
  const p = r.planVsTruth;
  const sunResilience = Math.max(0, Math.min(20, r.score.total - Math.round((r.score.requirementsMet * 80) / r.score.requirements.length)));

  useEffect(() => {
    playStampThud();
    if (r.score.requirementsMet === r.score.requirements.length) {
      const timer = window.setTimeout(playSuccessChord, 300);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [r]);

  const handleApplyClosest = () => {
    loadDesign({
      ...r.design,
      formFactor: r.closest.formFactor,
      orbit: {
        ...r.design.orbit,
        altitudeKm: r.closest.altitudeKm,
      },
    });
    setAppliedClosest(true);
    window.setTimeout(() => setAppliedClosest(false), 2000);
  };

  return (
    <ScreenFrame id="Report">
      {!flight && <EmptyState icon="report" text={t('report.not_flown')} />}

      {/* Console Debrief Header */}
      <div className="report-debrief-header console-panel">
        <Illustration id="art-p21-debrief-plate-v1" src="img/art/art-p21-debrief-plate-v1.webp" alt="Debrief plate" className="report-debrief-art" />
        <div className="report-header-content">
          <MainVerdict r={r} />
          <div className="report-score-box">
            <span className="type-label report-score-label">{t('report.score_label')}</span>
            <span className="type-display-xl report-score-value">
              <CountUp target={r.score.total} />
              <span className="type-small sp-unit"> / 100</span>
            </span>
          </div>
        </div>

        <Illustration
          id={lived ? 'p12' : 'p10'}
          src={lived ? 'img/art/art-p12-mission-flown-v1.webp' : 'img/art/art-p10-reentry-lost-v1.webp'}
          alt={lived ? t('verdict.lived') : t('verdict.died')}
          className="report-verdict-art"
        />

        <ReportMedals r={r} />
      </div>

      <EventReport result={r} />

      {/* Two-Column Debrief Console Grid */}
      <div className="report-console-grid">
        {/* Card 1: Cause Chain */}
        <section className="report-card console-panel" aria-labelledby="causes-h">
          <div className="console-panel-header">
            <h3 id="causes-h" className="type-label section-label">
              {t('causes.title')}
            </h3>
          </div>
          <CauseChain causes={r.causes} />
        </section>

        {/* Card 2: Plan vs Truth Twin Gauges */}
        <section className="report-card console-panel" aria-labelledby="twin-h">
          <div className="console-panel-header">
            <h3 id="twin-h" className="type-label section-label">
              {t('report.plan_vs_truth_title')}
            </h3>
          </div>
          <div className="twin-gauges-container">
            <div className="twin-gauge-item">
              <div className="twin-gauge-head">
                <span className="type-label">{t('ptn.truth')}</span>
                <span className="type-data-l">
                  <CountUp target={Math.round(p.truthLifetimeDays)} /> <span className="type-small sp-unit">{t('unit.days')}</span>
                </span>
              </div>
              <div className="twin-gauge-track" aria-hidden="true">
                <div
                  className="twin-gauge-bar twin-gauge-bar--truth"
                  style={{ inlineSize: `${Math.min(100, (p.truthLifetimeDays / Math.max(1, p.planLifetimeDays)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="twin-gauge-item">
              <div className="twin-gauge-head">
                <span className="type-label">{t('ptn.plan')}</span>
                <span className="type-data-l">
                  <CountUp target={Math.round(p.planLifetimeDays)} /> <span className="type-small sp-unit">{t('unit.days')}</span>
                </span>
              </div>
              <div className="twin-gauge-track" aria-hidden="true">
                <div className="twin-gauge-bar twin-gauge-bar--plan" style={{ inlineSize: '100%' }} />
              </div>
            </div>

            <div className="twin-sun-delta">
              <span className="type-label">{p.sunTookDays >= 0 ? t('report.sun_took_h') : t('report.sun_gave_h')}</span>
              <p className="type-display-l sun-took-n">
                {p.planIsLowerBound ? `${t('common.at_least')} ` : ''}
                <CountUp target={Math.abs(p.sunTookDays)} />
                <span className="type-data sp-unit"> {t('unit.days')}</span>
              </p>
              <p className="type-small">
                {t('report.sun_took_detail', { plan: fmtNum(lang, p.planLifetimeDays), truth: fmtNum(lang, p.truthLifetimeDays) })}
              </p>
            </div>
          </div>
        </section>

        {/* Card 3: Requirements Checklist */}
        <section className="report-card console-panel" aria-labelledby="req-h">
          <div className="console-panel-header">
            <h3 id="req-h" className="type-label section-label">
              {t('report.requirements')}
            </h3>
            <span className="type-data type-small">
              {t('report.met', { n: String(r.score.requirementsMet), total: String(r.score.requirements.length) })}
            </span>
          </div>

          <div className="req-grid">
            {r.score.requirements.map((q, idx) => (
              <div key={q.id} className="req-row-animated" style={{ '--i': idx } as React.CSSProperties}>
                <VerdictStamp
                  size="s"
                  state={q.met ? 'ok' : 'fail'}
                  title={`${t(`req.${q.id}`)}: ${q.met ? t('req.met') : t('req.missed')}`}
                  detail={
                    <span className="type-data">
                      {q.id === 'event-look' && q.value < 0 ? t('req.none') : `${fmtNum(lang, q.value)} ${unitText(t, q.unit)}`} {q.sense === 'max' ? '≤' : '≥'} {fmtNum(lang, q.target)} {unitText(t, q.unit)}
                    </span>
                  }
                />
              </div>
            ))}
          </div>

          <div className="sun-resilience-panel">
            <div className="sun-resilience-head">
              <span className="type-label">{t('report.sun_resilience')}</span>
              <span className="type-data">{fmtNum(lang, sunResilience)} / 20</span>
            </div>
            <div className="sun-resilience-track" aria-hidden="true">
              <div className="sun-resilience-fill" style={{ '--fill': `${sunResilience / 20}` } as React.CSSProperties} />
            </div>
          </div>

          {r.score.requirementsMet === r.score.requirements.length && (
            <p className="type-label report-plan-flown">{t('report.plan_flown')}</p>
          )}
        </section>

        {/* Card 4: Disposal Verdict Panel as a Dial */}
        <section className="report-card console-panel" aria-labelledby="disp-h">
          <div className="console-panel-header">
            <h3 id="disp-h" className="type-label section-label">
              {t('report.disposal_dial_title')}
            </h3>
          </div>
          <DisposalDial result={r} />
        </section>

        {/* Card 5: Closest-Design Hint with Apply Button */}
        <section className="report-card console-panel" aria-labelledby="closest-h">
          <div className="console-panel-header">
            <h3 id="closest-h" className="type-label section-label">
              {t('report.closest')}
            </h3>
            <Button variant="secondary" onClick={handleApplyClosest}>
              {appliedClosest ? t('report.applied') : t('report.apply_closest')}
            </Button>
          </div>
          <p className="type-heading closest-mission-name">{r.closest.mission}</p>
          <dl className="closest-stats type-small">
            <div>
              <dt>{t('report.closest_form')}</dt>
              <dd className="type-data">{r.closest.formFactor}</dd>
            </div>
            <div>
              <dt>{t('orbit.altitude')}</dt>
              <dd className="type-data">
                {fmtNum(lang, r.closest.altitudeKm)} {t('unit.km')}
              </dd>
            </div>
            <div>
              <dt>{t('report.closest_launch')}</dt>
              <dd className="type-data">{fmtDate(lang, r.closest.launchDate)}</dd>
            </div>
            <div>
              <dt>{t('report.closest_reentry')}</dt>
              <dd className="type-data">{r.closest.reentryDate ? fmtDate(lang, r.closest.reentryDate) : t('report.none')}</dd>
            </div>
          </dl>
          <p className="type-small closest-hint-text">{tMsg(r.closest.hint)}</p>
        </section>

        {/* Card 6: GIBS Satellite Viewfinder Frame */}
        <section className="report-card console-panel" aria-labelledby="satview-h">
          <div className="console-panel-header">
            <h3 id="satview-h" className="type-label section-label">
              {t('report.satview')}
            </h3>
          </div>
          <SatelliteView gsdM={gsd?.value ?? 30} scenarioId={r.design.scenarioId} />
        </section>

        {/* Card 7: Mission Code Console Box & P6 Backdrop */}
        <section className="report-card console-panel mission-code-card">
          <div className="console-panel-header">
            <span className="type-label section-label">{t('report.passport')}</span>
          </div>
          <MissionTicket code={r.missionCode} />
          <div className="report-p6-slot">
            <Illustration
              id="p6"
              src="img/art/art-p6-pitch-backdrop-v1.webp"
              alt={t('report.sources_title') || 'Backdrop'}
              className="report-backdrop-art"
            />
          </div>
        </section>

        {/* Card 8: Sourced Data Drawer */}
        <section className="report-card console-panel sources-card">
          <details className="sources">
            <summary className="type-label">{t('report.sources', { n: sources.length })}</summary>
            <table className="sources-table type-small">
              <thead>
                <tr>
                  <th scope="col">{t('src.col.what')}</th>
                  <th scope="col">{t('src.col.value')}</th>
                  <th scope="col">{t('src.col.tag')}</th>
                  <th scope="col">{t('src.col.source')}</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={i}>
                    <td>{t(s.labelKey)}</td>
                    <td className="type-data" dir="ltr">
                      {s.value}
                    </td>
                    <td>
                      <span className={`sp-src-tag type-label sp-src-tag--${s.tag}`}>{t(`tag.${s.tag}`)}</span>
                    </td>
                    <td dir="ltr">{s.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      </div>

      <div className="btn-row report-nav-actions">
        <Button
          onClick={() => {
            keepBaseline();
            setScreen('Build');
          }}
          disabled={!flight}
        >
          {t('refly.change_one')}
        </Button>
        <Button variant="secondary" onClick={() => setScreen('Refly')}>
          {t('screens.refly')}
        </Button>
      </div>
    </ScreenFrame>
  );
}
