import React, { useEffect, useRef } from 'react';
import type { RoleId } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { useMission } from '../store';
import { useNavigation } from '../navigation';
import { Button, RoleChip } from '../ui/components';

/** Team mode hot-seat: hides the previous player's choices until the next role takes the device. */
export function Handover({ role }: { role: RoleId }): React.JSX.Element {
  const { t } = useI18n();
  const name = useMission((s) => s.names[role]);
  const confirm = useNavigation((s) => s.confirmHandover);
  const screen = useNavigation((s) => s.currentScreen);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <article className="screen-card handover" aria-labelledby="handover-h">
      <h2 id="handover-h" className="type-heading" tabIndex={-1}>
        {t('handover.title')}
      </h2>
      <RoleChip role={role} name={name} active />
      <p className="type-body">{t('handover.body', { role: name || t(`role.${role}`), screen: t(`screens.${screen.toLowerCase()}`) })}</p>
      <p className="type-small">{t('handover.hidden')}</p>
      <Button ref={ref} onClick={confirm}>
        {t('handover.ready')}
      </Button>
    </article>
  );
}
