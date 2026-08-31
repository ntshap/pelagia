/**
 * The mission statement, held during Open Midwater.
 *
 * One sentence, a great deal of nothing around it. The only structure is a
 * hairline and two small metadata marks.
 */
import { memo, useRef } from 'react';
import { EDITORIAL_VH, missionStatement } from '@/config/scenes';
import { useReveal } from '@/hooks/useReveal';

function MissionSectionImpl() {
  const ref = useRef<HTMLDivElement | null>(null);
  useReveal(ref, { stagger: 0.12 });

  return (
    <div
      id="mission"
      className="relative flex h-full items-center"
      style={{ minHeight: `${EDITORIAL_VH.mission}vh` }}
    >
      <div className="page-shell relative">
        <div ref={ref} className="mx-auto max-w-[62rem]">
          <blockquote
            data-anim
            className="display text-center text-[clamp(2rem,3.9vw,3.4rem)] text-paper"
          >
            <p className="text-balance">&ldquo;{missionStatement}&rdquo;</p>
          </blockquote>

          <div data-anim className="mt-14 flex justify-center">
            <span className="metadata">Pelagia Research Council</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MissionSection = memo(MissionSectionImpl);
