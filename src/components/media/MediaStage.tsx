/**
 * The fixed stage.
 *
 * One element, pinned to the viewport, holding every pixel of imagery on the
 * site. The narrative timeline scrolls above it — eight large videos never
 * enter the document flow.
 *
 * Layer order (bottom to top):
 *   1  black fallback            (this element's own background)
 *   2  current scene PNG poster  ) SceneLayer
 *   3  current idle MP4          )
 *   4  foreground PNG cutouts    ForegroundLayer
 *   5  transition canvas         TransitionCanvas
 *   6  cinematic colour overlays
 * Narrative content, header and navigation sit above the stage in App.
 */
import { memo, useEffect, useRef } from 'react';
import { scenes } from '@/config/scenes';
import { SceneLayer } from '@/components/media/SceneLayer';
import { ForegroundLayer } from '@/components/media/ForegroundLayer';
import { TransitionCanvas } from '@/components/media/TransitionCanvas';
import { subscribeFrame, useTimelineState } from '@/hooks/useActiveScene';
import { useMediaPreloader } from '@/hooks/useMediaPreloader';

export interface MediaStageProps {
  /** Reduced motion: no WebP sequences, no idle playback, no parallax. */
  reducedMotion: boolean;
}

function MediaStageImpl({ reducedMotion }: MediaStageProps) {
  const { sceneIndex, transitionIndex } = useTimelineState();
  const tintRef = useRef<HTMLDivElement | null>(null);

  useMediaPreloader(sceneIndex, transitionIndex, true, !reducedMotion);

  /* A single accent wash that follows the scene tint, driven per frame. */
  useEffect(() => {
    return subscribeFrame((state) => {
      const element = tintRef.current;
      if (!element) return;

      const t = state.transitionIndex;
      const p = state.transitionProgress;
      const from = scenes[t >= 0 ? t : state.sceneIndex];
      const to = scenes[t >= 0 ? Math.min(t + 1, scenes.length - 1) : state.sceneIndex];

      element.style.setProperty('--accent-from', from.accent);
      element.style.setProperty('--accent-to', to.accent);
      element.style.setProperty('--accent-mix', t >= 0 ? p.toFixed(3) : '0');

      // The deeper the descent, the heavier the water above.
      const density = Math.min(1, state.depth / 4200);
      element.style.setProperty('--depth-density', density.toFixed(3));
    });
  }, []);

  return (
    <div
      className="fixed inset-0 h-screen w-full overflow-hidden bg-abyss"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* 1 — black fallback is this element's background. */}

      {/* 2 + 3 — posters and idle loops. */}
      <SceneLayer playVideos={!reducedMotion} sequencesEnabled={!reducedMotion} />

      {/* 4 — transparent PNG cutouts. */}
      <ForegroundLayer animate={!reducedMotion} />

      {/* 5 — the scrubbing WebP sequence. */}
      <TransitionCanvas enabled={!reducedMotion} className="absolute inset-0 z-[5]" />

      {/* 6 — cinematic colour grade. Three quiet passes, no UI chrome. */}
      <div ref={tintRef} className="pointer-events-none absolute inset-0 z-[6]">
        {/* Accent wash, tinted by the current scene. */}
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-40"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--accent-from, #55E6EA) 40%, transparent) 0%, transparent 55%)',
          }}
        />
      </div>
    </div>
  );
}

export const MediaStage = memo(MediaStageImpl);
