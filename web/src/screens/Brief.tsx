import React from 'react';
import { useI18n } from '../i18n';
import { fmtNum, fmtUsd } from '../format';
import { useMission, ROLES } from '../store';
import { useNavigation } from '../navigation';
import { scenario, sunMonths, useEngineStatus } from '../engineAdapter';
import { Button, ReqIcon, RoleChip, SiTag, SrcTag, unitText } from '../ui/components';
import { MissionEmblem } from '../ui/MissionEmblem';
import { SunStripe } from '../ui/SunStripe';
import { scenarioText, tx } from '../content';
import { EventCard, Limits, ScenarioPicker } from '../ui/Jeddah';
import { playPartSnap } from '../sound';
import { ScreenFrame } from './ScreenFrame';

export function Brief(): React.JSX.Element {
  const { t, lang } = useI18n();
  const setScreen = useNavigation((s) => s.setScreen);
  const result = useMission((s) => s.result);
  const team = useMission((s) => s.teamMode);
  const names = useMission((s) => s.names);
  const setTeamMode = useMission((s) => s.setTeamMode);
  const setName = useMission((s) => s.setName);
  const status = useEngineStatus((s) => s.status);
  const sc = scenario(result.design.scenarioId);
  const st = scenarioText(result.design.scenarioId);
  const reqs = result.score.requirements;
  const event = result.eventReplay !== undefined;
  const REQ_TEXT: Record<string, string> = { 'data-delivered': 'data' };
  const params = sc
    ? {
        revisit_days: fmtNum(lang, sc.revisitMaxDays),
        gsd_m: fmtNum(lang, sc.gsdMaxM),
        data_gb: fmtNum(lang, sc.dataDeliveredMinGB),
        lifetime_days: fmtNum(lang, sc.lifetimeMinDays),
        budget: fmtUsd(lang, sc.budgetUsd),
        look_days: fmtNum(lang, sc.lookWindowDays ?? 0),
      }
    : {};
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => String((params as Record<string, string>)[k] ?? m));
  const months = sunMonths();

  // Banner art: P2 Angola or P7 Jeddah at 21:9 aspect ratio
  const bannerArt = result.design.scenarioId === 'jeddah-flood' ? 'art-p7-jeddah-flood-v1.webp' : 'art-p2-angola-drought-v1.webp';

  // Visible story: ONE sentence of story (max 20 words)
  const storyRaw = st?.story[0]?.text ? tx(st.story[0].text, lang) : (st?.mission ? tx(st.mission, lang) : '');
  const sentenceMatch = storyRaw.match(/^[^.!?؟]+[.!?؟]?/);
  const firstSentence = sentenceMatch ? sentenceMatch[0] : storyRaw.split(' ').slice(0, 20).join(' ');

  return (
    <ScreenFrame id="Brief">
      {/* Scenario Banner with SI tag and mission emblem (X2) */}
      <div className="brief-banner brief-stagger" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <div className="brief-banner-media">
          <img
            src={`${import.meta.env.BASE_URL}img/art/${bannerArt}`}
            alt={tx(st?.title, lang, sc?.name ?? '')}
            className="brief-banner-img"
            loading="eager"
          />
          <SiTag />
          <MissionEmblem size={72} />
        </div>
      </div>

      <div className="brief-briefing-header brief-stagger" style={{ '--delay': '120ms' } as React.CSSProperties}>
        <p className="type-label brief-kicker">{t('brief.kicker')}</p>
        <h2 className={lang === 'ar' ? 'type-display-ar' : 'type-display-l'}>
          {tx(st?.title, lang, sc?.name ?? '')}
        </h2>
        <p className="type-body brief-story-visible">{firstSentence}</p>
        <details className="brief-story-disclosure">
          <summary className="type-label">{t('brief.read_full')}</summary>
          <div className="brief-story-dropdown">
            {st?.story.map((b) => (
              <p key={b.beat} className="type-body brief-story-beat">
                {tx(b.text, lang)}
              </p>
            ))}
            {st && (
              <p className="type-body brief-story-mission">
                <strong>{tx(st.mission, lang)}</strong>
              </p>
            )}
            {sc && (
              <p className="type-small brief-src">
                {t('brief.targets_from')} <SrcTag src={sc.src} />
              </p>
            )}
            {status === 'mock' && <p className="type-small brief-stub">{t('engine.mock_notice')}</p>}
          </div>
        </details>
      </div>

      {/* Sun Stripe compact display (X2) */}
      {months && (
        <section className="brief-sunstripe-section" aria-label={t('sun.legend')}>
          <div className="brief-sunstripe-box">
            <SunStripe months={months} value={Math.max(0, months.findIndex((m) => m.month === '2023-04'))} label={t('sun.legend')} />
          </div>
          <p className="type-small sun-legend">
            {t('sun.legend')} <span className="type-data">{t('sun.steps')}</span>
          </p>
        </section>
      )}

      {/* Objective tiles in a grid (3 columns at 1440, 2 at 390) (X2) */}
      <section className="brief-objectives" aria-label={t('report.requirements')}>
        <div className="brief-obj-grid">
          {reqs.map((r, idx) => {
            const whyText = fill(tx(st?.requirements[REQ_TEXT[r.id] ?? r.id]?.why, lang));
            const labelText = tx(st?.requirements[REQ_TEXT[r.id] ?? r.id]?.label, lang, t(`req.${r.id}`));
            return (
              <div
                key={r.id}
                className="brief-obj-tile brief-stagger"
                tabIndex={0}
                style={{ '--delay': `${240 + idx * 120}ms` } as React.CSSProperties}
              >
                <div className="brief-obj-head">
                  <ReqIcon id={r.id} />
                  <span className="brief-obj-ring" aria-hidden="true" />
                </div>
                <span className="type-label brief-obj-label">{labelText}</span>
                <span className="type-data-l brief-obj-target">
                  {r.sense === 'max' ? '≤' : '≥'} {fmtNum(lang, r.target)}
                  <span className="type-data sp-unit"> {unitText(t, r.unit)}</span>
                </span>
                {whyText && <span className="type-small brief-obj-why">{whyText}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Single focal CTA button: full width on mobile, RTL arrow mirroring, 1px depress + sound (X2) */}
      <div className="brief-start-cta">
        <Button
          className="brief-start-btn"
          onClick={() => {
            playPartSnap();
            setScreen('Build');
          }}
        >
          <span className="type-display-l">{t('brief.start_mission')}</span>
          <span className="brief-start-arrow" aria-hidden="true">
            {lang === 'ar' ? '←' : '→'}
          </span>
        </Button>
      </div>

      <ScenarioPicker />
      {event && <EventCard />}
      <Limits scenarioId={result.design.scenarioId} />

      {/* Team mode setup */}
      <section className="team-setup" aria-labelledby="team-setup-h">
        <h3 id="team-setup-h" className="type-heading">{t('team.title')}</h3>
        <div className="btn-row" role="group" aria-label={t('team.title')}>
          <Button variant="secondary" pressed={!team} onClick={() => setTeamMode(false)}>
            {t('team.solo')}
          </Button>
          <Button variant="secondary" pressed={team} onClick={() => setTeamMode(true)}>
            {t('team.team')}
          </Button>
        </div>
        {team && (
          <div className="team-roles">
            <p className="type-small">{t('team.explain')}</p>
            {ROLES.map((r) => (
              <label key={r} className="team-role-row">
                <RoleChip role={r} />
                <span className="type-small">{t(`role.${r}.owns`)}</span>
                <input
                  className="sp-input type-body"
                  value={names[r] ?? ''}
                  placeholder={t('team.name_placeholder')}
                  aria-label={t('team.name_for', { role: t(`role.${r}`) })}
                  onChange={(e) => setName(r, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
      </section>
    </ScreenFrame>
  );
}
