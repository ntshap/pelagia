/**
 * Transparent PNG cutouts drifting in front of the scene.
 *
 * Three parallax bands (far / mid / near) move at 6 / 13 / 23 percent of the
 * viewport, always along the scroll axis — nothing floats on its own clock.
 * Rotation stays under 4°, scale under 5%, and the whole layer leaves with its
 * scene's idle video so it never sits on top of a transition. Each scene's
 * group also settles in on a transform, which the frame loop never writes.
 */
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type SyntheticEvent,
} from 'react';
import {
  FOREGROUND_ASSETS,
  PARALLAX_RANGE,
  scenes,
  type ForegroundPlacement,
} from '@/config/scenes';
import { HANDOFF, ramp, rampOut } from '@/config/choreography';
import { getSceneTop, subscribeFrame, useTimelineState } from '@/hooks/useActiveScene';

export interface ForegroundLayerProps {
  /** Parallax is switched off entirely for reduced motion. */
  animate: boolean;
}

interface ObjectHandle {
  element: HTMLElement;
  placement: ForegroundPlacement;
}

/** How far the whole cutout layer leans with the pointer, in px. */
const POINTER_RANGE = 26;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function ForegroundLayerImpl({ animate }: ForegroundLayerProps) {
  const { sceneIndex } = useTimelineState();

  const mounted = useMemo(() => {
    const first = Math.max(0, sceneIndex - 1);
    const last = Math.min(scenes.length - 1, sceneIndex + 1);
    const list: number[] = [];
    for (let i = first; i <= last; i += 1) {
      if (scenes[i].composition?.length) list.push(i);
    }
    return list;
  }, [sceneIndex]);

  const groupRefs = useRef<Map<number, HTMLElement>>(new Map());
  const objectRefs = useRef<Map<string, ObjectHandle>>(new Map());
  const pointerRefs = useRef<Map<number, HTMLElement>>(new Map());

  const setGroupRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) groupRefs.current.set(index, element);
    else groupRefs.current.delete(index);
  }, []);

  const setPointerRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) pointerRefs.current.set(index, element);
    else pointerRefs.current.delete(index);
  }, []);

  const setObjectRef = useCallback(
    (key: string, placement: ForegroundPlacement, element: HTMLElement | null) => {
      if (element) objectRefs.current.set(key, { element, placement });
      else objectRefs.current.delete(key);
    },
    [],
  );

  // See SceneLayer: re-subscribe on every window change so the values written
  // here survive the React render that re-applies the inline styles.
  useLayoutEffect(() => {
    return subscribeFrame((state) => {
      const t = state.transitionIndex;
      const p = state.transitionProgress;
      const viewport = window.innerHeight || 1;

      /* Group opacity — foregrounds belong to their scene. */
      groupRefs.current.forEach((element, index) => {
        let opacity = 0;
        if (t < 0) {
          opacity = index === state.sceneIndex ? 1 : 0;
        } else if (index === t) {
          opacity = rampOut(p, HANDOFF.idleOutStart, HANDOFF.foregroundOutEnd);
        } else if (index === t + 1) {
          opacity = ramp(p, HANDOFF.foregroundInStart, HANDOFF.nextIdleInEnd);
        }

        element.style.opacity = opacity.toFixed(3);
        element.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
      });

      if (!animate) return;

      /* Per-object parallax. */
      objectRefs.current.forEach(({ element, placement }, key) => {
        const index = Number(key.slice(0, key.indexOf(':')));
        const group = groupRefs.current.get(index);
        if (!group) return;

        // will-change goes on the transformed element itself, and only while
        // that element is actually on screen and moving.
        if (group.style.visibility === 'hidden') {
          if (element.style.willChange) element.style.willChange = '';
          return;
        }
        if (element.style.willChange !== 'transform') element.style.willChange = 'transform';

        // -1 → +1 across the scene's own scroll span, centred on its hold.
        const local = (state.scrollY - getSceneTop(index)) / viewport;
        const u = clamp(local - 0.5, -1, 1);

        const range = PARALLAX_RANGE[placement.depth];
        const translate = -u * (range / 100) * viewport;
        const drift = u * range * 0.14; // a little lateral lead, in px
        const rotate = (placement.rotate ?? 0) + u * (placement.depth === 'near' ? 2.4 : 1.2);
        const scale = 1 + Math.abs(u) * (placement.depth === 'near' ? 0.045 : 0.025);
        const mirror = placement.flip ? -1 : 1;

        element.style.transform =
          `translate3d(${drift.toFixed(2)}px, ${translate.toFixed(2)}px, 0) ` +
          `rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(4)}) scaleX(${mirror})`;
      });
    });
  }, [animate, mounted]);

  /* ------------------------------------------------------------------ *
   * Pointer parallax.
   *
   * The timeline ticker short-circuits when the scroll position has not
   * changed, so a still page never notifies subscribers — the pointer needs
   * its own loop. It writes to the wrapper only; the scroll parallax owns the
   * images' transforms. The loop stops as soon as the lerp settles.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!animate) {
      pointerRefs.current.forEach((element) => {
        element.style.transform = '';
      });
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let running = false;

    const step = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      const px = (x * POINTER_RANGE).toFixed(2);
      const py = (y * POINTER_RANGE * 0.55).toFixed(2);
      pointerRefs.current.forEach((element) => {
        element.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      });
      if (Math.abs(targetX - x) > 0.0004 || Math.abs(targetY - y) > 0.0004) {
        raf = requestAnimationFrame(step);
      } else {
        running = false;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX / window.innerWidth - 0.5;
      targetY = event.clientY / window.innerHeight - 0.5;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, [animate, mounted]);

  const handleError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    // Hide only the object that failed; the scene is untouched.
    const image = event.currentTarget;
    image.style.display = 'none';
  }, []);

  return (
    <>
      {mounted.map((index) => {
        const scene = scenes[index];
        const composition = scene.composition ?? [];
        return (
          <div
            key={`fg-${scene.id}`}
            ref={(element) => setGroupRef(index, element)}
            className="pointer-events-none absolute inset-0 z-[4] overflow-hidden"
            style={{
              // Opacity and visibility are written every frame by the handoff
              // ramp below; these are only the values before the first tick.
              // Nothing may transition them — the ramp is scrubbed against the
              // idle video, and easing it would leave the cutouts on top of a
              // running transition.
              opacity: index === sceneIndex ? 1 : 0,
              visibility: index === sceneIndex ? 'visible' : 'hidden',
              // The settle is transform-only, which the frame loop never touches.
              transform: index === sceneIndex ? 'none' : 'translateY(18px) scale(1.03)',
              transition: 'transform 1100ms var(--ease-depth)',
            }}
          >
            <div
              ref={(element) => setPointerRef(index, element)}
              className="absolute inset-0"
              style={{ willChange: 'transform' }}
            >
              {composition.map((placement, order) => {
                const key = `${index}:${placement.asset}:${order}`;
                const decorative = placement.alt.length === 0;
                return (
                  <img
                    key={key}
                    ref={(element) => setObjectRef(key, placement, element)}
                    src={FOREGROUND_ASSETS[placement.asset]}
                    alt={placement.alt}
                    aria-hidden={decorative || undefined}
                    role={decorative ? 'presentation' : undefined}
                    draggable={false}
                    decoding="async"
                    loading="lazy"
                    onError={handleError}
                    className="absolute h-auto max-w-none select-none"
                    style={{
                      left: `${placement.x}%`,
                      top: `${placement.y}%`,
                      width: `${placement.width}%`,
                      opacity: placement.opacity,
                      zIndex: placement.z ?? 2,
                      filter: placement.blur ? `blur(${placement.blur}px)` : undefined,
                      transform: `rotate(${placement.rotate ?? 0}deg) scaleX(${placement.flip ? -1 : 1})`,
                      transformOrigin: 'center center',
                    }}
                    />
                  );
                })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export const ForegroundLayer = memo(ForegroundLayerImpl);
