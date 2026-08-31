/**
 * The narrative block for one scene.
 *
 * Text animates on its own trigger, independently of the background, so it is
 * never tied to the transition scrub. Entrance staggers eyebrow → headline →
 * description → actions; exit lifts in the direction of travel.
 * The copy sits directly on the plate — there is no wash or scrim behind it.
 *
 * The opening scene is laid out differently — bottom-anchored, full width —
 * and delegates to `HeroScene`.
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import { ArrowDown } from 'lucide-react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { observatoryAction, type SceneDefinition } from '@/config/scenes';
import { HeroScene } from '@/components/scenes/HeroScene';
import { scrollToHash } from '@/hooks/useActiveScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const ALIGNMENT_CLASS: Record<SceneDefinition['alignment'], string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

const COLUMN_CLASS: Record<SceneDefinition['alignment'], string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
};

export interface SceneContentProps {
  scene: SceneDefinition;
  index: number;
}

function SceneContentImpl({ scene, index }: SceneContentProps) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isHero = index === 0;
  const isFinalScene = scene.id === 'observatory';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-anim]'));
    if (!items.length) return;

    if (reducedMotion) {
      gsap.set(items, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const context = gsap.context(() => {
      gsap.set(items, { opacity: 0, y: 28, scale: 0.985 });

      const enter = () =>
        gsap.to(items, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.05,
          ease: 'power3.out',
          stagger: 0.08,
          overwrite: 'auto',
          onComplete: () => gsap.set(items, { clearProps: 'willChange' }),
        });

      const exit = (direction: number) =>
        gsap.to(items, {
          opacity: 0,
          y: direction >= 0 ? -20 : 20,
          scale: 0.985,
          duration: 0.55,
          ease: 'power2.inOut',
          stagger: 0.035,
          overwrite: 'auto',
        });

      // The hero is already on screen at load — show it without waiting.
      if (isHero) enter();

      ScrollTrigger.create({
        trigger: root,
        start: 'top 82%',
        end: 'bottom 18%',
        invalidateOnRefresh: true,
        onEnter: () => enter(),
        onEnterBack: () => enter(),
        onLeave: () => exit(1),
        onLeaveBack: () => exit(-1),
      });
    }, root);

    return () => context.revert();
  }, [reducedMotion, isHero]);

  const handleAction = useCallback(
    (href: string) => scrollToHash(href, !reducedMotion),
    [reducedMotion],
  );

  /* ------------------------------------------------------------------ *
   * Opening scene — bottom-anchored, full width.
   * ------------------------------------------------------------------ */
  if (isHero) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-end">
        <div className="page-shell relative pb-8 sm:pb-12 lg:pb-16">
          <div ref={rootRef}>
            <HeroScene />
          </div>
        </div>
      </div>
    );
  }

  const headlineLines = scene.headline.split('\n');

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center">
      <div
        className={[
          'page-shell relative',
        ].join(' ')}
      >
        <div
          ref={rootRef}
          className={[
            'flex w-full max-w-[46rem] flex-col',
            ALIGNMENT_CLASS[scene.alignment],
            COLUMN_CLASS[scene.alignment],
          ].join(' ')}
        >
          <p data-anim className="eyebrow" style={{ color: scene.accent }}>
            {scene.eyebrow}
          </p>

          <h2 data-anim className="display mt-6 text-[clamp(2.4rem,4.6vw,4.2rem)] text-white">
            {headlineLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>

          <p
            data-anim
            className={[
              'measure mt-7 text-[1.14rem] leading-[1.4] text-white/80',
              scene.alignment === 'center' ? 'mx-auto' : '',
              scene.alignment === 'right' ? 'ml-auto' : '',
            ].join(' ')}
          >
            {scene.description}
          </p>

          {isFinalScene ? (
            <div data-anim className="pointer-events-auto mt-10">
              <button
                type="button"
                onClick={() => handleAction(observatoryAction.href)}
                className="group pill"
              >
                {observatoryAction.label}
                <ArrowDown
                  size={14}
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-y-0.5"
                />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const SceneContent = memo(SceneContentImpl);
