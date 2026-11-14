import React from 'react';
import { useI18n } from '../i18n';
import { SCREEN_METADATA } from '../navigation';

export function Launch(): React.JSX.Element {
  const { t } = useI18n();
  const meta = SCREEN_METADATA.Launch;

  return (
    <article className="screen-card" aria-labelledby="screen-heading-launch">
      <header className="screen-header">
        <h2 id="screen-heading-launch" className="type-heading screen-title">
          {t(meta.nameKey)}
        </h2>
        <span className="segment-tag type-label">
          {t(meta.segmentKey)}
        </span>
      </header>
      <div className="screen-placeholder-body">
        <p className="type-body screen-description">
          {t('screens.placeholder_desc', {
            name: t(meta.nameKey),
            segment: t(meta.segmentKey),
          })}
        </p>
      </div>
    </article>
  );
}
