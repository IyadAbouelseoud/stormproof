import React, { useState } from 'react';
import type { SimResult } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { decodeMission } from '../engineAdapter';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { CHALLENGES, challengeMet, useChallenge } from '../challenges';
import { CheckMark } from './components';
import { MissionEmblem } from './MissionEmblem';
import { Stars, starsFor } from './Cadet';

/** H7: three quests on the Brief (Angola only). Each card loads its starting design and goes to Build. */
export function ChallengeCards(): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const scenarioId = useMission((s) => s.design.scenarioId);
  const loadDesign = useMission((s) => s.loadDesign);
  const setScreen = useNavigation((s) => s.setScreen);
  const { active, setActive } = useChallenge();
  const [msg, setMsg] = useState('');
  if (scenarioId !== 'angola') return null;
  return (
    <section className="challenges" aria-labelledby="chal-h">
      <h3 id="chal-h" className="type-label section-label">{t('challenge.title')}</h3>
      <ul className="challenge-list">
        {CHALLENGES.map((c) => (
          <li key={c.id} className={`challenge-card ${active === c.id ? 'challenge-card--on' : ''}`} data-challenge={c.id}>
            <p className="type-body challenge-name">{c.title[lang]}</p>
            <p className="type-small">{c.text[lang]}</p>
            <button
              type="button"
              className="sp-btn sp-btn--secondary"
              onClick={() => {
                const d = decodeMission(c.start);
                if (!d) return;
                loadDesign({ ...d, mode: 'truth' });
                setActive(c.id);
                setMsg(t('challenge.loaded', { title: c.title[lang] }));
                setScreen('Build');
              }}
            >
              {t('challenge.try')}
            </button>
          </li>
        ))}
      </ul>
      <p className="pd-sr" role="status">{msg}</p>
    </section>
  );
}

/** H7 status on the Report for the active challenge. */
export function ChallengeStatus({ r }: { r: SimResult }): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const active = useChallenge((s) => s.active);
  const c = CHALLENGES.find((x) => x.id === active);
  if (!c || r.design.scenarioId !== 'angola') return null;
  const ok = challengeMet(c, r);
  return (
    <p className={`type-body challenge-status challenge-status--${ok ? 'ok' : 'no'}`} data-testid="challenge-status">
      <strong>{t('challenge.active', { title: c.title[lang] })}</strong> {ok ? <CheckMark /> : null} {ok ? t('challenge.done') : t('challenge.not_yet')}
    </p>
  );
}

/** H8 mission patch: the emblem, score and stars, ready to screenshot or share with the mission code below it. */
export function MissionPatch({ r, name }: { r: SimResult; name: string }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <figure className="mission-patch" role="img" aria-label={t('patch.label', { name, score: r.score.total, stars: starsFor(r.score.total) })}>
      <MissionEmblem size={96} />
      <figcaption className="mission-patch-text" aria-hidden="true">
        <span className="type-label">{t('patch.title')}</span>
        <span className="type-body mission-patch-name">{name}</span>
        <span className="type-data-l">{r.score.total}<span className="type-small">/100</span></span>
        <Stars score={r.score.total} />
      </figcaption>
    </figure>
  );
}
