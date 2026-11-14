import React from 'react';
import type { SimResult } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtDate, fmtNum, fmtSigned } from '../format';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { AltitudeChart } from '../ui/AltitudeChart';
import { Button, VerdictStamp } from '../ui/components';
import { MainVerdict } from './Report';
import { ReflyVariants } from '../ui/Jeddah';
import type { MissionDesign } from '@stormproof/engine';
import { ScreenFrame } from './ScreenFrame';

function RunColumn({ label, r }: { label: string; r: SimResult }): React.JSX.Element {
  const { t, lang } = useI18n();
  const d = r.design;
  return (
    <section className="refly-col" aria-label={label}>
      <h3 className="type-label section-label">{label}</h3>
      <MainVerdict r={r} />
      <p className="type-data refly-design">
        {d.formFactor} · {t(`orbit.${d.orbit.type}`)} {fmtNum(lang, d.orbit.altitudeKm)} {t('unit.km')} · {fmtDate(lang, d.launchDate)}
      </p>
      <div className="req-row">
        {r.score.requirements.map((q) => (
          <VerdictStamp key={q.id} size="s" state={q.met ? 'ok' : 'fail'} title={t(`req.${q.id}`)} />
        ))}
      </div>
      <p className="type-small">
        {t('report.score', { met: r.score.requirementsMet, total: r.score.requirements.length, score: r.score.total })}
      </p>
    </section>
  );
}

export function Refly(): React.JSX.Element {
  const { t, lang } = useI18n();
  const baseline = useMission((s) => s.baseline);
  const flight = useMission((s) => s.flight);
  const keepBaseline = useMission((s) => s.keepBaseline);
  const clearBaseline = useMission((s) => s.clearBaseline);
  const setScreen = useNavigation((s) => s.setScreen);
  const loadDesign = useMission((s) => s.loadDesign);
  const launch = useMission((s) => s.launch);
  const same = baseline && flight && baseline.truth === flight.truth;

  /** F7: one-tap variant: keep this flight as the baseline, fly the variant, compare here. */
  const flyVariant = (d: MissionDesign) => {
    if (!baseline) keepBaseline();
    loadDesign(d);
    launch();
  };

  const changeOne = () => {
    keepBaseline();
    setScreen('Build');
  };

  if (!flight) {
    return (
      <ScreenFrame id="Refly">
        <p className="type-body">{t('refly.need_flight')}</p>
        <Button onClick={() => setScreen('Launch')}>{t('screens.launch')}</Button>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame id="Refly">
      <p className="type-small">{t('refly.seed', { seed: flight.design.seed })}</p>
      {baseline && !same ? (
        <>
          <AltitudeChart
            title={t('refly.chart')}
            lines={[
              { timeline: flight.truth.timeline, kind: 'truth', label: t('refly.second') },
              { timeline: baseline.truth.timeline, kind: 'alt', label: t('refly.first') },
            ]}
          />
          <div className="refly-deltas">
            <span className={`delta-chip ${flight.truth.lifetimeDays - baseline.truth.lifetimeDays >= 0 ? 'delta-chip--up' : 'delta-chip--down'}`}>
              <span className="delta-arrow" aria-hidden="true">{flight.truth.lifetimeDays - baseline.truth.lifetimeDays >= 0 ? '↑' : '↓'}</span>
              <span className="type-data">{fmtSigned(lang, flight.truth.lifetimeDays - baseline.truth.lifetimeDays)} {t('unit.days')}</span>
            </span>
            <span className={`delta-chip ${flight.truth.score.total - baseline.truth.score.total >= 0 ? 'delta-chip--up' : 'delta-chip--down'}`}>
              <span className="delta-arrow" aria-hidden="true">{flight.truth.score.total - baseline.truth.score.total >= 0 ? '↑' : '↓'}</span>
              <span className="type-data">{fmtSigned(lang, flight.truth.score.total - baseline.truth.score.total)} pts</span>
            </span>
          </div>
          <div className="refly-split">
            <RunColumn label={t('refly.first')} r={baseline.truth} />
            <RunColumn label={t('refly.second')} r={flight.truth} />
          </div>
        </>
      ) : (
        <>
          <p className="type-body">{t('refly.explain')}</p>
          <RunColumn label={t('refly.first')} r={flight.truth} />
        </>
      )}
      {flight.truth.eventReplay && <ReflyVariants onFly={flyVariant} />}
      <div className="btn-row">
        <Button onClick={changeOne}>{t('refly.change_one')}</Button>
        {baseline && (
          <Button variant="secondary" onClick={clearBaseline}>
            {t('refly.clear')}
          </Button>
        )}
      </div>
    </ScreenFrame>
  );
}
