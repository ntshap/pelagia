/**
 * The shared entrance/exit for editorial content.
 *
 * Same grammar as the scene copy — opacity, a short lift, a small scale settle
 * and a stagger — but on its own trigger so it is never bound to the transition
 * scrub. Deliberately no blur: animating a filter repaints every element on
 * every frame, where opacity and transform stay on the compositor. Every instance is created inside a gsap.context and reverted on
 * unmount, so no ScrollTrigger or tween outlives its component.
 */
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface RevealOptions {
  /** Selector for the elements to stagger. Defaults to `[data-anim]`. */
  selector?: string;
  start?: string;
  end?: string;
  stagger?: number;
  y?: number;
  /** Starting scale. 1 disables the settle. */
  scale?: number;
  /** Re-hide and replay when the block is scrolled past and back. */
  replay?: boolean;
}

export function useReveal(
  ref: RefObject<HTMLElement | null>,
  options: RevealOptions = {},
): void {
  const reducedMotion = useReducedMotion();

  const {
    selector = '[data-anim]',
    start = 'top 84%',
    end = 'bottom 16%',
    stagger = 0.08,
    y = 28,
    scale = 0.985,
    replay = true,
  } = options;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (!items.length) return;

    if (reducedMotion) {
      gsap.set(items, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const context = gsap.context(() => {
      gsap.set(items, { opacity: 0, y, scale });

      const enter = () =>
        gsap.to(items, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.05,
          ease: 'power3.out',
          stagger,
          overwrite: 'auto',
          // Drop the compositing hint once the block has settled.
          onComplete: () => gsap.set(items, { clearProps: 'willChange' }),
        });

      const exit = (direction: number) =>
        gsap.to(items, {
          opacity: 0,
          y: direction >= 0 ? -20 : 20,
          scale,
          duration: 0.55,
          ease: 'power2.inOut',
          stagger: stagger * 0.45,
          overwrite: 'auto',
        });

      ScrollTrigger.create({
        trigger: root,
        start,
        end,
        invalidateOnRefresh: true,
        onEnter: () => enter(),
        onEnterBack: () => enter(),
        onLeave: () => (replay ? exit(1) : undefined),
        onLeaveBack: () => (replay ? exit(-1) : undefined),
      });
    }, root);

    return () => context.revert();
  }, [ref, reducedMotion, selector, start, end, stagger, y, scale, replay]);
}
