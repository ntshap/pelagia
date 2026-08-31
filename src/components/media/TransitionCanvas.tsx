/**
 * The scrubbing frame canvas.
 *
 * One fixed <canvas> renders whichever WebP sequence is currently in flight.
 * Scroll progress picks the frame; nothing else drives it. There is no
 * autoplay, no video scrubbing, and no React state update per frame — the
 * draw path only ever touches refs and runs at most once per browser frame.
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import { transitionIds } from '@/config/scenes';
import { HANDOFF, ramp, rampOut } from '@/config/choreography';
import {
  PRIORITY,
  frameIndexForProgress,
  useFrameSequence,
  type FrameSequence,
} from '@/hooks/useFrameSequence';
import { subscribeFrame, useTimelineState } from '@/hooks/useActiveScene';

/** Retina is not worth the fill cost for a full-bleed 16:9 photo sequence. */
const MAX_DPR = 1.5;
/** How many frames either side of the playhead to keep hot. */
const HOT_RADIUS = 12;
/** Within this distance a frame outranks the next sequence's look-ahead. */
const ADJACENT_RADIUS = 4;
/** Pending requests further than this from the playhead are dropped. */
const STALE_RADIUS = 26;
/** Only re-prune once the playhead has genuinely moved. */
const PRUNE_STEP = 5;

export interface TransitionCanvasProps {
  enabled: boolean;
  className?: string;
}

function TransitionCanvasImpl({ enabled, className }: TransitionCanvasProps) {
  const { transitionIndex } = useTimelineState();
  const id = transitionIndex >= 0 ? (transitionIds[transitionIndex] ?? null) : null;
  const sequence = useFrameSequence(id, enabled);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const sequenceRef = useRef<FrameSequence | null>(null);
  sequenceRef.current = sequence;

  const pendingIndexRef = useRef(-1);
  const drawnIndexRef = useRef(-1);
  const lastImageRef = useRef<HTMLImageElement | null>(null);
  const lastPrunedRef = useRef(-999);
  const rafRef = useRef<number | null>(null);

  /* ------------------------------------------------------------------ *
   * Canvas sizing — cover behaviour, DPR capped.
   * ------------------------------------------------------------------ */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));

    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;
    // Resizing the backing store clears it; force the next frame to redraw.
    drawnIndexRef.current = -1;
    lastImageRef.current = null;
  }, []);

  const paint = useCallback((image: HTMLImageElement) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const { width, height } = canvas;
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih) return;

    // object-fit: cover, preserving the source 16:9 composition.
    const scale = Math.max(width / iw, height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (width - dw) * 0.5;
    const dy = (height - dh) * 0.5;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, dx, dy, dw, dh);
  }, []);

  const flush = useCallback(() => {
    rafRef.current = null;

    const index = pendingIndexRef.current;
    const seq = sequenceRef.current;
    if (index < 0 || !seq) return;

    // Exact frame when we have it, nearest decoded frame otherwise. If nothing
    // is decoded yet the canvas simply stays transparent and the poster
    // underneath shows through — never a blank white or black flash.
    const image = seq.getClosest(index);
    if (!image) return;

    if (drawnIndexRef.current === index && image === lastImageRef.current) return;
    lastImageRef.current = image;
    drawnIndexRef.current = index;
    paint(image);
  }, [paint]);

  const requestDraw = useCallback(
    (index: number) => {
      pendingIndexRef.current = index;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  /* ------------------------------------------------------------------ *
   * Context + resize wiring
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // `alpha: true` matters — an undrawn or partially filled canvas must let
    // the poster underneath show through rather than painting black.
    ctxRef.current = canvas.getContext('2d', { alpha: true });
    resize();

    window.addEventListener('resize', resize, { passive: true });
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [resize]);

  /* Clear when the sequence changes so a stale frame can never leak through. */
  useEffect(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    drawnIndexRef.current = -1;
    pendingIndexRef.current = -1;
    lastImageRef.current = null;
    lastPrunedRef.current = -999;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const wrapper = wrapperRef.current;
    if (wrapper && !sequence) {
      wrapper.style.opacity = '0';
      wrapper.style.visibility = 'hidden';
    }
  }, [sequence]);

  /* ------------------------------------------------------------------ *
   * The scroll-driven draw loop
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!enabled) return;

    return subscribeFrame((state) => {
      const wrapper = wrapperRef.current;
      const seq = sequenceRef.current;

      if (!wrapper) return;

      if (!seq || seq.length === 0 || state.transitionIndex < 0) {
        wrapper.style.opacity = '0';
        wrapper.style.visibility = 'hidden';
        return;
      }

      const p = state.transitionProgress;

      // Up over the outgoing poster, down over the incoming one.
      const opacity =
        ramp(p, HANDOFF.canvasInStart, HANDOFF.canvasInEnd) *
        rampOut(p, HANDOFF.canvasOutStart, HANDOFF.canvasOutEnd);

      wrapper.style.opacity = opacity.toFixed(3);
      wrapper.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';

      const index = frameIndexForProgress(p, seq.length);

      // Keep a window around the playhead hot, direction-aware so the frames
      // ahead of travel are fetched first. Only the closest few outrank the
      // look-ahead for the next sequence; the rest of the window sits below it.
      seq.request(index, PRIORITY.exact);
      const lead = state.direction >= 0 ? 1 : -1;
      for (let offset = 1; offset <= HOT_RADIUS; offset += 1) {
        const ahead =
          offset <= ADJACENT_RADIUS
            ? PRIORITY.adjacent - offset
            : PRIORITY.window - offset;
        const behind =
          offset <= 2 ? PRIORITY.adjacent - 6 - offset : PRIORITY.window - 8 - offset;
        seq.request(index + offset * lead, ahead);
        seq.request(index - offset * lead, behind);
      }

      // Requests for frames the visitor has already scrolled past are worthless
      // and would otherwise sit at the head of the queue.
      if (Math.abs(index - lastPrunedRef.current) >= PRUNE_STEP) {
        lastPrunedRef.current = index;
        seq.dropPendingOutside(index, STALE_RADIUS);
      }

      requestDraw(index);
    });
  }, [enabled, requestDraw]);

  /* Prime the sequence the moment it becomes current. */
  useEffect(() => {
    if (!sequence) return;
    sequence.requestAnchors(PRIORITY.adjacent - 8);
    sequence.requestSpread(13, PRIORITY.adjacent - 9);
  }, [sequence]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ opacity: 0, visibility: 'hidden' }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        role="presentation"
        aria-hidden="true"
      />
    </div>
  );
}

export const TransitionCanvas = memo(TransitionCanvasImpl);
