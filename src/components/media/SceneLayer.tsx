/**
 * Poster + idle-video layers of the fixed stage.
 *
 * Only a small window of scenes is ever mounted (previous, current, next), so
 * at most three 5 MB posters and two idle clips are resident. Opacity is
 * written straight to the DOM from the timeline subscription — this component
 * re-renders only when the mounted window changes.
 */
import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { scenes, transitionIds } from '@/config/scenes';
import { HANDOFF, ramp, rampOut, smoothstep } from '@/config/choreography';
import { SeamlessIdleVideo } from '@/components/media/SeamlessIdleVideo';
import { subscribeFrame, useTimelineState } from '@/hooks/useActiveScene';
import { hasSequence } from '@/hooks/useFrameSequence';

export interface SceneLayerProps {
  /** False on reduced motion — idle clips are not mounted at all. */
  playVideos: boolean;
  /** False when the WebP sequences are disabled, so posters must crossfade. */
  sequencesEnabled: boolean;
}

/** How many scenes either side of the current one stay mounted. */
const WINDOW_BEFORE = 1;
const WINDOW_AFTER = 1;

function SceneLayerImpl({ playVideos, sequencesEnabled }: SceneLayerProps) {
  const { sceneIndex, playingSceneIndex } = useTimelineState();

  const mounted = useMemo(() => {
    const first = Math.max(0, sceneIndex - WINDOW_BEFORE);
    const last = Math.min(scenes.length - 1, sceneIndex + WINDOW_AFTER);
    const list: number[] = [];
    for (let i = first; i <= last; i += 1) list.push(i);
    return list;
  }, [sceneIndex]);

  const posterRefs = useRef<Map<number, HTMLElement>>(new Map());
  const videoRefs = useRef<Map<number, HTMLElement>>(new Map());
  const failedPosters = useRef<Set<number>>(new Set());
  const [failedVersion, setFailedVersion] = useState(0);

  const setPosterRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) posterRefs.current.set(index, element);
    else posterRefs.current.delete(index);
  }, []);

  const setVideoRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) videoRefs.current.set(index, element);
    else videoRefs.current.delete(index);
  }, []);

  /* ------------------------------------------------------------------ *
   * The handoff. Every value is a pure function of transition progress,
   * so scrolling back up reverses it exactly.
   * ------------------------------------------------------------------ */
  // Re-subscribed whenever the mounted window changes: React re-applies the
  // inline opacity on that render, which would otherwise clobber the values
  // written here and leave them stale until the next scroll event.
  // subscribeFrame invokes the listener immediately, so the correct values are
  // restored before paint.
  useLayoutEffect(() => {
    return subscribeFrame((state) => {
      const t = state.transitionIndex;
      const p = state.transitionProgress;

      const posterOpacity = new Map<number, number>();
      const videoOpacity = new Map<number, number>();

      if (t < 0) {
        posterOpacity.set(state.sceneIndex, 1);
        videoOpacity.set(state.sceneIndex, 1);
      } else {
        const outgoing = t;
        const incoming = t + 1;
        const sequenceDrives = sequencesEnabled && hasSequence(transitionIds[t]);

        if (sequenceDrives) {
          // The canvas is opaque across the middle, so posters hard-swap
          // underneath it at the halfway mark — invisibly.
          posterOpacity.set(outgoing, p < HANDOFF.posterSwap ? 1 : 0);
          posterOpacity.set(incoming, p < HANDOFF.posterSwap ? 0 : 1);

          videoOpacity.set(outgoing, rampOut(p, HANDOFF.idleOutStart, HANDOFF.idleOutEnd));
          videoOpacity.set(incoming, ramp(p, HANDOFF.nextIdleInStart, HANDOFF.nextIdleInEnd));
        } else {
          // No sequence (missing folder, or reduced motion): fall back to a
          // poster-to-poster crossfade rather than crashing or going black.
          const s = smoothstep(p);
          posterOpacity.set(outgoing, 1 - s);
          posterOpacity.set(incoming, s);
          videoOpacity.set(outgoing, 1 - s);
          videoOpacity.set(incoming, s);
        }
      }

      posterRefs.current.forEach((element, index) => {
        const value = failedPosters.current.has(index) ? 0 : (posterOpacity.get(index) ?? 0);
        element.style.opacity = value.toFixed(3);
      });

      videoRefs.current.forEach((element, index) => {
        const value = videoOpacity.get(index) ?? 0;
        element.style.opacity = value.toFixed(3);
        element.style.visibility = value <= 0.001 ? 'hidden' : 'visible';
      });
    });
  }, [sequencesEnabled, mounted]);

  const handlePosterError = useCallback(
    (index: number, event: SyntheticEvent<HTMLImageElement>) => {
      if (failedPosters.current.has(index)) return;
      failedPosters.current.add(index);
      // Take the broken element out of the flow entirely — an alt-text stub or
      // a browser's broken-image glyph must never reach the stage.
      event.currentTarget.style.display = 'none';
      const element = posterRefs.current.get(index);
      if (element) element.style.opacity = '0';
      // Re-render once so the deep-navy placard takes the poster's place.
      setFailedVersion((value) => value + 1);
    },
    [],
  );

  return (
    <>
      {/* Layer 1b — placard shown only if a poster PNG fails to load. */}
      {failedVersion > 0 &&
        mounted
          .filter((index) => failedPosters.current.has(index))
          .map((index) => {
            const scene = scenes[index];
            return (
              <div
                key={`fallback-${scene.id}`}
                className="absolute inset-0 z-[1] flex items-center justify-center bg-navy"
                style={{ opacity: index === sceneIndex ? 1 : 0, transition: 'opacity 400ms linear' }}
                aria-hidden="true"
              >
                <span className="numeral text-[1.4rem] text-haze-dim">
                  {String(scene.number).padStart(2, '0')}
                </span>
              </div>
            );
          })}

      {/* Layer 2 — scene poster stills. */}
      {mounted.map((index) => {
        const scene = scenes[index];
        return (
          <div
            key={`poster-${scene.id}`}
            ref={(element) => setPosterRef(index, element)}
            className="absolute inset-0 z-[2]"
            style={{ opacity: index === sceneIndex ? 1 : 0 }}
          >
            <img
              src={scene.poster}
              alt={scene.posterAlt}
              className="stage-media"
              decoding="async"
              draggable={false}
              fetchPriority={index === sceneIndex ? 'high' : 'low'}
              onError={(event) => handlePosterError(index, event)}
            />
          </div>
        );
      })}

      {/* Layer 3 — the active scene's ambient idle loop. */}
      {playVideos &&
        mounted.map((index) => {
          const scene = scenes[index];
          return (
            <div
              key={`idle-${scene.id}`}
              ref={(element) => setVideoRef(index, element)}
              className="absolute inset-0 z-[3]"
              style={{
                opacity: index === sceneIndex ? 1 : 0,
                visibility: index === sceneIndex ? 'visible' : 'hidden',
              }}
            >
              <SeamlessIdleVideo
                src={scene.idleVideo}
                poster={scene.poster}
                active={index === playingSceneIndex}
                className="absolute inset-0"
              />
            </div>
          );
        })}
    </>
  );
}

export const SceneLayer = memo(SceneLayerImpl);
