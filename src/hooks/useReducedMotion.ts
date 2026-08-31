import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DESKTOP_QUERY = '(min-width: 1024px)';

function makeMediaStore(query: string) {
  let mql: MediaQueryList | null = null;

  const get = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    mql ??= window.matchMedia(query);
    return mql.matches;
  };

  const subscribe = (onChange: () => void): (() => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    mql ??= window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql?.removeEventListener('change', onChange);
  };

  return { get, subscribe };
}

const reducedMotionStore = makeMediaStore(REDUCED_MOTION_QUERY);
const desktopStore = makeMediaStore(DESKTOP_QUERY);

/** True when the visitor has asked the system for reduced motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    reducedMotionStore.subscribe,
    reducedMotionStore.get,
    () => false,
  );
}

/** Non-reactive read, for imperative code that runs before paint. */
export function prefersReducedMotion(): boolean {
  return reducedMotionStore.get();
}

/**
 * The expedition is a desktop experience. Below 1024px we never load idle
 * videos or WebP sequences at all.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(desktopStore.subscribe, desktopStore.get, () => true);
}

export function isDesktopViewport(): boolean {
  return desktopStore.get();
}
