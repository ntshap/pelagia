/**
 * The PELAGIA symbol — an original inline SVG.
 *
 * A pressure ring crossed by a horizon, with three descending strata that
 * narrow as they go down, and a single sounding point at the centre. It reads
 * as an instrument face rather than a logo, which is the intent.
 */
import { memo } from 'react';

export interface PelagiaMarkProps {
  size?: number;
  className?: string;
  /** Stroke colour for the ring and strata. */
  tone?: string;
  /** Fill colour for the sounding point. */
  accent?: string;
  title?: string;
}

function PelagiaMarkImpl({
  size = 34,
  className,
  tone = 'currentColor',
  accent = '#55E6EA',
  title,
}: PelagiaMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {/* Pressure ring */}
      <circle cx="24" cy="24" r="22.25" stroke={tone} strokeOpacity="0.34" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="16.5" stroke={tone} strokeOpacity="0.9" strokeWidth="1.5" />

      {/* Horizon */}
      <path d="M7.5 24h33" stroke={accent} strokeOpacity="0.95" strokeWidth="1.5" />

      {/* Descending strata */}
      <path d="M10.6 30.4h26.8" stroke={tone} strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M14.6 36h18.8" stroke={tone} strokeOpacity="0.34" strokeWidth="1.5" />
      <path d="M19.4 40.9h9.2" stroke={tone} strokeOpacity="0.2" strokeWidth="1.5" />

      {/* Sounding point */}
      <circle cx="24" cy="24" r="3.4" fill={accent} />
      <circle cx="24" cy="24" r="7.4" stroke={accent} strokeOpacity="0.42" strokeWidth="1.5" />
    </svg>
  );
}

export const PelagiaMark = memo(PelagiaMarkImpl);
