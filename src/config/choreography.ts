/**
 * The idle → poster → sequence → poster → idle handoff.
 *
 * Every fade in the media stage is expressed as a ramp over transition
 * progress, so scrolling up reverses the choreography exactly. Keeping the
 * numbers in one place is what stops the stage from ever showing black.
 *
 *   idle MP4  →  matching PNG poster  →  WebP sequence  →  next PNG poster  →  next idle MP4
 */
export const HANDOFF = {
  /** The outgoing idle video fades to its own poster first. */
  idleOutStart: 0,
  idleOutEnd: 0.04,

  /** The canvas fades up over that same poster — frame 1 matches it. */
  canvasInStart: 0.02,
  canvasInEnd: 0.06,

  /** The canvas fades away over the next poster — the last frame matches it. */
  canvasOutStart: 0.96,
  canvasOutEnd: 1,

  /** The incoming idle video fades up over the next poster. */
  nextIdleInStart: 0.965,
  nextIdleInEnd: 1,

  /** Posters swap while the canvas is fully opaque, so the swap is unseen. */
  posterSwap: 0.5,

  /** Playback windows: the outgoing clip stops early, the incoming spins up
   *  well before it is visible so there is never a first-frame stall. */
  outgoingPlayUntil: 0.08,
  incomingPlayFrom: 0.85,

  /** Foregrounds belong to their scene and leave with its idle video. */
  foregroundOutEnd: 0.05,
  foregroundInStart: 0.95,
} as const;

/** Linear 0→1 ramp across [start, end], clamped. */
export function ramp(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  const t = (value - start) / (end - start);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Linear 1→0 ramp across [start, end], clamped. */
export function rampOut(value: number, start: number, end: number): number {
  return 1 - ramp(value, start, end);
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Ease used for the poster-to-poster fallback so it does not read as a cut. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}
