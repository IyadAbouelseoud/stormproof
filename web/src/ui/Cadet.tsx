import React, { useEffect, useId, useRef, useState } from 'react';
import { useI18n, useMode, type Mode } from '../i18n';

/** H1: Cadet / Engineer switch, next to the language toggle. Same physics and targets in both. */
export function ModeToggle(): React.JSX.Element {
  const { t, mode } = useI18n();
  const setMode = useMode((s) => s.setMode);
  const modes: Mode[] = ['cadet', 'engineer'];
  return (
    <div className="mode-toggle" role="group" aria-label={t('mode.label')} title={t('mode.hint')}>
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          className={`mode-toggle-btn type-label ${mode === m ? 'mode-toggle-btn--on' : ''}`}
          aria-pressed={mode === m}
          data-mode={m}
          onClick={() => setMode(m)}
        >
          {t(`mode.${m}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * H1 jargon help: a small "?" button that opens a 1-2 sentence popover (`term.<id>.t` / `term.<id>.d`).
 * Click or Enter/Space opens; Esc or the close button closes and returns focus; a click outside closes.
 * Never hover-only. Must not be placed inside another button.
 */
export function Term({ id }: { id: string }): React.JSX.Element {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const pid = `term-${useId().replace(/:/g, '')}`;
  const title = t(`term.${id}.t`);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node | null;
      if (el && (pop.current?.contains(el) || btn.current?.contains(el))) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <span className="term">
      <button
        ref={btn}
        type="button"
        className="term-btn"
        aria-expanded={open}
        aria-controls={pid}
        aria-label={t('term.open', { term: title })}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ?
      </button>
      {open && (
        <span ref={pop} id={pid} className="term-pop" role="note">
          <span className="type-label term-pop-title">{title}</span>
          <span className="type-small term-pop-text">{t(`term.${id}.d`)}</span>
          <button
            type="button"
            className="term-pop-close type-label"
            onClick={() => {
              setOpen(false);
              btn.current?.focus();
            }}
          >
            {t('term.close')}
          </button>
        </span>
      )}
    </span>
  );
}

/** Stars from the score (bands 60 / 80 / 95, game-balanced). */
export const STAR_BANDS = [60, 80, 95] as const;
export const starsFor = (score: number): number => STAR_BANDS.filter((b) => score >= b).length;

export function Stars({ score }: { score: number }): React.JSX.Element {
  const { t } = useI18n();
  const n = starsFor(score);
  return (
    <span className="stars" role="img" aria-label={t('tracker.stars', { n })} title={t('tracker.stars_note')}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={`star ${i < n ? 'star--on' : ''}`}>
          <polygon points="8,1 10,6 15,6.2 11,9.4 12.4,14.6 8,11.6 3.6,14.6 5,9.4 1,6.2 6,6" />
        </svg>
      ))}
    </span>
  );
}
