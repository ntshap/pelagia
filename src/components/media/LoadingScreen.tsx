/**
 * The opening loader.
 *
 * It waits for exactly three things — the scene 1 poster, the scene 1 idle
 * clip's metadata, and the head of the first WebP sequence — then gets out of
 * the way. A timeout in useInitialPreload lets the visitor in regardless, so a
 * single failed asset can never hold the expedition.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { PelagiaMark } from '@/components/layout/PelagiaMark';

const FADE_MS = 620;

export interface LoadingScreenProps {
  progress: number;
  ready: boolean;
  onDismissed: () => void;
}

function LoadingScreenImpl({ progress, ready, onDismissed }: LoadingScreenProps) {
  const [hidden, setHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dismissedRef = useRef(false);

  /* The bar only ever advances — a re-measured asset must not walk it back. */
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown((previous) => Math.max(previous, ready ? 1 : progress));
  }, [progress, ready]);

  useEffect(() => {
    if (!ready || dismissedRef.current) return;
    dismissedRef.current = true;

    const timer = window.setTimeout(() => {
      setHidden(true);
      onDismissed();
    }, FADE_MS);

    const root = rootRef.current;
    if (root) {
      root.style.transition = `opacity ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      root.style.opacity = '0';
    }

    return () => window.clearTimeout(timer);
  }, [ready, onDismissed]);

  if (hidden) return null;

  const percent = Math.round(shown * 100);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-abyss"
      role="status"
      aria-live="polite"
      aria-busy={!ready}
    >
      <PelagiaMark size={40} tone="#FDF1E1" accent="#55E6EA" />

      <p className="mt-7 text-lg font-semibold text-white">pelagia</p>

      <div className="mt-12 w-[min(26rem,52vw)]">
        <div className="h-px w-full bg-white/15">
          <div
            className="h-px bg-white"
            style={{
              width: `${percent}%`,
              transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="metadata">Preparing expedition</span>
          <span className="numeral text-[1.1rem] text-paper">
            {String(percent).padStart(3, '0')}
          </span>
        </div>
      </div>

      <p className="mt-16 max-w-xs text-center text-[0.9rem] leading-relaxed text-haze-dim">
        Loading surface conditions — North Pacific
      </p>
    </div>
  );
}

export const LoadingScreen = memo(LoadingScreenImpl);
