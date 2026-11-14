import React from 'react';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';
import { useMission, ROLES } from '../store';
import { scenario, useEngineStatus } from '../engineAdapter';
import { Button, RoleChip, SiTag, SrcTag, unitText } from '../ui/components';
import { artAlt, scenarioText, tx } from '../content';
import { EventCard, Limits, ScenarioPicker } from '../ui/Jeddah';
import { fmtUsd } from '../format';
import { ScreenFrame } from './ScreenFrame';

export function Brief(): React.JSX.Element {
  const { t, lang } = useI18n();
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
    ? { revisit_days: fmtNum(lang, sc.revisitMaxDays), gsd_m: fmtNum(lang, sc.gsdMaxM), data_gb: fmtNum(lang, sc.dataDeliveredMinGB), lifetime_days: fmtNum(lang, sc.lifetimeMinDays), budget: fmtUsd(lang, sc.budgetUsd), look_days: fmtNum(lang, sc.lookWindowDays ?? 0) }
    : {};
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => String((params as Record<string, string>)[k] ?? m));
  const hero = 'art-p1-title-hero-v1.webp';

  return (
    <ScreenFrame id="Brief">
      <ScenarioPicker />
      <div className="brief-layout">
        <div className="brief-text">
          <p className="type-label brief-kicker">{t('brief.kicker')}</p>
          <h3 className={lang === 'ar' ? 'type-display-ar' : 'type-display-l'}>{tx(st?.title, lang, sc?.name ?? '')}</h3>
          {st?.story.map((b) => (
            <p key={b.beat} className="type-body brief-story">{tx(b.text, lang)}</p>
          ))}
          {st && <p className="type-body brief-story"><strong>{tx(st.mission, lang)}</strong></p>}
          <ul className="brief-reqs">
            {reqs.map((r) => (
              <li key={r.id} className="brief-req">
                <span className="type-label">{tx(st?.requirements[REQ_TEXT[r.id] ?? r.id]?.label, lang, t(`req.${r.id}`))}</span>
                <span className="type-small">{fill(tx(st?.requirements[REQ_TEXT[r.id] ?? r.id]?.why, lang))}</span>
                <span className="type-data-l">
                  {r.sense === 'max' ? '≤' : '≥'} {fmtNum(lang, r.target)}
                  <span className="type-data sp-unit"> {unitText(t, r.unit)}</span>
                </span>
              </li>
            ))}
          </ul>
          {sc && (
            <p className="type-small brief-src">
              {t('brief.targets_from')} <SrcTag src={sc.src} />
            </p>
          )}
          {status === 'mock' && <p className="type-small brief-stub">{t('engine.mock_notice')}</p>}
        </div>
        <div className="brief-hero">
          <figure className="jd-card-art brief-art">
            <img src={`${import.meta.env.BASE_URL}img/art/${hero}`} alt={artAlt(hero, lang)} />
            <SiTag />
          </figure>
          <p className="type-small">{t('art.note')}</p>
        </div>
      </div>
      {event && <EventCard />}
      <Limits scenarioId={result.design.scenarioId} />

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
