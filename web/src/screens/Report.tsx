import React, { useEffect, useRef, useState } from 'react';
import type { SimResult } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { EventReport } from '../ui/Jeddah';
import { fmtDate, fmtNum } from '../format';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { gibsImages, reportSources, type GibsImage } from '../engineAdapter';
import { Button, CauseChain, MissionTicket, VerdictStamp, unitText } from '../ui/components';
import { ScreenFrame } from './ScreenFrame';

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

function SatelliteView({ gsdM }: { gsdM: number }): React.JSX.Element {
  const { t, lang } = useI18n();
  const [img, setImg] = useState<GibsImage | null | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    gibsImages().then((list) => setImg(list.find((g) => g.file.includes('angola') && g.resolutionM <= 30) ?? list[0] ?? null));
  }, []);
  // blur radius in source pixels = player GSD / image resolution (no blur when the camera is sharper)
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
    <figure className="satview">
      <canvas ref={canvas} className="satview-canvas" role="img" aria-label={t('report.image_alt')} />
      <figcaption className="type-small">
        {factor > 1
          ? t('report.blur_caption', { gsd: fmtNum(lang, gsdM), res: img.resolutionM, x: fmtNum(lang, factor) })
          : t('report.sharp_caption', { gsd: fmtNum(lang, gsdM), res: img.resolutionM })}{' '}
        {t('report.gibs_credit', { credit: img.credit, date: img.date })}
      </figcaption>
    </figure>
  );
}

export function Report(): React.JSX.Element {
  const { t, tMsg, lang } = useI18n();
  const flight = useMission((s) => s.flight);
  const live = useMission((s) => s.result);
  const keepBaseline = useMission((s) => s.keepBaseline);
  const setScreen = useNavigation((s) => s.setScreen);
  const [gibs, setGibs] = useState<GibsImage | null>(null);
  useEffect(() => {
    gibsImages().then((l) => setGibs(l.find((g) => g.file.includes('angola') && g.resolutionM <= 30) ?? null));
  }, []);
  const r = flight?.truth ?? live;
  const gsd = r.score.requirements.find((q) => q.id === 'gsd');
  const sources = reportSources(r, gibs);
  const p = r.planVsTruth;

  return (
    <ScreenFrame id="Report">
      {!flight && <p className="type-small brief-stub">{t('report.not_flown')}</p>}
      <MainVerdict r={r} />

      <section className="sun-took" aria-labelledby="sun-took-h">
        <h3 id="sun-took-h" className="type-label section-label">
          {p.sunTookDays >= 0 ? t('report.sun_took_h') : t('report.sun_gave_h')}
        </h3>
        <p className="type-display-xl sun-took-n">
          {p.planIsLowerBound ? `${t('common.at_least')} ` : ''}
          {fmtNum(lang, Math.abs(p.sunTookDays))}
          <span className="type-data sp-unit"> {t('unit.days')}</span>
        </p>
        <p className="type-small">
          {t('report.sun_took_detail', { plan: fmtNum(lang, p.planLifetimeDays), truth: fmtNum(lang, p.truthLifetimeDays) })}
        </p>
      </section>

      <EventReport result={r} />

      <section aria-labelledby="req-h">
        <h3 id="req-h" className="type-label section-label">
          {t('report.requirements')}
        </h3>
        <div className="req-grid">
          {r.score.requirements.map((q) => (
            <VerdictStamp
              key={q.id}
              size="s"
              state={q.met ? 'ok' : 'fail'}
              title={`${t(`req.${q.id}`)}: ${q.met ? t('req.met') : t('req.missed')}`}
              detail={
                <span className="type-data">
                  {q.id === 'event-look' && q.value < 0 ? t('req.none') : `${fmtNum(lang, q.value)} ${unitText(t, q.unit)}`} {q.sense === 'max' ? '≤' : '≥'} {fmtNum(lang, q.target)} {unitText(t, q.unit)}
                </span>
              }
            />
          ))}
        </div>
        <p className="type-small">
          {t('report.score', { met: r.score.requirementsMet, total: r.score.requirements.length, score: r.score.total })}
        </p>
        <p className="type-small">{tMsg(r.disposal.reason)}</p>
      </section>

      <section aria-labelledby="causes-h">
        <h3 id="causes-h" className="type-label section-label">
          {t('causes.title')}
        </h3>
        <CauseChain causes={r.causes} />
      </section>

      <div className="report-split">
        <section className="closest" aria-labelledby="closest-h">
          <h3 id="closest-h" className="type-label section-label">
            {t('report.closest')}
          </h3>
          <p className="type-heading">{r.closest.mission}</p>
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
          <p className="type-small">{tMsg(r.closest.hint)}</p>
        </section>
        <section aria-labelledby="satview-h">
          <h3 id="satview-h" className="type-label section-label">
            {t('report.satview')}
          </h3>
          <SatelliteView gsdM={gsd?.value ?? 30} />
        </section>
      </div>

      <MissionTicket code={r.missionCode} />

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

      <div className="btn-row">
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
