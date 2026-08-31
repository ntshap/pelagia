/**
 * The footer.
 *
 * The only place on the page with an opaque ground — it closes the descent and
 * gives the fixed stage somewhere to end.
 */
import { memo, useCallback, type MouseEvent } from 'react';
import { footerLinks } from '@/config/scenes';
import { PelagiaMark } from '@/components/layout/PelagiaMark';
import { scrollToHash } from '@/hooks/useActiveScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function FooterImpl() {
  const reducedMotion = useReducedMotion();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      event.preventDefault();
      scrollToHash(href, !reducedMotion);
    },
    [reducedMotion],
  );

  const year = 2026;

  return (
    <footer className="relative border-t border-paper/10 bg-abyss">
      <div className="page-shell py-20">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] gap-16">
          <div>
            <div className="flex items-center gap-3.5">
              <PelagiaMark size={30} tone="#FDF1E1" accent="#55E6EA" />
              <span className="text-lg font-semibold text-white">pelagia</span>
            </div>
            <p className="mt-7 max-w-[36ch] text-[1rem] leading-[1.45] text-paper/65">
              An independent deep ocean research organisation. Instrumentation, restoration
              and long-duration observation across six ocean basins.
            </p>
            <p className="metadata mt-8">North Pacific field station / 47.62°N 122.35°W</p>
          </div>

          <nav aria-label="Sections">
            <h2 className="metadata">Navigate</h2>
            <ul className="mt-6 flex flex-col gap-3.5">
              {footerLinks.navigate.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(event) => handleClick(event, link.href)}
                    className="text-[1rem] text-paper/70 transition-colors duration-300 hover:text-paper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Connect">
            <h2 className="metadata">Connect</h2>
            <ul className="mt-6 flex flex-col gap-3.5">
              {footerLinks.connect.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(event) => handleClick(event, link.href)}
                    className="text-[1rem] text-paper/70 transition-colors duration-300 hover:text-paper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-20 flex items-baseline justify-between border-t border-paper/10 pt-8">
          <p className="metadata">
            © {year} Pelagia — deep ocean research. All rights reserved.
          </p>
          <p className="metadata">Expedition 07 / North Pacific</p>
        </div>
      </div>
    </footer>
  );
}

export const Footer = memo(FooterImpl);
