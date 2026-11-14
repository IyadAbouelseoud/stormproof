import React from 'react';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';
import { useMission, ROLES } from '../store';
import { useNavigation } from '../navigation';
import { scenario, scenarioText, sunMonths, useEngineStatus } from '../engineAdapter';
import { Button, RoleChip, SrcTag, unitText } from '../ui/components';
import { Illustration } from '../ui/Illustration';
import { SunStripe } from '../ui/SunStripe';
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
  const text = scenarioText(result.design.scenarioId);
  const months = sunMonths();
  // the three numeric requirements of the brief: revisit, ground resolution, lifetime (targets from the result)
  const reqs = result.score.requirements.filter((r) => r.id === 'revisit' || r.id === 'gsd' || r.id === 'lifetime');

  return (
    <ScreenFrame id="Brief">
      {/* Hook banner */}
      <div className="brief-hook-card">
        <p className="type-heading brief-game-desc">{t('brief.game_desc')}</p>
        <p className="type-body brief-hook-text">{t('brief.hook')}</p>
      </div>

      <div className="brief-layout">
        <div className="brief-text">
          <p className="type-label brief-kicker">{t('brief.kicker')}</p>
          <h3 className={lang === 'ar' ? 'type-display-ar' : 'type-display-l'}>{t(text.titleKey)}</h3>
          <p className="type-body brief-story">{t(text.storyKey)}</p>
          <Illustration id="p2" src="img/art/art-p2-angola-drought-v1.webp" alt={t(text.titleKey)} className="brief-scenario-art" />
          {text.stub && <p className="type-small brief-stub">{t('brief.story_stub')}</p>}
          <ul className="brief-reqs">
            {reqs.map((r) => (
              <li key={r.id} className="brief-req">
                <span className="type-label">{t(`req.${r.id}`)}</span>
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
          <Illustration id="p1" src="img/art/art-p1-title-hero-v1.webp" alt={t('brief.kicker')} />
        </div>
      </div>

      {/* Sun Stripe always visible without scrolling */}
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

      {/* Big Start Mission CTA */}
      <div className="brief-start-cta">
        <Button className="brief-start-btn" onClick={() => setScreen('Build')}>
          <span className="type-display-l">{t('brief.start_mission')}</span>
        </Button>
      </div>

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
