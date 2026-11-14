import React from 'react';
import { useI18n } from '../i18n';
import { GAUGE_ORDER, mockResult, partsFor, type SunMonth } from '../engineAdapter';
import { Button, CauseChain, Gauge, MissionTicket, PartCard, RoleChip, SiTag, VerdictStamp } from '../ui/components';
import { SunStripe } from '../ui/SunStripe';
import { ROLES } from '../store';

/** Static sample months for the gallery stripe (one per Sun Stripe step, then hatched forecast). */
const SAMPLE: SunMonth[] = [70, 95, 125, 160, 200, 240, 200, 160, 125, 95].map((f107, i) => ({
  month: `2026-${String(i + 1).padStart(2, '0')}`,
  f107,
  forecast: i >= 8,
}));

function Panel({ theme }: { theme: 'paper' | 'night' }): React.JSX.Element {
  const { t } = useI18n();
  const r = mockResult();
  const cam = partsFor('camera')[0];
  return (
    <section data-theme={theme} className="gallery-panel" aria-label={t(`gallery.${theme}`)}>
      <h3 className="type-heading">{t(`gallery.${theme}`)}</h3>
      <h4 className="type-label section-label">Button</h4>
      <div className="btn-row">
        <Button>{t('gallery.primary')}</Button>
        <Button variant="secondary">{t('gallery.secondary')}</Button>
        <Button variant="secondary" pressed>
          {t('gallery.pressed')}
        </Button>
        <Button variant="quiet">{t('gallery.quiet')}</Button>
        <Button disabled>{t('gallery.disabled')}</Button>
      </div>
      <h4 className="type-label section-label">Gauge</h4>
      <div className="gauge-row">
        {GAUGE_ORDER.map((id) => (
          <Gauge key={id} gauge={r.gauges[id]} />
        ))}
      </div>
      <h4 className="type-label section-label">PartCard</h4>
      <div className="part-grid">{cam && <PartCard part={cam} selected />}</div>
      <h4 className="type-label section-label">RoleChip</h4>
      <div className="btn-row">
        {ROLES.map((role, i) => (
          <RoleChip key={role} role={role} active={i === 0} />
        ))}
      </div>
      <h4 className="type-label section-label">VerdictStamp</h4>
      <div className="btn-row">
        <VerdictStamp state="ok" title={t('verdict.lived')} detail={t('verdict.sun_took', { n: r.planVsTruth.sunTookDays })} />
        <VerdictStamp state="fail" title={t('verdict.died')} detail={t('verdict.sun_took', { n: r.planVsTruth.sunTookDays })} />
        <VerdictStamp state="warn" size="s" title={t('fit.verdict.warn')} />
      </div>
      <h4 className="type-label section-label">MissionTicket</h4>
      <MissionTicket code={r.missionCode} />
      <h4 className="type-label section-label">SunStripe</h4>
      <SunStripe months={SAMPLE} value={4} label={t('gallery.sample_stripe')} />
      <h4 className="type-label section-label">CauseChain</h4>
      <CauseChain causes={r.causes} />
      <h4 className="type-label section-label">SI tag</h4>
      <div className="art-slot art-slot--small">
        <span className="type-label">{t('art.placeholder')}</span>
        <SiTag />
      </div>
    </section>
  );
}

export function Gallery(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <article className="gallery" aria-labelledby="gallery-h">
      <h2 id="gallery-h" className="type-heading">
        {t('gallery.title')}
      </h2>
      <p className="type-small">{t('gallery.note')}</p>
      <div className="gallery-split">
        <Panel theme="paper" />
        <Panel theme="night" />
      </div>
    </article>
  );
}
