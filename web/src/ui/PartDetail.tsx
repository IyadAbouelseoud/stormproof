import React, { useEffect, useMemo, useRef } from 'react';
import type { GaugeId, Part, PartSlot } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum, fmtSigned } from '../format';
import { partName } from '../content';
import { useMission } from '../store';
import { knockOnTrail, partById, partsFor, simulate } from '../engineAdapter';
import { playPartSnap } from '../sound';
import { SlotIcon, SrcTag, unitText } from './components';

interface Metric {
  key: string;
  label: string;
  unit: string;
  get: (p: Part) => number | undefined;
  /** Which direction is better; null = a trade-off, shown without a verdict. */
  better: 'lower' | 'higher' | null;
}

const num = (field: string) => (p: Part): number | undefined => {
  const v = (p as unknown as Record<string, unknown>)[field];
  return typeof v === 'number' ? v : undefined;
};

const BASE: Metric[] = [
  { key: 'mass', label: 'part.mass', unit: 'kg', get: (p) => p.massKg, better: 'lower' },
  { key: 'power', label: 'part.power', unit: 'W', get: (p) => p.powerW, better: 'lower' },
  { key: 'cost', label: 'part.cost', unit: 'USD', get: (p) => p.costUsd, better: 'lower' },
];

/** Slot-specific stats that exist on the catalog part (content/parts.json). */
const SLOT_STATS: Record<string, Metric[]> = {
  camera: [
    { key: 'gsd', label: 'part.gsd', unit: 'm', get: num('gsdAt500M'), better: 'lower' },
    { key: 'swath', label: 'part.swath', unit: 'km', get: num('swathAt500Km'), better: 'higher' },
    { key: 'data', label: 'part.data', unit: 'MB/day', get: num('dataMBPerDay'), better: null },
  ],
  panels: [{ key: 'area', label: 'part.area', unit: 'm2', get: num('effectiveAreaM2'), better: 'higher' }],
  battery: [{ key: 'cap', label: 'part.capacity', unit: 'Wh', get: num('capacityWh'), better: 'higher' }],
  radio: [{ key: 'dl', label: 'part.downlink', unit: 'Mbps', get: num('downlinkMbps'), better: 'higher' }],
  computer: [{ key: 'st', label: 'part.storage', unit: 'MB', get: num('storageMB'), better: 'higher' }],
  pointing: [{ key: 'nadir', label: 'part.offnadir', unit: 'x', get: num('offNadirFactor'), better: 'higher' }],
  fuel: [{ key: 'dv', label: 'part.dv', unit: 'm/s', get: num('deltaVMs'), better: 'higher' }],
};

const metricsFor = (slot: string): Metric[] => [...BASE, ...(SLOT_STATS[slot] ?? [])];

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface PartDetailProps {
  slot: PartSlot;
  sheet: boolean;
  onClose: () => void;
}

export function PartDetail({ slot, sheet, onClose }: PartDetailProps): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const result = useMission((s) => s.result);
  const setPart = useMission((s) => s.setPart);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  const current = partById(design.parts[slot]);
  const alts = partsFor(slot, design.scenarioId).filter((p) => p.id !== current?.id);

  // Live knock-on: the same simulate() the store uses (truth mode), one part swapped, diffed against the live result.
  const knock = useMemo(() => {
    const out = new Map<string, { gauge: GaugeId; before: number; after: number; unit: string; stateBefore: string; stateAfter: string }[]>();
    for (const a of alts) {
      const r = simulate({ ...design, mode: 'truth', parts: { ...design.parts, [slot]: a.id } });
      out.set(
        a.id,
        knockOnTrail(result, r).map((s) => ({
          gauge: s.gauge,
          before: result.gauges[s.gauge].value,
          after: r.gauges[s.gauge].value,
          unit: s.unit,
          stateBefore: result.gauges[s.gauge].state,
          stateAfter: r.gauges[s.gauge].state,
        })),
      );
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, result, slot]);

  // Move focus into the panel when it opens (or when the slot changes).
  useEffect(() => {
    titleRef.current?.focus();
  }, [slot]);

  // Bottom sheet: trap Tab inside the dialog.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !rootRef.current) return;
      const els = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (els.length === 0) return;
      const first = els[0]!;
      const last = els[els.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === titleRef.current || !rootRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !rootRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);

  if (!current) return null;
  const metrics = metricsFor(slot);
  const slotName = t(`slot.${slot}`);
  const name = partName(current.id, lang, current.name);

  const choose = (id: string) => {
    playPartSnap();
    setPart(slot, id);
    // the pressed button unmounts (that part becomes the current one): keep focus inside the panel
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const Wrapper = sheet ? 'div' : 'aside';
  return (
    <Wrapper
      ref={rootRef as React.Ref<HTMLDivElement & HTMLElement>}
      className={`pd ${sheet ? 'pd--sheet' : 'pd--card'}`}
      role={sheet ? 'dialog' : undefined}
      aria-modal={sheet ? true : undefined}
      aria-labelledby="pd-title"
      data-slot={slot}
    >
      <header className="pd-head">
        <div className="pd-head-main">
          <p className="type-label-l pd-kicker">
            <SlotIcon slot={slot} />
            <span>{t('pd.title')} · {slotName}</span>
          </p>
          <h4 id="pd-title" className="type-card-title pd-title" tabIndex={-1} ref={titleRef}>
            {name}
          </h4>
        </div>
        <button type="button" className="pd-close" onClick={onClose} aria-label={t('pd.close')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </header>

      <p className="type-body pd-does">
        <span className="pd-k type-label-l">{t('pd.does')}</span>
        {t(`slot.${slot}.does`)}
      </p>
      <p className="type-body pd-why">
        <span className="pd-k type-label-l">{t('pd.why')}</span>
        {t(`slot.${slot}.why`)}
      </p>

      <section aria-label={t('pd.numbers')}>
        <h5 className="type-label-l pd-h">{t('pd.numbers')}</h5>
        <dl className="pd-nums">
          {metrics.map((m) => {
            const v = m.get(current);
            if (v === undefined) return null;
            return (
              <div key={m.key} className="pd-num-row">
                <dt className="type-body">{t(m.label)}</dt>
                <dd className="pd-mono">
                  {fmtNum(lang, v, 4)} <span className="sp-unit">{unitText(t, m.unit)}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <div className="pd-source">
        <span className="type-label-l pd-k">{t('pd.source')}</span>
        <SrcTag src={current.src} />
        {!current.src.startsWith('game-balanced') && <span className="pd-mono pd-src-id">{current.src}</span>}
      </div>

      <section aria-label={t('pd.versus')}>
        <h5 className="type-label-l pd-h">{t('pd.versus')}</h5>
        {alts.length === 0 ? (
          <p className="type-body pd-empty">{t('pd.no_alts')}</p>
        ) : (
          <ul className="pd-alts">
            {alts.map((a) => {
              const aName = partName(a.id, lang, a.name);
              const kn = knock.get(a.id) ?? [];
              return (
                <li key={a.id} className="pd-alt">
                  <div className="pd-alt-head">
                    <p className="type-body pd-alt-name">{aName}</p>
                    <SrcTag src={a.src} />
                  </div>
                  <table className="pd-table">
                    <caption className="pd-sr">{t('pd.vs_current', { part: name })}</caption>
                    <tbody>
                      {metrics.map((m) => {
                        const av = m.get(a);
                        const cv = m.get(current);
                        if (av === undefined || cv === undefined) return null;
                        const d = av - cv;
                        const zero = Math.abs(d) < 1e-9;
                        const verdict = zero || m.better === null ? null : (d < 0) === (m.better === 'lower') ? 'better' : 'worse';
                        return (
                          <tr key={m.key}>
                            <th scope="row" className="type-body">{t(m.label)}</th>
                            <td className="pd-mono pd-diff">
                              {zero ? '0' : fmtSigned(lang, d, 4)} <span className="sp-unit">{unitText(t, m.unit)}</span>
                            </td>
                            <td className={`pd-verdict pd-verdict--${verdict ?? 'none'} type-body`}>
                              {verdict ? t(`pd.${verdict}`) : zero ? t('pd.same') : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="type-label-l pd-h">{t('pd.knock')}</p>
                  {kn.length === 0 ? (
                    <p className="type-body pd-empty">{t('pd.no_change')}</p>
                  ) : (
                    <ul className="pd-chips">
                      {kn.map((c) => (
                        <li key={c.gauge} className={`pd-chip pd-chip--${c.stateAfter}`}>
                          <span className="pd-chip-name type-body">{t(`gauge.${c.gauge}`)}</span>
                          <span className="pd-mono">
                            {fmtNum(lang, c.before, 2)} <span className="pd-arrow" aria-hidden="true">→</span>
                            <span className="pd-sr">{t('pd.to')}</span> {fmtNum(lang, c.after, 2)} <span className="sp-unit">{unitText(t, c.unit)}</span>
                          </span>
                          {c.stateBefore !== c.stateAfter && (
                            <span className="type-small pd-chip-state">{t(`state.${c.stateBefore}`)} → {t(`state.${c.stateAfter}`)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="sp-btn sp-btn--secondary pd-choose" onClick={() => choose(a.id)} aria-label={`${t('pd.choose')}: ${aName}`}>
                    {t('pd.choose')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Wrapper>
  );
}

