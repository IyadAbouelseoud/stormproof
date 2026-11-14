import React, { useState } from 'react';
import type { Cause, Gauge as GaugeT, Part, RoleId } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum, fmtSigned } from '../format';

/** Localized unit label; falls back to the raw unit when no key exists. */
export function unitText(t: (k: string) => string, unit: string): string {
  const k = `unit.${unit}`;
  const v = t(k);
  return v === k ? unit : v;
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'quiet';
  pressed?: boolean;
}

export function Button({ variant = 'primary', pressed, className = '', ...rest }: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`sp-btn sp-btn--${variant} ${pressed ? 'sp-btn--pressed' : ''} ${className}`.trim()}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// SI tag
// ---------------------------------------------------------------------------

export function SiTag(): React.JSX.Element {
  const { t } = useI18n();
  return <span className="sp-si-tag type-label">{t('si.tag')}</span>;
}

// ---------------------------------------------------------------------------
// Source tag (sourced / computed / game-balanced)
// ---------------------------------------------------------------------------

export function SrcTag({ src }: { src: string }): React.JSX.Element {
  const { t } = useI18n();
  const gb = src.startsWith('game-balanced');
  return (
    <span className={`sp-src-tag type-label ${gb ? 'sp-src-tag--gb' : ''}`} title={src}>
      {gb ? t('tag.game_balanced') : t('tag.sourced')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Gauge
// ---------------------------------------------------------------------------

export interface GaugeProps {
  gauge: GaugeT;
  /** Index in the changed-gauge sequence (for staggered animation), or -1 if unchanged. */
  changedIndex?: number;
  animKey?: number;
}

export function Gauge({ gauge, changedIndex = -1, animKey = 0 }: GaugeProps): React.JSX.Element {
  const { t, lang } = useI18n();
  const ratio = gauge.limit > 0 ? gauge.value / gauge.limit : 0;
  const fill = Math.max(0, Math.min(1, ratio));
  // the required-margin tick: value must stay under limit / (1 + margin) (CML); 'time' has no margin rule
  const tick = gauge.requiredMarginPct > 0 ? 1 / (1 + gauge.requiredMarginPct / 100) : null;
  const unitLabel = unitText(t, gauge.unit);
  const style = { '--fill': fill, '--i': Math.max(0, changedIndex) } as React.CSSProperties;
  return (
    <div
      key={animKey}
      className={`sp-gauge sp-gauge--${gauge.state} ${changedIndex >= 0 ? 'sp-gauge--changed' : ''}`}
      style={style}
      role="group"
      aria-label={t(`gauge.${gauge.id}`)}
    >
      <div className="sp-gauge-head">
        <span className="type-label sp-gauge-name">{t(`gauge.${gauge.id}`)}</span>
        <span className="type-label sp-gauge-state">{t(`state.${gauge.state}`)}</span>
      </div>
      <div className="sp-gauge-value">
        <span className="type-data">{fmtNum(lang, gauge.value)}</span>
        <span className="type-data sp-unit">{unitLabel}</span>
      </div>
      <div className="sp-gauge-track" aria-hidden="true">
        <div className="sp-gauge-fill" />
        {tick !== null && <div className="sp-gauge-tick" style={{ '--at': tick } as React.CSSProperties} />}
      </div>
      <div className="type-small sp-gauge-foot">
        <span>
          {t('gauge.limit')} <span className="type-data">{fmtNum(lang, gauge.limit)}</span>
        </span>
        <span>
          {t('gauge.margin')} <span className="type-data">{fmtSigned(lang, gauge.marginPct)}%</span>
          {gauge.requiredMarginPct > 0 && (
            <span className="sp-gauge-need">
              {' '}
              ({t('gauge.need')} <span className="type-data">{fmtNum(lang, gauge.requiredMarginPct)}%</span>)
            </span>
          )}
        </span>
      </div>
      {gauge.state === 'fail' && gauge.value > gauge.limit && (
        <div className="type-small sp-gauge-fail-text">
          {t('gauge.over_limit', { over: fmtNum(lang, gauge.value - gauge.limit) })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotIcon
// ---------------------------------------------------------------------------

export function SlotIcon({ slot }: { slot: string }): React.JSX.Element {
  const p = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'slot-icon',
    'aria-hidden': true,
  };
  switch (slot) {
    case 'camera':
      return (
        <svg {...p}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <circle cx="12" cy="13.5" r="3.5" />
          <polygon points="8,7 10,4 14,4 16,7" />
        </svg>
      );
    case 'panels':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="9" y1="4" x2="9" y2="20" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      );
    case 'battery':
      return (
        <svg {...p}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <line x1="9" y1="2" x2="9" y2="6" />
          <line x1="15" y1="2" x2="15" y2="6" />
          <line x1="8" y1="13" x2="12" y2="13" />
          <line x1="10" y1="11" x2="10" y2="15" />
          <line x1="14" y1="13" x2="16" y2="13" />
        </svg>
      );
    case 'radio':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M7.5 7.5 A6.5 6.5 0 0 1 16.5 7.5" />
          <path d="M4.5 4.5 A10.5 10.5 0 0 1 19.5 4.5" />
          <line x1="12" y1="15" x2="12" y2="21" />
          <line x1="9" y1="21" x2="15" y2="21" />
        </svg>
      );
    case 'computer':
      return (
        <svg {...p}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="5" />
          <line x1="15" y1="1" x2="15" y2="5" />
          <line x1="9" y1="19" x2="9" y2="23" />
          <line x1="15" y1="19" x2="15" y2="23" />
        </svg>
      );
    case 'pointing':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'fuel':
      return (
        <svg {...p}>
          <rect x="6" y="5" width="12" height="12" rx="3" />
          <polygon points="8,17 16,17 18,22 6,22" />
          <line x1="10" y1="2" x2="14" y2="2" />
          <line x1="12" y1="2" x2="12" y2="5" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// PartCard
// ---------------------------------------------------------------------------

/** Slot-specific stat of a part: [i18n label key, value, unit key]. */
function partStats(p: Part): [string, number, string][] {
  const out: [string, number, string][] = [];
  const any = p as unknown as Record<string, unknown>;
  const add = (field: string, label: string, unit: string) => {
    const v = any[field];
    if (typeof v === 'number') out.push([label, v, unit]);
  };
  add('gsdAt500M', 'part.gsd', 'm');
  add('swathAt500Km', 'part.swath', 'km');
  add('dataMBPerDay', 'part.data', 'MB/day');
  add('effectiveAreaM2', 'part.area', 'm2');
  add('capacityWh', 'part.capacity', 'Wh');
  add('downlinkMbps', 'part.downlink', 'Mbps');
  add('storageMB', 'part.storage', 'MB');
  add('deltaVMs', 'part.dv', 'm/s');
  return out;
}

export interface PartCardProps {
  part: Part;
  selected: boolean;
  onSelect?: () => void;
}

export function PartCard({ part, selected, onSelect }: PartCardProps): React.JSX.Element {
  const { t, lang } = useI18n();
  const rows: [string, number, string][] = [
    ['part.mass', part.massKg, 'kg'],
    ['part.power', part.powerW, 'W'],
    ['part.cost', part.costUsd, 'USD'],
    ...partStats(part),
  ];
  return (
    <button
      type="button"
      className={`sp-part ${selected ? 'sp-part--selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="sp-part-head">
        <span className="type-body sp-part-name">{part.name}</span>
        <SrcTag src={part.src} />
      </span>
      <span className="sp-part-stats">
        {rows.map(([label, v, unit]) => (
          <span key={label} className="sp-part-row">
            <span className="type-small sp-part-label">{t(label)}</span>
            <span className="type-data">
              {fmtNum(lang, v, 4)} <span className="sp-unit">{unitText(t, unit)}</span>
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// RoleChip
// ---------------------------------------------------------------------------

export function RoleChip({ role, name, active }: { role: RoleId; name?: string; active?: boolean }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <span className={`sp-role ${active ? 'sp-role--active' : ''}`}>
      <svg className="sp-role-mark" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="type-label">{t(`role.${role}`)}</span>
      {name ? <span className="type-small sp-role-name">{name}</span> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// VerdictStamp
// ---------------------------------------------------------------------------

export interface VerdictStampProps {
  state: 'ok' | 'warn' | 'fail';
  title: string;
  detail?: React.ReactNode;
  size?: 'l' | 's';
}

export function VerdictStamp({ state, title, detail, size = 'l' }: VerdictStampProps): React.JSX.Element {
  return (
    <div className={`sp-stamp sp-stamp--${state} sp-stamp--${size}`} role="status">
      <span className={size === 'l' ? 'type-display-l sp-stamp-title' : 'type-label sp-stamp-title'}>{title}</span>
      {detail ? <span className="type-small sp-stamp-detail">{detail}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MissionTicket
// ---------------------------------------------------------------------------

export function MissionTicket({ code }: { code: string }): React.JSX.Element {
  const { t } = useI18n();
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  return (
    <div className="sp-ticket">
      <span className="type-label sp-ticket-label">{t('ticket.label')}</span>
      <code className="type-data sp-ticket-code" dir="ltr">
        {code}
      </code>
      <div className="sp-ticket-actions">
        <Button variant="secondary" onClick={copy}>
          {t('ticket.copy')}
        </Button>
        <span className="type-small" aria-live="polite">
          {copied === 'ok' ? t('ticket.copied') : copied === 'fail' ? t('ticket.copy_failed') : ''}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CauseChain
// ---------------------------------------------------------------------------

export function CauseChain({ causes }: { causes: Cause[] }): React.JSX.Element {
  const { tMsg, t, lang } = useI18n();
  return (
    <ol className="sp-causes" aria-label={t('causes.title')}>
      {causes.map((c, i) => (
        <li key={c.id} className={`sp-cause ${c.sun ? 'sp-cause--sun' : ''} ${i === causes.length - 1 ? 'sp-cause--verdict' : ''}`}>
          <span className="type-data sp-cause-n" aria-hidden="true">
            {i + 1}
          </span>
          <span className="type-body sp-cause-text">{tMsg(c.label)}</span>
          <span className="type-data sp-cause-effect">
            {fmtNum(lang, c.effect.value, 2)} <span className="sp-unit">{unitText(t, c.effect.unit)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
