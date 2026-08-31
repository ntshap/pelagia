/**
 * The right-hand scene navigator.
 *
 * Eight nodes on a thin line, a travelling fill that tracks the descent, and a
 * live depth reading. The fill and the node scaling are written to the DOM from
 * the timeline subscription, so scrolling never re-renders this component.
 */
import { memo, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { scenes } from '@/config/scenes';
import { DepthIndicator } from '@/components/scenes/DepthIndicator';
import { scrollToScene, subscribeFrame, useTimelineState } from '@/hooks/useActiveScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function SceneNavigationImpl() {
  const { sceneIndex } = useTimelineState();
  const reducedMotion = useReducedMotion();

  const fillRef = useRef<HTMLSpanElement | null>(null);
  const nodeRefs = useRef<Map<number, HTMLElement>>(new Map());

  const setNodeRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) nodeRefs.current.set(index, element);
    else nodeRefs.current.delete(index);
  }, []);

  useEffect(() => {
    const stops = scenes.length - 1;
    return subscribeFrame((state) => {
      // Continuous position along the eight nodes, including part-way through
      // a transition, so the fill never jumps between scenes.
      const travelled =
        state.transitionIndex >= 0
          ? state.transitionIndex + state.transitionProgress
          : state.sceneIndex;

      const fill = fillRef.current;
      if (fill) fill.style.transform = `scaleY(${(travelled / stops).toFixed(4)})`;

      nodeRefs.current.forEach((element, index) => {
        const distance = Math.abs(travelled - index);
        const closeness = distance >= 1 ? 0 : 1 - distance;
        element.style.setProperty('--node-closeness', closeness.toFixed(3));
      });
    });
  }, []);

  const handleJump = useCallback(
    (index: number) => scrollToScene(index, !reducedMotion),
    [reducedMotion],
  );

  return (
    <nav
      aria-label="Scene navigation"
      className="fixed right-10 top-1/2 z-[70] hidden -translate-y-1/2 lg:block"
    >
      {/* A soft wash so the nodes stay legible over the bright scenes too. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-12 -left-14 -right-12"
        style={{
          background:
            'linear-gradient(270deg, color-mix(in srgb, #02070B 38%, transparent) 0%, color-mix(in srgb, #02070B 16%, transparent) 58%, transparent 100%)',
          // Feather the top and bottom so the wash has no visible box edge.
          maskImage:
            'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
        }}
      />

      <ol className="relative flex flex-col gap-7">
        {/* The connecting line, and its travelled portion. */}
        <span
          aria-hidden="true"
          className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-white/14"
        />
        <span
          ref={fillRef}
          aria-hidden="true"
          className="absolute left-[5px] top-1.5 bottom-1.5 w-px origin-top bg-cyan/70"
          style={{ transform: 'scaleY(0)' }}
        />

        {scenes.map((scene, index) => {
          const isActive = index === sceneIndex;
          return (
            <li key={scene.id} className="relative">
              <button
                type="button"
                ref={(element) => setNodeRef(index, element)}
                onClick={() => handleJump(index)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Scene ${scene.number}: ${scene.name}, ${scene.depth.toLocaleString()} metres`}
                className="group flex items-center gap-4"
                style={{ '--node-accent': scene.accent } as CSSProperties}
              >
                {/* Node */}
                <span
                  aria-hidden="true"
                  className="relative flex h-[11px] w-[11px] shrink-0 items-center justify-center"
                >
                  <span
                    className="absolute inset-0 rounded-full border transition-colors duration-300"
                    style={{
                      borderColor: isActive
                        ? 'var(--node-accent)'
                        : 'color-mix(in srgb, #F6FAFC 26%, transparent)',
                      backgroundColor: '#02070B',
                      transform:
                        'scale(calc(0.62 + var(--node-closeness, 0) * 0.58))',
                      transition: 'transform 260ms cubic-bezier(0.16,1,0.3,1), border-color 300ms',
                    }}
                  />
                  <span
                    className="h-[3px] w-[3px] rounded-full transition-opacity duration-300"
                    style={{
                      backgroundColor: 'var(--node-accent)',
                      opacity: 'var(--node-closeness, 0)',
                    }}
                  />
                </span>

                {/* Label — only the active scene names itself. */}
                <span
                  aria-hidden="true"
                  className="flex items-baseline gap-2 whitespace-nowrap transition-all duration-400"
                  style={{
                    opacity: 'calc(0.22 + var(--node-closeness, 0) * 0.78)',
                    transform: 'translateX(calc((1 - var(--node-closeness, 0)) * -4px))',
                  }}
                >
                  <span
                    className={[
                      'text-[0.9rem] transition-[max-width,opacity] duration-500',
                      isActive
                        ? 'max-w-[8rem] text-paper opacity-100'
                        : 'max-w-0 overflow-hidden opacity-0 group-hover:max-w-[8rem] group-hover:opacity-70',
                    ].join(' ')}
                  >
                    {scene.shortName}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Live depth. */}
      <div className="relative mt-10 flex flex-col items-start gap-1 border-t border-paper/12 pt-5">
        <span className="metadata">Depth</span>
        <DepthIndicator
          className="flex items-baseline"
          valueClassName="numeral text-[2rem] text-paper"
          unitClassName="metadata ml-1.5"
          step={1}
        />
      </div>
    </nav>
  );
}

export const SceneNavigation = memo(SceneNavigationImpl);
