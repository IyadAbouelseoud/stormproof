import React from 'react';

export interface EmptyStateProps {
  icon: 'parts' | 'flight' | 'loading' | 'report';
  text: string;
}

export function EmptyState({ icon, text }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-art" aria-hidden="true">
        {icon === 'parts' && (
          <svg viewBox="0 0 64 64" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="16" y="8" width="32" height="48" stroke="var(--color-rule)" strokeDasharray="3 3" />
            <line x1="16" y1="24" x2="48" y2="24" stroke="var(--color-rule)" strokeDasharray="3 3" />
            <line x1="16" y1="40" x2="48" y2="40" stroke="var(--color-rule)" strokeDasharray="3 3" />
            <circle cx="32" cy="32" r="3" fill="var(--color-brass)" />
          </svg>
        )}
        {icon === 'flight' && (
          <svg viewBox="0 0 64 64" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 52 Q32 20 56 12" stroke="var(--color-rule)" strokeDasharray="4 3" />
            <rect x="42" y="10" width="8" height="8" fill="var(--color-ground-raised)" stroke="var(--color-lapis)" />
            <line x1="38" y1="14" x2="42" y2="14" stroke="var(--color-lapis)" />
            <line x1="50" y1="14" x2="54" y2="14" stroke="var(--color-lapis)" />
          </svg>
        )}
        {icon === 'loading' && (
          <svg viewBox="0 0 64 64" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-loading-spin">
            <circle cx="32" cy="32" r="22" stroke="var(--color-rule)" />
            <circle cx="32" cy="32" r="14" stroke="var(--color-brass)" strokeDasharray="2 4" />
            <line x1="32" y1="6" x2="32" y2="58" stroke="var(--color-rule)" />
            <line x1="6" y1="32" x2="58" y2="32" stroke="var(--color-rule)" />
            <circle cx="32" cy="10" r="2.5" fill="var(--color-sol)" stroke="none" />
          </svg>
        )}
        {icon === 'report' && (
          <svg viewBox="0 0 64 64" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="12" y="10" width="40" height="48" rx="2" stroke="var(--color-rule)" />
            <line x1="20" y1="22" x2="44" y2="22" stroke="var(--color-ink-muted)" />
            <line x1="20" y1="30" x2="44" y2="30" stroke="var(--color-ink-muted)" />
            <line x1="20" y1="38" x2="36" y2="38" stroke="var(--color-ink-muted)" />
            <rect x="26" y="6" width="12" height="6" rx="1" fill="var(--color-ground-raised)" stroke="var(--color-rule)" />
          </svg>
        )}
      </div>
      <p className="type-small empty-state-text">{text}</p>
    </div>
  );
}
