import React from 'react';

/** Code-drawn mission emblem: circular patch with Sun, Earth arc, orbit and satellite (X2 / prompt G2). */
export function MissionEmblem({ size = 72 }: { size?: number }): React.JSX.Element {
  return (
    <div className="brief-mission-emblem" aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" width={size} height={size} className="brief-emblem-svg">
        {/* Outer border rings */}
        <circle cx="40" cy="40" r="38" fill="var(--color-ground-sunken)" stroke="var(--color-brass)" strokeWidth="1.5" />
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-rule)" strokeWidth="0.75" strokeDasharray="3 2" />

        {/* Sun disc at top right (sol token) */}
        <circle cx="54" cy="24" r="7" fill="var(--color-sol)" />
        <circle cx="54" cy="24" r="10" fill="none" stroke="var(--color-sol)" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.7" />

        {/* Earth arc at bottom left */}
        <path d="M 12 60 A 28 28 0 0 0 60 68" fill="none" stroke="var(--color-rule)" strokeWidth="2" />
        <circle cx="28" cy="62" r="16" fill="var(--color-ground-raised)" stroke="var(--color-rule)" strokeWidth="1" />

        {/* Orbit ellipse */}
        <ellipse
          cx="38"
          cy="42"
          rx="26"
          ry="14"
          transform="rotate(-25 38 42)"
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />

        {/* Satellite dot & panels */}
        <circle cx="26" cy="34" r="2.5" fill="var(--color-lapis)" />
        <line x1="22" y1="34" x2="30" y2="34" stroke="var(--color-lapis)" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
