/**
 * Expedition journal.
 *
 * Three short field entries, set as a ruled list. Date, depth and location are
 * the metadata line; the note underneath is written the way a log is written.
 */
import { memo, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { EDITORIAL_VH, journalEntries } from '@/config/scenes';
import { useReveal } from '@/hooks/useReveal';

function JournalSectionImpl() {
  const ref = useRef<HTMLDivElement | null>(null);
  useReveal(ref, { stagger: 0.08 });

  return (
    <div id="journal" className="relative flex items-center" style={{ minHeight: `${EDITORIAL_VH.journal}vh` }}>
      <div className="page-shell relative">
        <div ref={ref} className="mx-auto max-w-[68rem]">
          <p data-anim className="metadata">Expedition journal</p>

          <ul className="mt-10">
            {journalEntries.map((entry) => (
              <li key={entry.title} data-anim>
                <article className="group grid cursor-pointer grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-baseline gap-10 py-7 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-2">
                  <span className="metadata transition-colors duration-500 group-hover:text-white/85">{entry.date}</span>

                  <div className="min-w-0">
                    <h3 className="display flex items-baseline gap-3 text-[clamp(1.45rem,2.1vw,1.95rem)] text-paper">
                      {entry.title}
                      <ArrowUpRight
                        size={15}
                        aria-hidden
                        className="shrink-0 translate-y-px text-haze-dim opacity-0 transition-all duration-400 group-hover:translate-x-1 group-hover:opacity-100"
                      />
                    </h3>
                    <p className="mt-4 max-w-[52ch] text-[1rem] leading-[1.45] text-paper/80 transition-colors duration-500 group-hover:text-paper">
                      {entry.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export const JournalSection = memo(JournalSectionImpl);
