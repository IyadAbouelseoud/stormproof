import React, { useMemo } from 'react';
import type { SimResult, TimelineDay } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum } from '../format';
import { CONSTANTS } from '../engineAdapter';
import { BoltMark } from './components';
import { Illustration } from './Illustration';

interface LogEntry {
  id: string;
  date: string;
  icon: 'launch' | 'storm' | 'look' | 'battery' | 'reentry' | 'alive';
  title: string;
  detail: string;
  state: 'ok' | 'warn' | 'fail';
  dayIndex: number;
}

interface MissionLogProps {
  result: SimResult;
  currentDayIndex: number;
  onSelectDay?: (dayIdx: number) => void;
}

export function MissionLog({ result, currentDayIndex, onSelectDay }: MissionLogProps): React.JSX.Element {
  const { t, lang } = useI18n();
  const tl = result.timeline;

  const entries: LogEntry[] = useMemo(() => {
    if (!tl || tl.length === 0) return [];
    const list: LogEntry[] = [];

    // 1. Launch event
    const first = tl[0]!;
    list.push({
      id: 'launch-0',
      date: first.date,
      icon: 'launch',
      title: t('log.insertion'),
      detail: `${fmtNum(lang, first.altitudeKm)} ${t('unit.km')} ${t(`orbit.${result.design.orbit.type}`)}`,
      state: 'ok',
      dayIndex: 0,
    });

    // 2. Storm events from timeline
    tl.forEach((d: TimelineDay, i: number) => {
      if (d.stormKp !== null && d.stormKp >= CONSTANTS.stormAlertKp) {
        list.push({
          id: `storm-${i}`,
          date: d.date,
          icon: 'storm',
          title: t('log.storm'),
          detail: t('log.storm_detail', { kp: fmtNum(lang, d.stormKp) }),
          state: 'warn',
          dayIndex: i,
        });
      }
    });

    // 3. Events from eventReplay (Jeddah flood scenario if applicable)
    if (result.eventReplay) {
      result.eventReplay.looks.forEach((l, i) => {
        const matchingIdx = tl.findIndex((d) => d.date === l.date);
        list.push({
          id: `look-${i}`,
          date: l.date,
          icon: 'look',
          title: t(l.usable ? 'log.target_ok' : 'log.target_blocked'),
          detail: t(l.usable ? 'log.pass_clear' : 'log.cloud'),
          state: l.usable ? 'ok' : 'fail',
          dayIndex: matchingIdx >= 0 ? matchingIdx : 0,
        });
      });
    }

    // 4. Outcome event
    const last = tl[tl.length - 1]!;
    if (result.outcome.kind === 'reentered') {
      list.push({
        id: 'outcome-reentry',
        date: result.outcome.date,
        icon: 'reentry',
        title: t('log.reentry'),
        detail: t('log.reentry_detail'),
        state: 'fail',
        dayIndex: tl.length - 1,
      });
    } else {
      list.push({
        id: 'outcome-alive',
        date: last.date,
        icon: 'alive',
        title: t('log.nominal'),
        detail: t('log.nominal_detail'),
        state: 'ok',
        dayIndex: tl.length - 1,
      });
    }

    // Sort newest on top
    return list.sort((a, b) => b.dayIndex - a.dayIndex);
  }, [tl, result.eventReplay, result.outcome, result.design.orbit.type, lang, t]);

  // Determine current live telemetry status line
  const currentDay = tl[Math.min(currentDayIndex, tl.length - 1)];
  let statusText = t('log.status_nominal');
  let statusState: 'ok' | 'warn' | 'fail' = 'ok';

  if (currentDay) {
    if (currentDay.altitudeKm <= CONSTANTS.reentryAltKm + 10) {
      statusText = t('log.status_reentry');
      statusState = 'fail';
    } else if (currentDay.stormKp !== null && currentDay.stormKp >= CONSTANTS.stormAlertKp) {
      statusText = t('log.status_storm', { kp: fmtNum(lang, currentDay.stormKp) });
      statusState = 'warn';
    } else if (currentDay.batteryPct < 30) {
      statusText = t('log.status_lowbat', { pct: fmtNum(lang, currentDay.batteryPct) });
      statusState = 'warn';
    }
  }

  return (
    <section className="mission-log-panel console-panel" aria-labelledby="log-h">
      <div className="console-panel-header">
        <h3 id="log-h" className="type-label section-label">
          {t('flight.log_title') || 'Mission Log'}
        </h3>
        <span className={`log-live-status type-label log-live-status--${statusState}`}>
          {t('log.status')}: {statusText}
        </span>
      </div>

      <Illustration id="art-p23-log-border-v1" src="img/art/art-p23-log-border-v1.webp" alt="Log border" className="log-border-art" />

      <div className="mission-log-stream" role="feed" aria-label={t('flight.log_title')}>
        {entries.map((e) => {
          const isSelected = Math.abs(e.dayIndex - currentDayIndex) <= 2;
          return (
            <article
              key={e.id}
              className={`log-entry log-entry--${e.state} ${isSelected ? 'log-entry--active' : ''}`}
              onClick={() => onSelectDay?.(e.dayIndex)}
              tabIndex={0}
              role="article"
            >
              <div className="log-entry-meta type-small">
                <span className="log-entry-icon" aria-hidden="true">
                  {e.icon === 'launch' && '▲'}
                  {e.icon === 'storm' && <BoltMark size={10} />}
                  {e.icon === 'look' && '⊙'}
                  {e.icon === 'reentry' && '▼'}
                  {e.icon === 'alive' && '●'}
                </span>
                <span className="log-entry-date type-data">{fmtDate(lang, e.date)}</span>
                <span className="log-entry-day type-data">{t('flight.day')} {fmtNum(lang, e.dayIndex)}</span>
              </div>
              <div className="log-entry-body">
                <h4 className="log-entry-title type-body">{e.title}</h4>
                <p className="log-entry-detail type-small">{e.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
