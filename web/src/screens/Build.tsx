import React, { useEffect, useRef, useState } from 'react';
import type { FormFactor } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtSigned, reducedMotion } from '../format';
import { useMission } from '../store';
import { GAUGE_ORDER, PART_SLOTS, knockOnTrail, partsFor } from '../engineAdapter';
import { Button, Gauge, PartCard, SlotIcon, unitText } from '../ui/components';
import { playPartSnap } from '../sound';
import { ScreenFrame } from './ScreenFrame';

const FRAMES: FormFactor[] = ['1U', '3U', '6U'];

function ExplodedDiagram(): React.JSX.Element {
  const { t } = useI18n();
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const subsystems = [
    { id: 'camera', label: 'camera' },
    { id: 'panels', label: 'panels' },
    { id: 'battery', label: 'battery' },
    { id: 'radio', label: 'radio' },
    { id: 'computer', label: 'computer' },
    { id: 'pointing', label: 'pointing' },
    { id: 'fuel', label: 'fuel' },
  ];

  return (
    <section className="build-exploded" aria-labelledby="exploded-h">
      <div className="build-exploded-header">
        <h3 id="exploded-h" className="type-label section-label">
          {t('build.exploded_title')}
        </h3>
        <p className="type-small build-exploded-hint">{t('build.exploded_hint')}</p>
      </div>
      <div className="build-exploded-media">
        <div className="art-frame aspect-16-9">
          <img
            src="img/art/art-p5-6u-exploded-v1.webp"
            alt={t('build.exploded_title')}
            loading="lazy"
            className="art-img"
          />
          <span className="sp-si-tag type-label">SI-generated</span>
        </div>
        <ul className="build-exploded-chips" aria-label={t('build.exploded_title')}>
          {subsystems.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`exploded-chip type-small ${activeSlot === s.id ? 'exploded-chip--active' : ''}`}
                onMouseEnter={() => setActiveSlot(s.id)}
                onMouseLeave={() => setActiveSlot(null)}
                onFocus={() => setActiveSlot(s.id)}
                onBlur={() => setActiveSlot(null)}
              >
                <SlotIcon slot={s.id} />
                <span>{t(`slot.${s.label}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
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
            <span className="trail-step">{t(lastChange === 'formFactor' ? 'build.frame' : `slot.${lastChange}`)}</span>
            {trail.map((s) => (
              <span key={s.gauge} className="trail-step">
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
          <div className="part-grid">
            {partsFor(slot).map((p) => (
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
