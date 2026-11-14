import React, { useState } from 'react';

export interface IllustrationProps {
  id: string;
  src: string;
  alt: string;
  aspect?: '16-9' | '4-3' | '21-9' | '3-1';
  className?: string;
}

/**
 * Editorial illustration with visible SI tag.
 * Fixed-aspect ratio container prevents layout shift.
 * If the image fails to load or is missing, returns null so the screen stays clean.
 */
export function Illustration({ id: _id, src, alt, aspect = '16-9', className }: IllustrationProps): React.JSX.Element | null {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className={`art-frame aspect-${aspect} ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="art-img"
        onError={() => setFailed(true)}
      />
      <span className="sp-si-tag type-label">SI-generated</span>
    </div>
  );
}
