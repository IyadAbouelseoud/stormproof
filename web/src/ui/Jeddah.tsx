/**
 * Jeddah flood watch UI (prompt E F1-F7). Shown only for scenarios with an event; Angola is untouched.
 * Honest limits come from content/text/scenarios.json; reported event figures are tagged "secondary source".
 */
import React, { useState } from 'react';
import type { EventReplay, MissionDesign, SimResult } from '@stormproof/engine';
import { translateMsg, useI18n } from '../i18n';
import { fmtDate, fmtNum } from '../format';
import { useMission } from '../store';
import { SCENARIO_IDS, cloudTags, scenario } from '../engineAdapter';
import { artAlt, scenarioText, tx } from '../content';
import { Button, SiTag, VerdictStamp } from './components';

const BASE = import.meta.env.BASE_URL;
const ART: Record<string, string> = { angola: 'art-p2-angola-drought-v1.webp', 'jeddah-flood': 'art-p7-jeddah-flood-v1.webp' };

export const hasEvent = (r: SimResult): boolean => r.eventReplay !== undefined;

/** "Secondary source" / "design study" style tag (same look as the source tags). */
export function NoteTag({ k }: { k: string }): React.JSX.Element {
  const { t } = useI18n();
  return <span className="sp-src-tag sp-src-tag--gb type-label">{t(k)}</span>;
}

// F1 ------------------------------------------------------------------------
export function ScenarioPicker(): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const current = useMission((s) => s.design.scenarioId);
  const setScenario = useMission((s) => s.setScenario);
  if (SCENARIO_IDS.length < 2) return null;
  return (
    <section aria-labelledby="pick-h" className="jd-picker">
      <h3 id="pick-h" className="type-label section-label">{t('scenario.pick')}</h3>
      <div className="jd-picker-grid" role="group" aria-labelledby="pick-h">
        {SCENARIO_IDS.map((id) => {
          const st = scenarioText(id);
          const sel = id === current;
          return (
            <button key={id} type="button" className={`sp-part jd-card ${sel ? 'sp-part--selected' : ''}`} aria-pressed={sel} onClick={() => setScenario(id)}>
              {ART[id] && (
                <span className="jd-card-art">
                  <img src={`${BASE}img/art/${ART[id]}`} alt={artAlt(ART[id]!, lang)} loading="lazy" />
                  <SiTag />
                </span>
              )}
              <span className="type-heading">{tx(st?.title, lang, scenario(id)?.name ?? id)}</span>
              <span className="type-small">{t(`scenario.summary.${id}`)}</span>
              {id === 'jeddah-flood' && (
                <span className="type-small jd-tags">
                  {t('jeddah.radar')} <NoteTag k="tag.design_study" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="type-small">{t('art.note')}</p>
    </section>
  );
}

// F2 ------------------------------------------------------------------------
export function EventCard(): React.JSX.Element {
  const { t, lang } = useI18n();
  return (
    <section className="jd-event" aria-labelledby="event-h">
      <h3 id="event-h" className="type-label section-label">{t('jeddah.event.title')}</h3>
      <p className="type-data-l">{fmtDate(lang, '2022-11-24')}</p>
      <p className="type-body">{t('jeddah.event.rain')} <NoteTag k="tag.secondary" /></p>
      <p className="type-small">{t('jeddah.event.toll')} <NoteTag k="tag.secondary" /></p>
      <p className="type-small">{t('jeddah.event.src')}</p>
      <p className="type-small">{t('jeddah.event.imerg')}</p>
      <p className="type-small">{t('jeddah.event.background')}</p>
    </section>
  );
}

export function Limits({ scenarioId }: { scenarioId: string }): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const st = scenarioText(scenarioId);
  if (!st?.limits?.length) return null;
  return (
    <section aria-labelledby="limits-h" className="jd-limits">
      <h3 id="limits-h" className="type-label section-label">{t('jeddah.limits')}</h3>
      <ul className="type-small">
        {st.limits.map((l, i) => <li key={i}>{tx(l, lang)}</li>)}
        {scenario(scenarioId)?.event && (
          <>
            <li>{t('jeddah.limit.anchors')}</li>
            <li>{t('jeddah.event.background')}</li>
          </>
        )}
      </ul>
    </section>
  );
}

// F3 ------------------------------------------------------------------------
export function CameraTrade(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="jd-trade type-small" role="note">
      <p><strong>{t('jeddah.trade.optical_h')}</strong> {t('jeddah.trade.optical')}</p>
      <p><strong>{t('jeddah.trade.radar_h')}</strong> {t('jeddah.trade.radar')} <NoteTag k="tag.not_real_6u" /></p>
    </div>
  );
}

// F4 ------------------------------------------------------------------------
export function AliveIndicator({ result }: { result: SimResult }): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const ev = result.eventReplay;
  if (!ev) return null;
  const date = fmtDate(lang, ev.date);
  const state = ev.alive ? 'ok' : 'fail';
  const detail = ev.alive
    ? t('jeddah.alive.yes')
    : ev.reentryBeforeEvent && ev.reentryDate
      ? t('jeddah.alive.reentered', { date: fmtDate(lang, ev.reentryDate) })
      : t('jeddah.alive.not_launched');
  return (
    <div className="jd-alive" aria-live="polite">
      <VerdictStamp size="s" state={state} title={t('jeddah.alive.q', { date })} detail={detail} />
      <p className="type-small">{t('jeddah.alive.note')}</p>
    </div>
  );
}

// F6 ------------------------------------------------------------------------
const IMERG = ['20221124_03', '20221124_05', '20221124_07', '20221124_09', '20221124_12', '20221125_03'];
const imergLabel = (s: string): string => `${s.slice(6, 8)} Nov ${s.slice(9, 11)}:00 UTC`;

export function EventVerdict({ ev }: { ev: EventReplay }): React.JSX.Element {
  const { t, lang } = useI18n();
  const met = ev.firstUsefulLookDays !== null;
  const title = met ? t('jeddah.verdict.met') : t('jeddah.verdict.missed');
  const detail = !ev.alive
    ? ev.reentryDate ? t('jeddah.alive.reentered', { date: fmtDate(lang, ev.reentryDate) }) : t('jeddah.alive.not_launched')
    : met
      ? t('jeddah.verdict.met_detail', { days: fmtNum(lang, ev.firstUsefulLookDays!) })
      : ev.looks.length === 0
        ? t('jeddah.verdict.no_pass', { revisit: fmtNum(lang, ev.revisitDays ?? 0) })
        : t('jeddah.verdict.blocked');
  return <VerdictStamp size="l" state={met ? 'ok' : 'fail'} title={title} detail={detail} />;
}

export function PassList({ ev }: { ev: EventReplay }): React.JSX.Element | null {
  const { lang, t } = useI18n();
  if (ev.looks.length === 0) return null;
  return (
    <ul className="jd-passes type-small" aria-label={t('jeddah.passes')}>
      {ev.looks.map((l, i) => (
        <li key={i} className={l.usable ? 'jd-pass--ok' : 'jd-pass--blocked'}>
          <span className="type-data">{fmtDate(lang, l.date)}</span> {l.usable ? t('jeddah.pass.usable') : t('jeddah.pass.blocked')}: {translateMsg(lang, l.why)}
        </li>
      ))}
    </ul>
  );
}


export function EventReport({ result }: { result: SimResult }): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const ev = result.eventReplay;
  const [frame, setFrame] = useState(1);
  if (!ev) return null;
  const tags = cloudTags(result.design.scenarioId) ?? [];
  const f = IMERG[frame]!;
  return (
    <section className="jd-report" aria-labelledby="jd-report-h">
      <h3 id="jd-report-h" className="type-heading">{t('jeddah.report.title')}</h3>
      <EventVerdict ev={ev} />
      <PassList ev={ev} />
      <p className="type-small">{t('jeddah.limit1')}</p>

      <div className="report-split jd-before-after">
        <figure className="jd-fig">
          <figcaption className="type-label">{t('jeddah.before')}</figcaption>
          <img src={`${BASE}img/gibs/jeddah_hls30.jpg`} alt={t('jeddah.before_alt')} loading="lazy" />
          <p className="type-small">{t('jeddah.before_credit')}</p>
        </figure>
        <figure className="jd-fig">
          <figcaption className="type-label">{t('jeddah.after')}</figcaption>
          <img src={`${BASE}img/gibs/jeddah_modis_20221124.jpg`} alt={t('jeddah.after_alt')} loading="lazy" />
          <p className="type-small">{t('jeddah.after_credit')}</p>
        </figure>
      </div>

      <figure className="jd-fig jd-rain">
        <figcaption className="type-label">{t('jeddah.rain.title')}</figcaption>
        <img src={`${BASE}img/gibs/jeddah_imerg_${f}z.jpg`} alt={t('jeddah.rain.alt', { time: imergLabel(f) })} loading="lazy" />
        <label className="type-small jd-scrub">
          <span>{t('jeddah.rain.time')}: <span className="type-data" dir="ltr">{imergLabel(f)}</span></span>
          <input type="range" min={0} max={IMERG.length - 1} step={1} value={frame} onChange={(e) => setFrame(Number(e.target.value))} aria-valuetext={imergLabel(f)} />
        </label>
        <p className="type-small">{t('jeddah.rain.note')}</p>
        <p className="type-small">{t('jeddah.rain.credit')}</p>
      </figure>

      <figure className="jd-fig">
        <figcaption className="type-label">{t('jeddah.cloud.title')}</figcaption>
        <ol className="jd-strip">
          {tags.map((d) => (
            <li key={d.date} className={`jd-day jd-day--${d.tag}`}>
              <img src={`${BASE}img/gibs/jeddah_modis_${d.date.replace(/-/g, '')}.jpg`} alt={t('jeddah.cloud.alt', { date: fmtDate(lang, d.date), tag: t(`cloud.${d.tag}`) })} loading="lazy" />
              <span className="type-data">{fmtDate(lang, d.date)}</span>
              <span className="type-label">{t(`cloud.${d.tag}`)}</span>
            </li>
          ))}
        </ol>
        <p className="type-small">{t('jeddah.cloud.note')}</p>
      </figure>
    </section>
  );
}

// F7 ------------------------------------------------------------------------
/** The radar part of the other camera kind, keeping the rest of the design. */
export function otherCamera(d: MissionDesign): MissionDesign {
  const radar = d.parts.camera === 'camera-radar';
  return { ...d, parts: { ...d.parts, camera: radar ? 'camera-budget' : 'camera-radar' } };
}
export function launchEarlier(d: MissionDesign): MissionDesign {
  const y = Number(d.launchDate.slice(0, 4));
  return { ...d, launchDate: `${Math.max(2015, y - 1)}${d.launchDate.slice(4)}` };
}

export function ReflyVariants({ onFly }: { onFly: (d: MissionDesign) => void }): React.JSX.Element {
  const { t } = useI18n();
  const design = useMission((s) => s.design);
  return (
    <div className="btn-row" role="group" aria-label={t('jeddah.variants')}>
      <Button variant="secondary" onClick={() => onFly(otherCamera(design))}>{t('jeddah.variant.camera')}</Button>
      <Button variant="secondary" onClick={() => onFly(launchEarlier(design))}>{t('jeddah.variant.earlier')}</Button>
    </div>
  );
}
