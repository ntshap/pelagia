/**
 * Research cards.
 *
 * One card per programme, revealed progressively — Canyon, Bioluminescent,
 * Nursery — rather than as a row of three. The transparent PNG object is the
 * card: no photograph plate behind it, no glass panel, just the cutout, a
 * hairline frame and a scientific index.
 */
import { memo, useCallback, useRef, type PointerEvent, type SyntheticEvent } from 'react';
import { EDITORIAL_VH, FOREGROUND_ASSETS, type ResearchCard } from '@/config/scenes';
import { mediaUrl } from '@/config/media';
import { useReveal } from '@/hooks/useReveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ResearchCardBlockProps {
  card: ResearchCard;
  /** Alternates the object between the two sides of the column. */
  flip?: boolean;
  /** Marks the section anchor used by the header's "Research" link. */
  anchor?: boolean;
}

function ResearchCardBlockImpl({ card, flip = false, anchor = false }: ResearchCardBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const objectRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  useReveal(ref, { stagger: 0.07 });

  /* A few pixels of pointer lean — enough to feel alive, not enough to play. */
  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const element = objectRef.current;
      const host = event.currentTarget;
      if (!element) return;
      const rect = host.getBoundingClientRect();
      const dx = (event.clientX - rect.left) / rect.width - 0.5;
      const dy = (event.clientY - rect.top) / rect.height - 0.5;
      element.style.transform = `translate3d(${(dx * 14).toFixed(2)}px, ${(dy * 10).toFixed(2)}px, 0) scale(1.02)`;
    },
    [reducedMotion],
  );

  const handlePointerLeave = useCallback(() => {
    const element = objectRef.current;
    if (element) element.style.transform = 'translate3d(0,0,0) scale(1)';
  }, []);

  const handleImageError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = 'none';
  }, []);

  return (
    <div
      id={anchor ? 'research' : undefined}
      className="relative flex items-center"
      style={{ minHeight: `${EDITORIAL_VH.researchCard}vh` }}
    >
      <div className="page-shell relative">
        <div
          ref={ref}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className={[
            'group relative mx-auto flex w-full max-w-[64rem] items-center gap-12',
            flip ? 'flex-row-reverse' : 'flex-row',
          ].join(' ')}
        >
          {/* The object is the visual. */}
          <div
            data-anim
            className="relative w-[44%] shrink-0"
            aria-hidden={card.alt.length === 0 || undefined}
          >
            <div
              ref={objectRef}
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: 'translate3d(0,0,0) scale(1)' }}
            >
              <img
                src={mediaUrl(FOREGROUND_ASSETS[card.asset])}
                alt={card.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={handleImageError}
                className="h-auto w-full select-none"
                style={{
                  filter: `drop-shadow(0 30px 60px color-mix(in srgb, ${card.accent} 22%, transparent))`,
                }}
              />
            </div>
          </div>

          {/* The programme reads as a solid paper card set against the cutout. */}
          <div data-anim className="glass-card min-w-0 flex-1 p-6 sm:p-8">
            <span className="card-kicker">{card.category}</span>

            <h3 className="card-title text-[clamp(1.6rem,2.4vw,2.1rem)]">
              {card.title}
            </h3>

            <p className="card-body max-w-[42ch]">
              {card.description[0]} {card.description[1]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ResearchCardBlock = memo(ResearchCardBlockImpl);
