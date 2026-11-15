import React from 'react';
import type { SimResult } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';

export interface ReportMedalsProps {
  r: SimResult;
}

/** Three mission medals (Plan flown, Sun survivor, Storm rider) computed purely from SimResult (X4 / prompt G2). */
export function ReportMedals({ r }: { r: SimResult }): React.JSX.Element {
  const { t, lang } = useI18n();
  const missing = r.score.requirements.filter((q) => !q.met).map((q) => t(`req.${q.id}`)).join(', ');

  // 1. Plan flown: every requirement met
  const planFlownEarned = r.score.requirementsMet === r.score.requirements.length;

  // 2. Sun survivor: alive past the plan-mode lifetime in truth mode
  const sunSurvivorEarned =
    r.planVsTruth.sunTookDays < 0 ||
    r.planVsTruth.truthLifetimeDays > r.planVsTruth.planLifetimeDays;

  // 3. Storm rider: alive through 3-5 Feb 2022 if the flight spans it
  const spansStorm =
    r.timeline.some((d) => d.date === '2022-02-03') &&
    r.timeline.some((d) => d.date === '2022-02-05');
  const stormRiderEarned =
    spansStorm && (r.outcome.kind !== 'reentered' || r.outcome.date >= '2022-02-05');

  const medals = [
    {
      id: 'plan_flown',
      earned: planFlownEarned,
      title: t('medal.plan_flown'),
      desc: t('medal.plan_flown_desc'),
      calc: planFlownEarned ? `${r.score.requirementsMet} / ${r.score.requirements.length}` : t('medal.progress_plan', { met: r.score.requirementsMet, total: r.score.requirements.length, missing }),
    },
    {
      id: 'sun_survivor',
      earned: sunSurvivorEarned,
      title: t('medal.sun_survivor'),
      desc: t('medal.sun_survivor_desc'),
      calc: sunSurvivorEarned ? `${fmtNum(lang, r.planVsTruth.truthLifetimeDays)} / ${fmtNum(lang, r.planVsTruth.planLifetimeDays)}` : t('medal.progress_sun', { truth: fmtNum(lang, r.planVsTruth.truthLifetimeDays), plan: fmtNum(lang, r.planVsTruth.planLifetimeDays) }),
    },
    {
      id: 'storm_rider',
      earned: stormRiderEarned,
      title: t('medal.storm_rider'),
      desc: t('medal.storm_rider_desc'),
      calc: spansStorm ? (stormRiderEarned ? t('medal.calc_survived') : t('medal.calc_lost')) : t('medal.progress_storm'),
    },
  ];

  return (
    <section className="report-medals" aria-labelledby="medals-h">
      <h3 id="medals-h" className="type-label section-label">
        {t('medals.title')}
      </h3>
      <div className="medals-grid">
        {medals.map((m) => (
          <div
            key={m.id}
            className={`sp-medal ${m.earned ? 'sp-medal--earned' : 'sp-medal--locked'}`}
            tabIndex={0}
            role="article"
            aria-label={`${m.title}: ${m.earned ? t('medal.status_earned') : t('medal.status_locked')}`}
          >
            <div className="sp-medal-badge" aria-hidden="true">
              <svg viewBox="0 0 40 50" width="36" height="46" className="sp-medal-svg">
                {/* Ribbon */}
                <path
                  d="M 12 0 L 20 14 L 28 0 Z"
                  fill={m.earned ? 'var(--color-lapis)' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M 6 0 L 13 14 L 8 14 L 1 0 Z"
                  fill={m.earned ? 'var(--color-brass)' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M 34 0 L 27 14 L 32 14 L 39 0 Z"
                  fill={m.earned ? 'var(--color-brass)' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1"
                />

                {/* Roundel */}
                <circle
                  cx="20"
                  cy="32"
                  r="14"
                  fill={m.earned ? 'var(--color-lapis)' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray={m.earned ? 'none' : '3 2'}
                />

                {/* Emblem inside roundel */}
                {m.id === 'plan_flown' && (
                  <path
                    d="M 14 32 L 18 36 L 26 27"
                    fill="none"
                    stroke={m.earned ? 'var(--color-on-lapis)' : 'currentColor'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {m.id === 'sun_survivor' && (
                  <circle
                    cx="20"
                    cy="32"
                    r="6"
                    fill={m.earned ? 'var(--color-sol)' : 'none'}
                    stroke={m.earned ? 'var(--color-sol)' : 'currentColor'}
                    strokeWidth="1.5"
                  />
                )}
                {m.id === 'storm_rider' && (
                  <path
                    d="M 21 24 L 15 32 L 20 32 L 19 40 L 25 30 L 21 30 Z"
                    fill={m.earned ? 'var(--color-sol)' : 'none'}
                    stroke={m.earned ? 'var(--color-sol)' : 'currentColor'}
                    strokeWidth="1"
                  />
                )}
              </svg>
            </div>
            <div className="sp-medal-content">
              <span className="type-label sp-medal-title">{m.title}</span>
              <span className="type-small sp-medal-status">
                {m.earned ? t('medal.status_earned') : t('medal.status_locked')}
              </span>
              <p className="type-small sp-medal-desc">{m.desc}</p>
              <span className="type-data sp-medal-calc">{m.calc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
