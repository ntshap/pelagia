/**
 * An ambient idle loop that never flashes at the seam.
 *
 * The clips are not pixel-matched end-to-start, so a plain `loop` attribute
 * produces a visible jump. Instead two copies of the same file are kept: the
 * active copy plays, and ~350ms before it ends the second copy starts from 0
 * and cross-fades in. Roles then swap. Only ever two <video> elements exist.
 *
 * If the dual-copy path fails for any reason (a second decode pipeline is
 * refused, an element errors), the component falls back to fading down to the
 * matching PNG poster — which is always rendered underneath by SceneLayer —
 * restarting, and fading back in.
 */
import { memo, useCallback, useEffect, useRef } from 'react';

const CROSSFADE_MS = 350;
const CROSSFADE_LEAD_S = CROSSFADE_MS / 1000;
const FALLBACK_FADE_MS = 200;

export interface SeamlessIdleVideoProps {
  src: string;
  /** Matching PNG poster — shown by the browser until the first frame decodes. */
  poster: string;
  /** Play only while this scene owns the stage. */
  active: boolean;
  className?: string;
}

function SeamlessIdleVideoImpl({
  src,
  poster,
  active,
  className,
}: SeamlessIdleVideoProps) {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  /** 0 => A is the visible copy, 1 => B is. */
  const primaryRef = useRef<0 | 1>(0);
  const crossfadingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const dualFailedRef = useRef(false);
  const wantsPlaybackRef = useRef(false);

  const getPair = useCallback((): [HTMLVideoElement, HTMLVideoElement] | null => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return null;
    return primaryRef.current === 0 ? [a, b] : [b, a];
  }, []);

  const safePlay = useCallback((element: HTMLVideoElement) => {
    const attempt = element.play();
    if (attempt && typeof attempt.catch === 'function') {
      // Autoplay of a muted, inline video is permitted, but a play() that is
      // interrupted by an immediate pause() still rejects. Swallow it.
      attempt.catch(() => undefined);
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** Fade down to the poster, restart, fade back up. Used when B is unusable. */
  const fallbackRestart = useCallback(() => {
    const pair = getPair();
    if (!pair) return;
    const [primary] = pair;
    crossfadingRef.current = true;

    primary.style.transition = `opacity ${FALLBACK_FADE_MS}ms linear`;
    primary.style.opacity = '0';

    timeoutRef.current = window.setTimeout(() => {
      try {
        primary.currentTime = 0;
      } catch {
        /* seeking can throw while the element is detaching */
      }
      safePlay(primary);
      primary.style.opacity = '1';
      timeoutRef.current = window.setTimeout(() => {
        crossfadingRef.current = false;
      }, FALLBACK_FADE_MS);
    }, FALLBACK_FADE_MS);
  }, [getPair, safePlay]);

  const beginCrossfade = useCallback(() => {
    const pair = getPair();
    if (!pair) return;
    const [primary, secondary] = pair;

    if (dualFailedRef.current || secondary.readyState < 2) {
      fallbackRestart();
      return;
    }

    crossfadingRef.current = true;

    try {
      secondary.currentTime = 0;
    } catch {
      fallbackRestart();
      return;
    }
    safePlay(secondary);

    primary.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
    secondary.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
    primary.style.opacity = '0';
    secondary.style.opacity = '1';

    timeoutRef.current = window.setTimeout(() => {
      primary.pause();
      try {
        primary.currentTime = 0;
      } catch {
        /* ignore */
      }
      primaryRef.current = primaryRef.current === 0 ? 1 : 0;
      crossfadingRef.current = false;
    }, CROSSFADE_MS + 30);
  }, [fallbackRestart, getPair]);

  /** Watches the active copy and hands over before it runs out. */
  const tick = useCallback(() => {
    rafRef.current = null;
    if (!wantsPlaybackRef.current) return;

    const pair = getPair();
    if (pair && !crossfadingRef.current) {
      const [primary] = pair;
      const { duration, currentTime } = primary;
      if (
        Number.isFinite(duration) &&
        duration > CROSSFADE_LEAD_S * 2 &&
        currentTime >= duration - CROSSFADE_LEAD_S
      ) {
        beginCrossfade();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [beginCrossfade, getPair]);

  /* ------------------------------------------------------------------ *
   * Start / stop
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    wantsPlaybackRef.current = active;

    if (active) {
      const pair = getPair();
      if (!pair) return;
      const [primary, secondary] = pair;

      secondary.style.transition = 'none';
      secondary.style.opacity = '0';
      primary.style.transition = 'none';
      primary.style.opacity = '1';
      crossfadingRef.current = false;

      safePlay(primary);
      clearTimers();
      rafRef.current = requestAnimationFrame(tick);
      return () => clearTimers();
    }

    // Inactive: stop immediately and rewind both copies so the next activation
    // always starts from a known first frame.
    clearTimers();
    crossfadingRef.current = false;
    primaryRef.current = 0;
    for (const element of [a, b]) {
      element.pause();
      try {
        element.currentTime = 0;
      } catch {
        /* ignore */
      }
      element.style.transition = 'none';
    }
    a.style.opacity = '1';
    b.style.opacity = '0';
    return undefined;
  }, [active, clearTimers, getPair, safePlay, tick]);

  /* Reset internal state when the source changes. */
  useEffect(() => {
    primaryRef.current = 0;
    crossfadingRef.current = false;
    dualFailedRef.current = false;
  }, [src]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleErrorB = useCallback(() => {
    // The second decode pipeline is unavailable — degrade to poster fallback.
    dualFailedRef.current = true;
  }, []);

  const handleErrorA = useCallback(() => {
    // The whole clip is unavailable. The poster underneath stays visible and
    // the stage simply holds on the still.
    dualFailedRef.current = true;
    wantsPlaybackRef.current = false;
    clearTimers();
    const a = videoARef.current;
    if (a) a.style.opacity = '0';
  }, [clearTimers]);

  /** Last-resort: if our rAF handover missed, restart rather than freeze. */
  const handleEnded = useCallback(() => {
    if (!wantsPlaybackRef.current || crossfadingRef.current) return;
    fallbackRestart();
  }, [fallbackRestart]);

  const shared =
    'absolute inset-0 h-full w-full object-cover pointer-events-none select-none';

  return (
    <div className={className} aria-hidden="true">
      <video
        ref={videoARef}
        className={shared}
        style={{ opacity: 1 }}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        controls={false}
        tabIndex={-1}
        onError={handleErrorA}
        onEnded={handleEnded}
      />
      {/* The handover copy. It only needs bytes once this scene is live —
       *  fetching metadata for every mounted scene would double the video
       *  requests for clips nobody is watching yet. */}
      <video
        ref={videoBRef}
        className={shared}
        style={{ opacity: 0 }}
        src={src}
        poster={poster}
        muted
        playsInline
        preload={active ? 'metadata' : 'none'}
        disablePictureInPicture
        controls={false}
        tabIndex={-1}
        onError={handleErrorB}
      />
    </div>
  );
}

export const SeamlessIdleVideo = memo(SeamlessIdleVideoImpl);
