import React, { useState } from 'react';
import { decodeMission, type Cause, type Gauge as GaugeT, type Part, type RoleId } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { partName } from '../content';
import { fmtNum, fmtSigned } from '../format';
import { useMission } from '../store';

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
  // tick ratio at required margin
  const tickRatio = gauge.requiredMarginPct > 0 ? 1 / (1 + gauge.requiredMarginPct / 100) : null;
  const unitLabel = unitText(t, gauge.unit);

  // Dial arc geometry: semicircle radius 36, center (50, 48), length 113.1
  const arcLength = 113.1;
  const dashOffset = arcLength * (1 - fill);
  const color =
    gauge.state === 'ok'
      ? 'var(--color-ok)'
      : gauge.state === 'warn'
        ? 'var(--color-warn)'
        : 'var(--color-fail)';

  // Calculate tick mark endpoints on the arc
  let tickCoords: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (tickRatio !== null) {
    const angle = Math.PI * (1 - Math.max(0, Math.min(1, tickRatio)));
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    tickCoords = {
      x1: 50 + 28 * cos,
      y1: 48 - 28 * sin,
      x2: 50 + 44 * cos,
      y2: 48 - 44 * sin,
    };
  }

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

      <div className="sp-dial-container" aria-hidden="true">
        <svg viewBox="0 0 100 58" className="sp-dial-svg">
          {/* Background track */}
          <path
            d="M 14 48 A 36 36 0 0 1 86 48"
            fill="none"
            stroke="var(--color-rule)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Active value arc (animates in 240ms) */}
          <path
            d="M 14 48 A 36 36 0 0 1 86 48"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashOffset}
            className="sp-dial-arc"
          />

          {/* Required margin tick */}
          {tickCoords && (
            <line
              x1={tickCoords.x1}
              y1={tickCoords.y1}
              x2={tickCoords.x2}
              y2={tickCoords.y2}
              stroke="var(--color-ink)"
              strokeWidth="1.5"
            />
          )}

          {/* Center value and unit */}
          <text x="50" y="42" textAnchor="middle" className="sp-dial-num type-data">
            {fmtNum(lang, gauge.value)}
          </text>
          <text x="50" y="52" textAnchor="middle" className="sp-dial-unit type-small">
            {unitLabel}
          </text>
        </svg>
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
// ReqIcon (code-drawn line icons for Brief objective tiles)
// ---------------------------------------------------------------------------

export function ReqIcon({ id }: { id: string }): React.JSX.Element {
  const p = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'req-icon',
    'aria-hidden': true,
  };
  switch (id) {
    case 'revisit':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12,7 12,12 15,14" />
          <path d="M 12 3 A 9 9 0 0 1 20 8" />
          <polyline points="21,4 20,8 16,7" />
        </svg>
      );
    case 'gsd':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <rect x="9" y="9" width="6" height="6" strokeDasharray="1 1" />
        </svg>
      );
    case 'data-delivered':
    case 'data':
      return (
        <svg {...p}>
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M 4 6 v 5 c 0 1.66 3.58 3 8 3 s 8 -1.34 8 -3 v -5" />
          <path d="M 4 11 v 5 c 0 1.66 3.58 3 8 3 s 8 -1.34 8 -3 v -5" />
        </svg>
      );
    case 'lifetime':
      return (
        <svg {...p}>
          <path d="M 6 3 L 18 3 L 14 11 L 18 19 L 6 19 L 10 11 Z" />
          <line x1="7" y1="3" x2="17" y2="3" />
          <line x1="7" y1="19" x2="17" y2="19" />
        </svg>
      );
    case 'budget':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
          <path d="M 10 9 C 10 9 11 8 12 8 C 13.5 8 14 8.8 14 9.5 C 14 10.5 12.5 11 11.5 11.5 C 10.5 12 10 12.5 10 13.5 C 10 14.5 11 15 12 15 C 13.5 15 14 14 14 14" />
          <line x1="12" y1="6.5" x2="12" y2="8" />
          <line x1="12" y1="15" x2="12" y2="16.5" />
        </svg>
      );
    case 'event-look':
      return (
        <svg {...p}>
          <path d="M 5 14 A 4 4 0 0 1 7 7 A 6 6 0 0 1 17 8 A 4 4 0 0 1 19 14 Z" />
          <ellipse cx="12" cy="14" rx="4" ry="2.5" />
          <circle cx="12" cy="14" r="1.2" fill="currentColor" />
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
        <span className="type-body sp-part-name">{partName(part.id, lang, part.name)}</span>
        {part.cameraType === 'radar' ? (
          <span className="sp-src-tag sp-src-tag--gb type-label">{t('tag.design_study_not_6u')}</span>
        ) : (
          <SrcTag src={part.src} />
        )}
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

export function RoleEmblem({ role }: { role: RoleId }): React.JSX.Element {
  const p = {
    viewBox: '0 0 16 16',
    width: 14,
    height: 14,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.2,
    className: 'sp-role-mark',
    'aria-hidden': true,
  };
  switch (role) {
    case 'systems-lead':
      return (
        <svg {...p}>
          <polygon points="8,1 10,6 15,8 10,10 8,15 6,10 1,8 6,6" fill="currentColor" fillOpacity="0.2" />
          <circle cx="8" cy="8" r="1.8" fill="currentColor" />
        </svg>
      );
    case 'science':
      return (
        <svg {...p}>
          <ellipse cx="8" cy="8" rx="6.5" ry="2.8" transform="rotate(30 8 8)" />
          <ellipse cx="8" cy="8" rx="6.5" ry="2.8" transform="rotate(-30 8 8)" />
          <circle cx="8" cy="8" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'power-spacecraft':
      return (
        <svg {...p}>
          <rect x="3" y="4" width="10" height="8" rx="1" />
          <line x1="8" y1="4" x2="8" y2="12" />
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
      );
    case 'orbit-comms':
      return (
        <svg {...p}>
          <path d="M 3 13 A 7 7 0 0 1 13 3" />
          <path d="M 6 13 A 4 4 0 0 1 13 6" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
  }
}

export function RoleChip({ role, name, active }: { role: RoleId; name?: string; active?: boolean }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <span className={`sp-role ${active ? 'sp-role--active' : ''}`}>
      <RoleEmblem role={role} />
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
  const [inputCode, setInputCode] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSuccess, setLoadSuccess] = useState(false);
  const loadDesign = useMission((s) => s.loadDesign);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('ok');
      window.setTimeout(() => setCopied('idle'), 1200);
    } catch {
      setCopied('fail');
      window.setTimeout(() => setCopied('idle'), 2000);
    }
  };

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    try {
      const d = decodeMission(inputCode.trim());
      setLoadError(null);
      loadDesign(d);
      setLoadSuccess(true);
      window.setTimeout(() => setLoadSuccess(false), 2000);
    } catch {
      setLoadError(t('ticket.invalid'));
    }
  };

  return (
    <div className="sp-ticket">
      <div className="sp-ticket-header">
        <span className="type-label sp-ticket-label">{t('ticket.label')}</span>
        <code className="type-data sp-ticket-code" dir="ltr">
          {code}
        </code>
        <div className="sp-ticket-actions">
          <Button variant="secondary" onClick={copy}>
            {t('ticket.copy')}
          </Button>
          {copied === 'ok' && (
            <span className="type-small sp-ticket-chip" role="status" aria-live="polite">
              {t('ticket.copied')}
            </span>
          )}
          {copied === 'fail' && (
            <span className="type-small sp-ticket-chip sp-ticket-chip--fail" role="status" aria-live="polite">
              {t('ticket.copy_failed')}
            </span>
          )}
        </div>
      </div>

      <form className="sp-ticket-load" onSubmit={handleLoad}>
        <input
          type="text"
          className="sp-input type-data"
          value={inputCode}
          placeholder="SP1-..."
          aria-label={t('ticket.load_code')}
          onChange={(e) => {
            setInputCode(e.target.value);
            if (loadError) setLoadError(null);
          }}
        />
        <Button variant="secondary" type="submit">
          {t('ticket.load')}
        </Button>
        {loadError && (
          <span className="type-small sp-ticket-err" role="alert">
            {loadError}
          </span>
        )}
        {loadSuccess && (
          <span className="type-small sp-ticket-chip" role="status">
            {t('ticket.loaded')}
          </span>
        )}
      </form>
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
