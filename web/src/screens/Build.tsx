import React, { useEffect, useRef, useState } from 'react';
import type { FormFactor } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtSigned, reducedMotion } from '../format';
import { useMission } from '../store';
import { GAUGE_ORDER, PART_SLOTS, knockOnTrail, partsFor } from '../engineAdapter';
import { Button, Gauge, PartCard, unitText } from '../ui/components';
import { CameraTrade } from '../ui/Jeddah';
import { ScreenFrame } from './ScreenFrame';

const FRAMES: FormFactor[] = ['1U', '3U', '6U'];

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
  const event = useMission((s) => s.result.eventReplay !== undefined);

  return (
    <ScreenFrame id="Build">
      <GaugeRow />
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
          <h3 id={`slot-${slot}`} className="type-label section-label">
            {t(`slot.${slot}`)}
          </h3>
          {slot === 'camera' && event && <CameraTrade />}
          <div className="part-grid">
            {partsFor(slot, design.scenarioId).map((p) => (
              <PartCard key={p.id} part={p} selected={design.parts[slot] === p.id} onSelect={() => setPart(slot, p.id)} />
            ))}
          </div>
        </section>
      ))}
    </ScreenFrame>
  );
}
