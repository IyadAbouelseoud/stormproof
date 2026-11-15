import React, { useEffect, useRef, useState } from 'react';
import type { Requirement } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtCompact, fmtNum } from '../format';
import { useMission } from '../store';
import { useNavigation, type ScreenId } from '../navigation';
import couplingsJson from '../../../content/text/couplings.json';
import { CheckMark, CrossMark, ReqIcon, SlotIcon, unitText } from './components';
import { Stars, Term } from './Cadet';

interface Coupling {
  movers: string[];
  hint: { en: string; ar: string };
}
const COUPLINGS = (couplingsJson as unknown as { couplings: Record<string, Coupling> }).couplings;

const SLOTS = new Set(['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel']);

/** Where a mover lives: screen + element id to scroll to. */
function targetOf(mover: string): { screen: ScreenId; el: string } {
  if (SLOTS.has(mover)) return { screen: 'Build', el: `slot-${mover}` };
  if (mover === 'formFactor') return { screen: 'Build', el: 'frame-h' };
  if (mover === 'altitude' || mover === 'orbit') return { screen: 'Orbit', el: mover === 'altitude' ? 'alt-h' : 'otype-h' };
  return { screen: 'Launch', el: mover === 'rocket' ? 'rocket-h' : 'date-h' };
}

export function reqValueText(lang: 'en' | 'ar', q: Requirement, t: (k: string) => string): string {
  if (q.id === 'event-look' && q.value < 0) return t('req.none');
  if (q.unit === 'USD') return fmtCompact(lang, q.value);
  return fmtNum(lang, q.value, 1);
}

/** Jump to a part slot or setting (another screen if needed), then scroll it into view. */
export function goToMover(mover: string, setScreen: (s: ScreenId) => void, current: ScreenId): void {
  const { screen, el } = targetOf(mover);
  if (screen !== current) setScreen(screen);
  window.setTimeout(() => {
    // Build: the equipment bay shows one slot at a time; ask it to open this one, then bring the bay into view.
    if (SLOTS.has(mover)) window.dispatchEvent(new CustomEvent('sp-slot', { detail: mover }));
    const node = SLOTS.has(mover) ? document.querySelector('.bay') : document.getElementById(el);
    node?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, screen !== current ? 160 : 0);
}

/**
 * H2: the scenario's requirements as live chips (value vs target, met or missed), the projected score
 * and 0-3 stars. Values are the live truth-mode SimResult of the current design (the same run the Report shows).
 */
export function ReqTracker(): React.JSX.Element {
  const { t, lang } = useI18n();
  const result = useMission((s) => s.result);
  const current = useNavigation((s) => s.currentScreen);
  const setScreen = useNavigation((s) => s.setScreen);
  const [open, setOpen] = useState<string | null>(null);
  const reqs = result.score.requirements;
  const missed = reqs.filter((q) => !q.met).length;
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest('.tracker-pop, .tracker-chip')) return;
      setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const openReq = reqs.find((q) => q.id === open);
  const coupling = open ? COUPLINGS[open] : undefined;

  return (
    <section className="tracker" aria-labelledby="tracker-h" data-testid="req-tracker">
      <div className="tracker-head">
        <h3 id="tracker-h" className="type-label section-label">
          {t('tracker.title')}
        </h3>
        <span className="type-small tracker-sum" aria-live="polite">
          {missed === 0 ? t('tracker.all_met') : t('tracker.n_missed', { n: missed })}
        </span>
        <span className="tracker-score">
          <span className="type-label">{t('tracker.projected')}</span>
          <span className="type-data tracker-score-n" data-testid="projected-score">
            {result.score.total}
          </span>
          <span className="type-small">/100</span>
          <Stars score={result.score.total} />
        </span>
      </div>
      <ul className="tracker-chips">
        {reqs.map((q) => {
          const label = t(`req.${q.id}`);
          const value = reqValueText(lang, q, t);
          const target = q.unit === 'USD' ? fmtCompact(lang, q.target) : fmtNum(lang, q.target, 1);
          const unit = unitText(t, q.unit);
          return (
            <li key={q.id}>
              <button
                type="button"
                className={`tracker-chip tracker-chip--${q.met ? 'ok' : 'fail'}`}
                data-req={q.id}
                aria-expanded={open === q.id}
                aria-controls="tracker-pop"
                aria-label={t('tracker.chip', { label, value: `${value} ${unit}`, target: `${q.sense === 'max' ? '≤' : '≥'} ${target} ${unit}`, state: q.met ? t('tracker.met') : t('tracker.missed') })}
                onClick={() => setOpen(open === q.id ? null : q.id)}
              >
                <ReqIcon id={q.id} />
                <span className="type-small tracker-chip-label">{label}</span>
                <span className="type-data tracker-chip-val">
                  {value} <span className="tracker-chip-target">/ {target}</span> <span className="sp-unit">{unit}</span>
                </span>
                <span className="tracker-chip-mark" aria-hidden="true">
                  {q.met ? <CheckMark /> : <CrossMark />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {openReq && coupling && (
        <div id="tracker-pop" className="tracker-pop" ref={popRef} role="region" aria-label={t(`req.${openReq.id}`)}>
          <p className="type-small tracker-pop-hint">
            {coupling.hint[lang]} {openReq.id === 'revisit' && <Term id="revisit" />}
          </p>
          <p className="type-label">{t('tracker.moves')}</p>
          <ul className="tracker-movers">
            {coupling.movers.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  className="sp-btn sp-btn--secondary tracker-mover"
                  data-mover={m}
                  onClick={() => {
                    setOpen(null);
                    goToMover(m, setScreen, current);
                  }}
                >
                  {SLOTS.has(m) && <SlotIcon slot={m} />}
                  <span>{t('tracker.go', { what: SLOTS.has(m) ? t(`slot.${m}`) : t(`move.${m}`) })}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="term-pop-close type-label" onClick={() => setOpen(null)}>
            {t('tracker.close')}
          </button>
        </div>
      )}
    </section>
  );
}
