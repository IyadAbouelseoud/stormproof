import React from 'react';
import { reducedMotion } from '../format';

/** Small code-drawn orbit scene: Sun disc (sol), Earth arc, and a satellite traveling the orbit in a 24s loop (X1). */
export function HeaderOrbitScene(): React.JSX.Element {
  const isReduced = typeof window !== 'undefined' && reducedMotion();

  return (
    <div className="header-orbit-scene" aria-hidden="true">
      <svg viewBox="0 0 110 36" width="110" height="36" className="header-orbit-svg">
        {/* Sun on the left (sol token only) */}
        <circle cx="16" cy="18" r="6" fill="var(--color-sol)" />
        <circle cx="16" cy="18" r="9" fill="none" stroke="var(--color-sol)" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.6" />

        {/* Earth on the right */}
        <circle cx="78" cy="18" r="8" fill="var(--color-ground-sunken)" stroke="var(--color-rule)" strokeWidth="1" />

        {/* Orbit ellipse path around Earth */}
        <path
          id="hdr-orbit-path"
          d="M 78 8 A 24 10 0 1 0 78 28 A 24 10 0 1 0 78 8"
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />

        {/* Satellite dot */}
        <circle cx="78" cy="8" r="2.5" fill="var(--color-lapis)">
          {!isReduced && (
            <animateMotion
              dur="24s"
              repeatCount="indefinite"
              path="M 0 0 A 24 10 0 1 0 0 20 A 24 10 0 1 0 0 0"
            />
          )}
        </circle>
      </svg>
    </div>
  );
}
