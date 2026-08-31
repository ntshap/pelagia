/**
 * The closing call to action, held on the Abyssal Observatory.
 */
import { memo, useRef } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { EDITORIAL_VH, finalCta } from '@/config/scenes';
import { useReveal } from '@/hooks/useReveal';

function FinalCTAImpl() {
  const ref = useRef<HTMLDivElement | null>(null);
  useReveal(ref, { stagger: 0.1 });

  const lines = finalCta.headline.split('\n');

  return (
    <div id="final-cta" className="relative flex items-center" style={{ minHeight: `${EDITORIAL_VH.finalCta}vh` }}>
      <div className="page-shell relative">
        <div ref={ref} className="mx-auto flex max-w-[60rem] flex-col items-center text-center">
          <span data-anim className="metadata">
            The next expedition
          </span>

          <h2
            data-anim
            className="display mt-8 text-[clamp(2.6rem,5vw,4.75rem)] text-paper"
          >
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>

          <p data-anim className="measure mt-8 text-[1.14rem] leading-[1.34] text-paper/80">
            Every expedition is funded, planned and published in the open. Join the people
            who make the next descent possible.
          </p>

          <div data-anim className="mt-12 flex flex-wrap items-center justify-center gap-4">
            {finalCta.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={action.primary ? 'group pill' : 'group pill-quiet'}
              >
                {action.label}
                {action.primary ? (
                  <ArrowRight
                    size={14}
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                ) : (
                  <BookOpen size={14} aria-hidden />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const FinalCTA = memo(FinalCTAImpl);
