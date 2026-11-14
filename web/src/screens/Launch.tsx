import React from 'react';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum } from '../format';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { sunMonths, useEngineStatus } from '../engineAdapter';
import { Button } from '../ui/components';
import { SunStripe } from '../ui/SunStripe';
import { ScreenFrame } from './ScreenFrame';

export function PlanTruthNote(): React.JSX.Element {
  const { t, lang } = useI18n();
  const r = useMission((s) => s.result);
  const p = r.planVsTruth;
  const lb = (b: boolean) => (b ? t('common.at_least') + ' ' : '');
  return (
    <dl className="ptn">
      <div className="ptn-row">
        <dt className="type-label">{t('ptn.plan')}</dt>
        <dd className="type-data-l">
          {lb(p.planIsLowerBound)}
          {fmtNum(lang, p.planLifetimeDays)} <span className="type-data sp-unit">{t('unit.days')}</span>
        </dd>
      </div>
      <div className="ptn-row">
        <dt className="type-label">{t('ptn.truth')}</dt>
        <dd className="type-data-l">
          {lb(p.truthIsLowerBound)}
          {fmtNum(lang, p.truthLifetimeDays)} <span className="type-data sp-unit">{t('unit.days')}</span>
        </dd>
      </div>
      <div className="ptn-row ptn-row--sun">
        <dt className="type-label">{p.sunTookDays >= 0 ? t('ptn.sun_took') : t('ptn.sun_gave')}</dt>
        <dd className="type-data-l">
          {fmtNum(lang, Math.abs(p.sunTookDays))} <span className="type-data sp-unit">{t('unit.days')}</span>
        </dd>
      </div>
    </dl>
  );
}

export function Launch(): React.JSX.Element {
  const { t, lang } = useI18n();
  const design = useMission((s) => s.design);
  const setLaunchDate = useMission((s) => s.setLaunchDate);
  const launch = useMission((s) => s.launch);
  const result = useMission((s) => s.result);
  const setScreen = useNavigation((s) => s.setScreen);
  useEngineStatus((s) => s.status); // re-render when the data arrives
  const months = sunMonths();
  const idx = months ? Math.max(0, months.findIndex((m) => m.month === design.launchDate.slice(0, 7))) : 0;
  const blocked = result.fit.filter((f) => !f.pass);

  const go = () => {
    launch();
    setScreen('Flight');
  };

  return (
    <ScreenFrame id="Launch">
      <section aria-labelledby="date-h">
        <h3 id="date-h" className="type-label section-label">
          {t('launch.date')}
        </h3>
        <p className="type-data-l">{fmtDate(lang, design.launchDate)}</p>
        {months ? (
          <SunStripe
            months={months}
            value={idx}
            label={t('launch.date')}
            onChange={(i) => {
              const m = months[i];
              if (m) setLaunchDate(`${m.month}-15`);
            }}
          />
        ) : (
          <div className="art-slot type-small">{t('engine.loading')}</div>
        )}
        <p className="type-small sun-legend">
          {t('sun.legend')} <span className="type-data">{t('sun.steps')}</span>
        </p>
      </section>

      <section aria-labelledby="ptn-h">
        <h3 id="ptn-h" className="type-label section-label">
          {t('ptn.title')}
        </h3>
        <PlanTruthNote />
        <p className="type-small">{t('ptn.explain')}</p>
      </section>

      <section className="launch-go">
        {blocked.length > 0 && <p className="type-small launch-warn">{t('launch.blocked', { n: blocked.length })}</p>}
        <Button className="launch-btn" onClick={go}>
          <span className="type-display-l">{t('launch.go')}</span>
        </Button>
      </section>
    </ScreenFrame>
  );
}
