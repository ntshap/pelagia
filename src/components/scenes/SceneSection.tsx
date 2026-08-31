/**
 * Scroll geometry for the descent.
 *
 * `SceneSection` is a scene's hold: one viewport of narrative, optionally
 * followed by an editorial insert that keeps the same scene on the stage.
 * `TransitionSpacer` is the scroll length a WebP sequence is scrubbed across.
 *
 * The stage itself is fixed; these elements exist purely to give the timeline
 * something to measure. Nothing heavy is ever placed in the document flow.
 */
import { memo, useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { HOLD_VH, TRANSITION_VH, type SceneDefinition } from '@/config/scenes';
import { SceneContent } from '@/components/scenes/SceneContent';
import { registerSceneSection, setTransitionProgress } from '@/hooks/useActiveScene';

export interface SceneSectionProps {
  scene: SceneDefinition;
  index: number;
  /** Editorial content that shares this scene's hold. */
  children?: ReactNode;
}

function SceneSectionImpl({ scene, index, children }: SceneSectionProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    registerSceneSection(index, ref.current);
    return () => registerSceneSection(index, null);
  }, [index]);

  return (
    <section
      ref={ref}
      id={`scene-${scene.id}`}
      aria-label={`${scene.name} — ${scene.depth.toLocaleString()} metres`}
      className="relative"
    >
      <div className="relative" style={{ height: `${HOLD_VH}vh` }}>
        <SceneContent scene={scene} index={index} />
      </div>
      {children}
    </section>
  );
}

export const SceneSection = memo(SceneSectionImpl);

/* ------------------------------------------------------------------ *
 * Transition spacer
 * ------------------------------------------------------------------ */
export interface TransitionSpacerProps {
  index: number;
  id: string;
  label: string;
}

function TransitionSpacerImpl({ index, id, label }: TransitionSpacerProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const context = gsap.context(() => {
      // A scrubbed proxy tween rather than raw ScrollTrigger progress: `scrub`
      // only smooths an animation; 0.35s glides the frame sequence through a
      // wheel notch without letting it lag behind the scroll.
      const proxy = { value: 0 };

      gsap.to(proxy, {
        value: 1,
        ease: 'none',
        onUpdate: () => setTransitionProgress(index, proxy.value),
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.35,
          invalidateOnRefresh: true,
          // A refresh (resize, font swap, media settling) must not leave the
          // stage showing the wrong scene, so write through immediately.
          onRefresh: (self) => {
            proxy.value = self.progress;
            setTransitionProgress(index, self.progress);
          },
        },
      });
    });

    return () => context.revert();
  }, [index]);

  return (
    <div
      ref={ref}
      data-transition={id}
      aria-hidden="true"
      data-label={label}
      style={{ height: `${TRANSITION_VH}vh` }}
    />
  );
}

export const TransitionSpacer = memo(TransitionSpacerImpl);
