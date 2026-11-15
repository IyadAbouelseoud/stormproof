import React from 'react';
import { useI18n } from '../i18n';
import { SCREEN_METADATA, SCREEN_OWNER, type ScreenId } from '../navigation';
import { useMission } from '../store';
import { RoleChip } from '../ui/components';
import { CoachMark } from '../ui/CoachMark';

export function ScreenFrame({ id, children, aside }: { id: ScreenId; children: React.ReactNode; aside?: React.ReactNode }): React.JSX.Element {
  const { t } = useI18n();
  const meta = SCREEN_METADATA[id];
  const team = useMission((s) => s.teamMode);
  const names = useMission((s) => s.names);
  const owner = SCREEN_OWNER[id];
  const hid = `screen-heading-${id.toLowerCase()}`;
  return (
    <article className={`screen-card screen--${id.toLowerCase()}`} aria-labelledby={hid}>
      <header className="screen-header">
        <h2 id={hid} className="type-heading screen-title" tabIndex={-1}>
          {t(meta.nameKey)}
        </h2>
        <div className="screen-header-tags">
          {team && owner ? <RoleChip role={owner} name={names[owner]} active /> : null}
          {aside}
          <span className="segment-tag type-label">{t(meta.segmentKey)}</span>
        </div>
      </header>
      <CoachMark screen={id} />
      {children}
    </article>
  );
}
