import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormFactor, Part, PartSlot } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum, fmtSigned, reducedMotion } from '../format';
import { partName } from '../content';
import { useMission } from '../store';
import { GAUGE_ORDER, PART_SLOTS, knockOnTrail, mbPerPass, panelGenW, partById, partsFor, simulate } from '../engineAdapter';
import { Button, Gauge, PartThumb, SlotIcon, SrcTag, unitText } from '../ui/components';
import { PartDetail } from '../ui/PartDetail';
import { playPartSnap } from '../sound';
import { CameraTrade } from '../ui/Jeddah';
import { ReqTracker } from '../ui/ReqTracker';
import { Term } from '../ui/Cadet';
import couplingsJson from '../../../content/text/couplings.json';
import { ScreenFrame } from './ScreenFrame';

const FRAMES: FormFactor[] = ['1U', '3U', '6U'];
/** H1 jargon help next to each slot. */
const SLOT_TERMS: Record<string, string[]> = { camera: ['gsd', 'swath'], radio: ['downlink'], pointing: ['offnadir'], fuel: ['dv'] };
const MOVERS = (couplingsJson as unknown as { couplings: Record<string, { movers: string[] }> }).couplings;

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

/** Key stats of a part for its card: [label key, value, unit]. Cadet shows the radio as MB per pass. */
function cardStats(p: Part, cadet: boolean, design: ReturnType<typeof useMission.getState>['design']): [string, number, string][] {
  const out: [string, number, string][] = [];
  const add = (label: string, v: number | undefined, unit: string) => {
    if (typeof v === 'number') out.push([label, v, unit]);
  };
  add('part.mass', p.massKg, 'kg');
  if (p.powerW > 0) add('part.power', p.powerW, 'W');
  add('part.cost', p.costUsd, 'USD');
  add('part.gsd', p.gsdAt500M, 'm');
  add('part.swath', p.swathAt500Km, 'km');
  if (p.effectiveAreaM2 !== undefined) add('part.makes', Math.round(panelGenW(p, design.orbit.altitudeKm) * 10) / 10, 'W');
  add('part.capacity', p.capacityWh, 'Wh');
  if (p.downlinkMbps !== undefined) {
    if (cadet) add('part.per_pass', Math.round(mbPerPass(p, design) * 10) / 10, 'MB/pass');
    else add('part.downlink', p.downlinkMbps, 'Mbps');
  }
  add('part.storage', p.storageMB, 'MB');
  add('part.offnadir', p.offNadirFactor, 'x');
  add('part.dv', p.deltaVMs, 'm/s');
  return out;
}

/** Compact live gauges for the bay (the full dials sit below it). Flash when a value changes. */
function MiniGauges(): React.JSX.Element {
  const { t, lang } = useI18n();
  const result = useMission((s) => s.result);
  const prev = useMission((s) => s.prevResult);
  const changed = new Set(prev ? knockOnTrail(prev, result).map((s) => s.gauge) : []);
  return (
    <ul className="mini-gauges" aria-label={t('gauges.title')}>
      {GAUGE_ORDER.map((id) => {
        const g = result.gauges[id];
        const v = Math.abs(g.value) >= 10000 ? `${fmtNum(lang, g.value / 1e6, 2)}M` : fmtNum(lang, g.value);
        return (
          <li key={`${id}-${g.value}`} className={`mini-gauge mini-gauge--${g.state} ${changed.has(id) && !reducedMotion() ? 'mini-gauge--flash' : ''}`}>
            <span className="type-label mini-gauge-name">{t(`gauge.${id}`)}</span>
            <span className="type-data mini-gauge-val">
              {v} <span className="sp-unit">{unitText(t, g.unit)}</span>
            </span>
            <span className="mini-gauge-bar" aria-hidden="true">
              <span style={{ '--fill': Math.max(0, Math.min(1, g.limit > 0 ? g.value / g.limit : 0)) } as React.CSSProperties} />
            </span>
            <span className="pd-sr">{t(`state.${g.state}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One option in the bay: picture, stats, what equipping it would change (engine run), Equip and Inspect. */
function BenchCard({ part, slot, equipped, onEquip, onInspect, flash }: { part: Part; slot: PartSlot; equipped: boolean; onEquip: () => void; onInspect: () => void; flash: boolean }): React.JSX.Element {
  const { t, lang, cadet } = useI18n();
  const design = useMission((s) => s.design);
  const result = useMission((s) => s.result);
  const name = partName(part.id, lang, part.name);
  const preview = useMemo(() => {
    if (equipped) return null;
    const r = simulate({ ...design, mode: 'truth', parts: { ...design.parts, [slot]: part.id } });
    const gauges = knockOnTrail(result, r).map((s) => ({ ...s, state: r.gauges[s.gauge].state }));
    const goals = r.score.requirements
      .map((q) => ({ q, before: result.score.requirements.find((x) => x.id === q.id)?.met ?? q.met }))
      .filter((x) => x.before !== x.q.met)
      .map((x) => ({ id: x.q.id, fixes: x.q.met }));
    return { gauges, goals, score: r.score.total - result.score.total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, result, slot, part.id, equipped]);
  const stats = cardStats(part, cadet, design);
  return (
    <article className={`bench-card ${equipped ? 'bench-card--on' : ''} ${flash ? 'bench-card--pop' : ''}`} data-slot={slot}>
      <button
        type="button"
        className={`sp-part bench-equip ${equipped ? 'sp-part--selected' : ''}`}
        data-part={part.id}
        aria-pressed={equipped}
        aria-label={equipped ? `${name}: ${t('bench.equipped')}` : t('bench.equip', { part: name })}
        onClick={onEquip}
      />
      <div className="bench-card-top">
        <PartThumb id={part.id} />
        <div className="bench-card-head">
          <p className="type-body bench-card-name">{name}</p>
          {equipped ? (
            <span className="bench-badge type-label">{t('bench.equipped')}</span>
          ) : preview && preview.score !== 0 ? (
            <span className={`bench-score type-data ${preview.score > 0 ? 'bench-score--up' : 'bench-score--down'}`}>
              {fmtSigned(lang, preview.score, 0)} {t('bench.pts')}
            </span>
          ) : null}
          {part.cameraType === 'radar' && <span className="sp-src-tag sp-src-tag--gb type-label">{t('tag.design_study_not_6u')}</span>}
        </div>
      </div>
      <dl className="bench-stats">
        {stats.map(([label, v, unit]) => (
          <div key={label} className="bench-stat">
            <dt className="type-small">{t(label)}</dt>
            <dd className="type-data">
              {fmtNum(lang, v, 4)} <span className="sp-unit">{unitText(t, unit)}</span>
            </dd>
          </div>
        ))}
      </dl>
      {preview && (
        <div className="bench-preview">
          <p className="type-label">{t('bench.if_equip')}</p>
          <ul className="bench-chips">
            {preview.goals.map((g) => (
              <li key={g.id} className={`bench-chip bench-chip--${g.fixes ? 'ok' : 'fail'}`}>
                {t(g.fixes ? 'bench.fixes' : 'bench.breaks', { goal: t(`req.${g.id}`) })}
              </li>
            ))}
            {preview.gauges.slice(0, 4).map((c) => (
              <li key={c.gauge} className={`bench-chip bench-chip--${c.state === 'ok' ? 'plain' : c.state}`}>
                {t(`gauge.${c.gauge}`)} {fmtSigned(lang, c.delta, 2)} {unitText(t, c.unit)}
              </li>
            ))}
            {preview.goals.length === 0 && preview.gauges.length === 0 && <li className="bench-chip bench-chip--plain">{t('bench.no_change')}</li>}
          </ul>
        </div>
      )}
      <button type="button" className="bench-inspect type-label" onClick={onInspect} aria-label={t('bench.inspect_part', { part: name })}>
        {t('bench.inspect')}
      </button>
    </article>
  );
}

/**
 * Build "equipment bay": the satellite map and the active slot's options side by side, sized to fit one screen.
 * Tap a dot or a tab to pick a slot; equip an option (snap + flash); "Inspect" opens the Part lab.
 */
function Bay(): React.JSX.Element {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const result = useMission((s) => s.result);
  const setPart = useMission((s) => s.setPart);
  const setFormFactor = useMission((s) => s.setFormFactor);
  const event = result.eventReplay !== undefined;
  const [slot, setSlot] = useState<PartSlot>('camera');
  const [hover, setHover] = useState<PartSlot | null>(null);
  const [inspect, setInspect] = useState<PartSlot | null>(null);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const sheet = useSheet();
  const opener = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const shown = hover ?? slot;
  const spots = HOTSPOTS[shown] ?? [];

  // Slots that can fix a goal the design misses (content/text/couplings.json): a dot on the tab.
  const hot = useMemo(() => {
    const s = new Set<string>();
    for (const q of result.score.requirements) if (!q.met) for (const m of MOVERS[q.id]?.movers ?? []) s.add(m);
    return s;
  }, [result]);

  // The goal tracker's "go to" buttons ask for a slot.
  useEffect(() => {
    const on = (e: Event) => {
      const s = (e as CustomEvent<string>).detail as PartSlot;
      if (PART_SLOTS.includes(s)) {
        setSlot(s);
        setInspect(null);
      }
    };
    window.addEventListener('sp-slot', on);
    return () => window.removeEventListener('sp-slot', on);
  }, []);

  const closeInspect = useCallback(() => {
    setInspect(null);
    const el = opener.current;
    opener.current = null;
    if (el && el.isConnected) requestAnimationFrame(() => el.focus());
  }, []);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeInspect();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inspect, closeInspect]);

  const pick = (s: PartSlot) => {
    setSlot(s);
    setInspect(null);
  };
  const equip = (p: Part) => {
    if (design.parts[slot] === p.id) return;
    playPartSnap();
    setPart(slot, p.id);
    setFlash({ id: p.id, n: (flash?.n ?? 0) + 1 });
  };
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = PART_SLOTS.indexOf(slot);
    const rtl = document.documentElement.dir === 'rtl';
    const step = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    let n = -1;
    if (step) n = (i + step + PART_SLOTS.length) % PART_SLOTS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = PART_SLOTS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    const s = PART_SLOTS[n]!;
    pick(s);
    tabRefs.current[s]?.focus();
  };

  const options = partsFor(slot, design.scenarioId);
  const gb = options.some((p) => p.src.startsWith('game-balanced'));
  const detail = inspect ? <PartDetail slot={inspect} sheet={sheet} onClose={closeInspect} /> : null;
  const equippedName = (s: string) => {
    const p = partById(design.parts[s as PartSlot]);
    return p ? partName(p.id, lang, p.name) : '';
  };

  return (
    <section className="bay" aria-labelledby="bay-h">
      <div className="bay-head">
        <h3 id="bay-h" className="type-label section-label">{t('bench.title')}</h3>
        <MiniGauges />
      </div>
      <div className="bay-grid">
        <div className="bay-map">
          <div className="art-frame xd-frame" dir="ltr" onMouseLeave={() => setHover(null)}>
            <img src={`${import.meta.env.BASE_URL}img/art/art-p5-6u-exploded-v1.webp`} alt={t('build.exploded_title')} loading="lazy" decoding="async" className="xd-img" />
            <svg className="xd-dim xd-dim--on" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <mask id="xd-mask">
                  <rect width="100" height="100" fill="white" />
                  {spots.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r="11" fill="black" />)}
                </mask>
              </defs>
              <rect width="100" height="100" className="xd-dim-fill" mask="url(#xd-mask)" />
              {spots.map((h, i) => (
                <circle key={`r${i}-${flash?.n ?? 0}`} cx={h.x} cy={h.y} r="11" className={`xd-ring ${flash && !reducedMotion() ? 'xd-ring--flash' : ''}`} />
              ))}
            </svg>
            {PART_SLOTS.flatMap((id) =>
              (HOTSPOTS[id] ?? []).map((h, i) => (
                <button
                  key={`${id}${i}`}
                  type="button"
                  className={`xd-spot ${shown === id ? 'xd-spot--on' : ''} ${hot.has(id) ? 'xd-spot--hot' : ''}`}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  data-slot={id}
                  aria-pressed={slot === id}
                  aria-label={t('pd.spot', { slot: t(`slot.${id}`), part: equippedName(id) })}
                  onMouseEnter={() => setHover(id)}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                  onClick={() => pick(id)}
                >
                  <span className="xd-dot" />
                </button>
              )),
            )}
            <span className="sp-si-tag type-label">{t('si.tag')}</span>
          </div>
          <div className="bay-frame" role="group" aria-labelledby="frame-h">
            <span id="frame-h" className="type-label">{t('build.frame')}</span>
            {FRAMES.map((f) => (
              <Button key={f} variant="secondary" pressed={design.formFactor === f} onClick={() => setFormFactor(f)}>
                <span className="type-data">{f}</span>
              </Button>
            ))}
          </div>
          <p className="type-small bay-hint">{t('bench.map_hint')}</p>
        </div>

        <div className="bay-side">
          <div className="bay-tabs" role="tablist" aria-label={t('build.exploded_title')} onKeyDown={onTabKey}>
            {PART_SLOTS.map((s) => (
              <button
                key={s}
                ref={(el) => {
                  tabRefs.current[s] = el;
                }}
                id={`slot-${s}`}
                type="button"
                role="tab"
                aria-selected={slot === s}
                aria-controls="bay-panel"
                tabIndex={slot === s ? 0 : -1}
                className={`bay-tab ${slot === s ? 'bay-tab--on' : ''}`}
                data-slot={s}
                onClick={() => pick(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(null)}
              >
                <SlotIcon slot={s} />
                <span className="type-small bay-tab-name">{t(`slot.${s}`)}</span>
                {hot.has(s) && (
                  <span className="bay-tab-dot" title={t('bench.hot')}>
                    <span className="pd-sr">{t('bench.hot')}</span>
                  </span>
                )}
              </button>
            ))}
          </div>

          <div id="bay-panel" role="tabpanel" aria-labelledby={`slot-${slot}`} className="bay-panel">
            {inspect && !sheet ? (
              <div className="bay-inspect">
                <button type="button" className="sp-btn sp-btn--quiet bay-back" onClick={closeInspect}>
                  {t('bench.back')}
                </button>
                {detail}
              </div>
            ) : (
              <>
                <div className="bay-slot-line">
                  <p className="type-small bay-does">
                    <SlotIcon slot={slot} /> {t(`slot.${slot}.does`)}
                  </p>
                  {(SLOT_TERMS[slot] ?? []).map((k) => <Term key={k} id={k} />)}
                  {gb && <SrcTag src="game-balanced" />}
                </div>
                {slot === 'camera' && event && <CameraTrade />}
                <div className="bay-cards">
                  {options.map((p) => (
                    <BenchCard
                      key={p.id}
                      part={p}
                      slot={slot}
                      equipped={design.parts[slot] === p.id}
                      flash={flash?.id === p.id && !reducedMotion()}
                      onEquip={() => equip(p)}
                      onInspect={() => {
                        opener.current = document.activeElement as HTMLElement | null;
                        setInspect(slot);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {inspect && sheet
        ? createPortal(
            <>
              <div className="pd-backdrop" onClick={closeInspect} aria-hidden="true" />
              {detail}
            </>,
            document.body,
          )
        : null}
      <p className="pd-sr" role="status" aria-live="polite">
        {t('pd.announce', { slot: t(`slot.${slot}`), part: equippedName(slot) })}
      </p>
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
    <section className="gauge-panel gauge-panel--static" aria-label={t('gauges.title')}>
      <div className="gauge-row">
        {GAUGE_ORDER.map((id) => (
          <Gauge key={id} gauge={result.gauges[id]} changedIndex={animate ? changed.indexOf(id) : -1} animKey={changed.includes(id) ? tick : 0} />
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
  return (
    <ScreenFrame id="Build">
      <div className="tracker-sticky">
        <ReqTracker />
      </div>
      <Bay />
      <GaugeRow />
    </ScreenFrame>
  );
}
