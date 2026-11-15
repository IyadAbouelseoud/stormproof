import React, { useState } from 'react';
import { useI18n } from '../i18n';
import type { ScreenId } from '../navigation';

/** H6 first-run tips (Cadet only): one per screen, 4 in all. "Skip tips" hides them for good (localStorage, guarded). */
const STEPS: Partial<Record<ScreenId, string>> = { Brief: 'brief', Build: 'build', Orbit: 'orbit', Launch: 'launch' };
const ORDER = ['brief', 'build', 'orbit', 'launch'];
const KEY = 'sp-coach';

function readSeen(): { skip: boolean; seen: string[] } {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'skip') return { skip: true, seen: [] };
    const seen = v ? (JSON.parse(v) as string[]) : [];
    return { skip: false, seen: Array.isArray(seen) ? seen : [] };
  } catch {
    return { skip: false, seen: [] };
  }
}
function write(v: string): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: tips just show again next time */
  }
}

export function CoachMark({ screen }: { screen: ScreenId }): React.JSX.Element | null {
  const { t, cadet } = useI18n();
  const [state, setState] = useState(readSeen);
  const step = STEPS[screen];
  if (!cadet || !step || state.skip || state.seen.includes(step)) return null;
  const n = ORDER.indexOf(step) + 1;
  const done = () => {
    const seen = [...state.seen, step];
    write(JSON.stringify(seen));
    setState({ skip: false, seen });
  };
  const skip = () => {
    write('skip');
    setState({ skip: true, seen: state.seen });
  };
  return (
    <aside className="coach" role="note" aria-label={t('coach.step', { n, total: ORDER.length })} data-testid="coach">
      <p className="type-label coach-step">{t('coach.step', { n, total: ORDER.length })}</p>
      <p className="type-body coach-text">{t(`coach.${step}`)}</p>
      <div className="btn-row">
        <button type="button" className="sp-btn sp-btn--secondary" onClick={done}>
          {t('coach.done')}
        </button>
        <button type="button" className="sp-btn sp-btn--quiet" onClick={skip}>
          {t('coach.skip')}
        </button>
      </div>
    </aside>
  );
}
