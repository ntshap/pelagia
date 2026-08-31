/**
 * Impact figures.
 *
 * An editorial data table rather than four dashboard tiles: a ruled column,
 * numerals set large and light, and a short note in the margin. The figures
 * count up once, in place, when the block arrives.
 */
import { memo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { EDITORIAL_VH, impactStats } from '@/config/scenes';
import { useReveal } from '@/hooks/useReveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function ImpactSectionImpl() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  useReveal(ref, { stagger: 0.07 });

  /* Count the numerals up once, the first time the block is reached. */
  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;

    const values = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'));
    if (!values.length) return;

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top 78%',
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => {
          values.forEach((element) => {
            const target = Number(element.dataset.count ?? '0');
            const decimals = (element.dataset.decimals ?? '0') === '1' ? 1 : 0;
            const counter = { value: 0 };
            gsap.to(counter, {
              value: target,
              duration: 1.4,
              ease: 'power2.out',
              onUpdate: () => {
                element.textContent = counter.value.toFixed(decimals);
              },
            });
          });
        },
      });
    }, root);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <div id="impact" className="relative flex items-center" style={{ minHeight: `${EDITORIAL_VH.impact}vh` }}>
      <div className="page-shell relative">
        <div ref={ref} className="mx-auto max-w-[68rem]">
          <p data-anim className="metadata">Measured impact</p>

          <dl className="mt-10">
            {impactStats.map((stat) => {
              const numeric = Number(stat.value);
              const decimals = stat.value.includes('.') ? 1 : 0;
              return (
                <div
                  key={stat.label}
                  data-anim
                  className="group grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] items-baseline gap-10 py-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-2"
                >
                  <dd className="flex items-baseline gap-2">
                    <span
                      data-count={Number.isFinite(numeric) ? numeric : undefined}
                      data-decimals={decimals}
                      className="pixel-num text-[clamp(2.2rem,3.6vw,3.4rem)] text-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
                    >
                      {reducedMotion ? stat.value : '0'}
                    </span>
                    <span className="metadata">{stat.unit}</span>
                  </dd>

                  <dt className="text-[1.1rem] leading-[1.2] text-paper/80 transition-colors duration-500 group-hover:text-paper">{stat.label}</dt>
                </div>
              );
            })}
          </dl>

        </div>
      </div>
    </div>
  );
}

export const ImpactSection = memo(ImpactSectionImpl);
