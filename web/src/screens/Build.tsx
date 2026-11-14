import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormFactor, PartSlot } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtSigned, reducedMotion } from '../format';
import { partName } from '../content';
import { useMission } from '../store';
import { GAUGE_ORDER, PART_SLOTS, knockOnTrail, partById, partsFor } from '../engineAdapter';
import { Button, Gauge, PartCard, SlotIcon, unitText } from '../ui/components';
import { PartDetail } from '../ui/PartDetail';
import { playPartSnap } from '../sound';
import { CameraTrade } from '../ui/Jeddah';
import { ScreenFrame } from './ScreenFrame';

const FRAMES: FormFactor[] = ['1U', '3U', '6U'];

/** Where each subsystem sits on art-p5 (percent of the image); panels appear twice. */
const HOTSPOTS: Record<string, { x: number; y: number }[]> = {
  camera: [{ x: 20.8, y: 64.4 }],
  panels: [{ x: 23.6, y: 34.4 }, { x: 85, y: 69.4 }],
  battery: [{ x: 81.6, y: 31.1 }],
  radio: [{ x: 64.8, y: 15.6 }],
  computer: [{ x: 72, y: 65.6 }],
  pointing: [{ x: 50.1, y: 18.9 }],
  fuel: [{ x: 43.4, y: 80.6 }],
};
const SLOT_IDS = ['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel'];

function useSheet(): boolean {
  const q = '(max-width: 600px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function ExplodedDiagram(): React.JSX.Element {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const sheet = useSheet();
  const active = hover ?? pinned;
  const part = active ? partById(design.parts[active as keyof typeof design.parts] as string) : undefined;
  const spots = (active ? HOTSPOTS[active] : undefined) ?? [];
  const nameOf = (id: string): string => {
    const p = partById(design.parts[id as keyof typeof design.parts] as string);
    return p ? partName(p.id, lang, p.name) : '';
  };

  const close = useCallback(() => {
    setPinned(null);
    setHover(null);
    const el = opener.current;
    opener.current = null;
    if (el && el.isConnected) requestAnimationFrame(() => el.focus());
  }, []);
  const open = (id: string, el: HTMLElement) => {
    if (pinned === id) {
      close();
      return;
    }
    opener.current = el;
    setPinned(id);
  };

  // Esc closes; a pointer-down outside the panel and the hotspots/chips closes (the sheet has its own backdrop).
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest('.pd, .xd-spot, .exploded-chip')) return;
      setPinned(null);
      setHover(null);
      opener.current = null;
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [pinned, close]);

  const hotspotProps = (id: string) => ({
    'aria-expanded': pinned === id,
    onMouseEnter: () => setHover(id),
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onClick: (e: React.MouseEvent<HTMLElement>) => open(id, e.currentTarget),
  });

  const panel = pinned ? <PartDetail slot={pinned as PartSlot} sheet={sheet} onClose={close} /> : null;

  return (
    <section className="build-exploded" aria-labelledby="exploded-h">
      <div className="build-exploded-header">
        <h3 id="exploded-h" className="type-label section-label">{t('build.exploded_title')}</h3>
        <p className="type-small build-exploded-hint">{t('build.exploded_hint')}</p>
      </div>
      <p className="pd-sr" role="status" aria-live="polite">
        {pinned ? t('pd.announce', { slot: t(`slot.${pinned}`), part: nameOf(pinned) }) : ''}
      </p>
      <div className={`build-exploded-media`}>
        <div className="art-frame xd-frame" dir="ltr" onMouseLeave={() => setHover(null)}>
          <img src={`${import.meta.env.BASE_URL}img/art/art-p5-6u-exploded-v1.webp`} alt={t('build.exploded_title')} loading="lazy" className="xd-img" />
          <svg className={`xd-dim ${active ? 'xd-dim--on' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <mask id="xd-mask">
                <rect width="100" height="100" fill="white" />
                {spots.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r="11" fill="black" />)}
              </mask>
            </defs>
            <rect width="100" height="100" className="xd-dim-fill" mask="url(#xd-mask)" />
            {spots.map((h, i) => <circle key={`r${i}`} cx={h.x} cy={h.y} r="11" className="xd-ring" data-slot={active ?? undefined} />)}
          </svg>
          {SLOT_IDS.flatMap((id) =>
            (HOTSPOTS[id] ?? []).map((h, i) => (
              <button
                key={`${id}${i}`}
                type="button"
                className={`xd-spot ${active === id ? 'xd-spot--on' : ''}`}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                data-slot={id}
                aria-label={t('pd.spot', { slot: t(`slot.${id}`), part: nameOf(id) })}
                {...hotspotProps(id)}
              >
                <span className="xd-dot" />
              </button>
            )),
          )}
          <span className="sp-si-tag type-label">SI-generated</span>
        </div>
        <div className="xd-side">
          <ul className="build-exploded-chips" aria-label={t('build.exploded_title')}>
            {SLOT_IDS.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className={`exploded-chip type-body-l ${active === id ? 'exploded-chip--active' : ''}`}
                  data-slot={id}
                  {...hotspotProps(id)}
                >
                  <SlotIcon slot={id} />
                  <span>{t(`slot.${id}`)}</span>
                </button>
              </li>
            ))}
          </ul>
          {pinned && !sheet ? (
            panel
          ) : (
            <div className="xd-card" aria-live="polite">
              {active && part ? (
                <>
                  <p className="type-label xd-card-slot"><SlotIcon slot={active} /> {t(`slot.${active}`)}</p>
                  <p className="type-heading">{partName(part.id, lang, part.name)}</p>
                  <p className="type-small">{t(`slot.${active}.does`)}</p>
                  <p className="type-small xd-card-nums">{t('pd.click_hint')}</p>
                </>
              ) : (
                <p className="type-small">{t('build.exploded_empty')}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {pinned && sheet
        ? createPortal(
            <>
              <div className="pd-backdrop" onClick={close} aria-hidden="true" />
              {panel}
            </>,
            document.body,
          )
        : null}
    </section>
  );
}

/** Six gauges plus the knock-on trail (built only from the gauge deltas of two results). */
export function GaugeRow(): React.JSX.Element {
  const { t, lang } = useI18n();
  const result = useMission((s) => s.result);
  const prev = useMission((s) => s.prevResult);
  const lastChange = useMission((s) => s.lastChange);
  const trail = prev ? knockOnTrail(prev, result) : [];
  const changed = trail.map((s) => s.gauge);
  // re-key changed gauges so their animation restarts on every change
  const [tick, setTick] = useState(0);
  const last = useRef(result);
  useEffect(() => {
    if (last.current !== result) {
      last.current = result;
      setTick((n) => n + 1);
    }
  }, [result]);
  const animate = !reducedMotion();

  return (
    <section className="gauge-panel" aria-label={t('gauges.title')}>
      <div className="gauge-row">
        {GAUGE_ORDER.map((id) => (
          <Gauge
            key={id}
            gauge={result.gauges[id]}
            changedIndex={animate ? changed.indexOf(id) : -1}
            animKey={changed.includes(id) ? tick : 0}
          />
        ))}
      </div>
      <p className="trail type-data" aria-live="polite">
        {trail.length === 0 || !lastChange ? (
          <span className="trail-empty type-small">{t('trail.empty')}</span>
        ) : (
          <>
            <span className="trail-step" style={{ '--i': 0 } as React.CSSProperties}>{t(lastChange === 'formFactor' ? 'build.frame' : `slot.${lastChange}`)}</span>
            {trail.map((s, idx) => (
              <span key={s.gauge} className="trail-step" style={{ '--i': idx + 1 } as React.CSSProperties}>
                <span className="trail-arrow" aria-hidden="true">
                  {' → '}
                </span>
                {t(`gauge.${s.gauge}`)} {fmtSigned(lang, s.delta)} {unitText(t, s.unit)}
              </span>
            ))}
          </>
        )}
      </p>
    </section>
  );
}

export function Build(): React.JSX.Element {
  const { t } = useI18n();
  const design = useMission((s) => s.design);
  const setPart = useMission((s) => s.setPart);
  const setFormFactor = useMission((s) => s.setFormFactor);
  const event = useMission((s) => s.result.eventReplay !== undefined);

  return (
    <ScreenFrame id="Build">
      <GaugeRow />
      <ExplodedDiagram />
      <section className="build-frame" aria-labelledby="frame-h">
        <h3 id="frame-h" className="type-label section-label">
          {t('build.frame')}
        </h3>
        <div className="btn-row" role="group" aria-labelledby="frame-h">
          {FRAMES.map((f) => (
            <Button key={f} variant="secondary" pressed={design.formFactor === f} onClick={() => setFormFactor(f)}>
              <span className="type-data">{f}</span>
            </Button>
          ))}
        </div>
      </section>
      {PART_SLOTS.map((slot) => (
        <section key={slot} className="part-group" aria-labelledby={`slot-${slot}`}>
          <h3 id={`slot-${slot}`} className="type-label section-label slot-heading">
            <SlotIcon slot={slot} />
            <span>{t(`slot.${slot}`)}</span>
          </h3>
          {slot === 'camera' && event && <CameraTrade />}
          <div className="part-grid">
            {partsFor(slot, design.scenarioId).map((p) => (
              <PartCard
                key={p.id}
                part={p}
                selected={design.parts[slot] === p.id}
                onSelect={() => {
                  playPartSnap();
                  setPart(slot, p.id);
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </ScreenFrame>
  );
}
