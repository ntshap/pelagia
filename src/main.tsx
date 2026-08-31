import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

import App from '@/App';
import '@/styles/globals.css';
import { residentSequences, schedulerStats } from '@/hooks/useFrameSequence';
import { getLiveTimeline } from '@/hooks/useActiveScene';

/* Registered exactly once, before any component builds a trigger. */
gsap.registerPlugin(ScrollTrigger);

/* Native scrolling drives everything; ScrollTrigger only listens. */
ScrollTrigger.config({
  ignoreMobileResize: true,
  autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
});

/* A dropped frame must not stall the scrub, but the page should not fast-forward
 * after a long tab-switch either. */
gsap.ticker.lagSmoothing(220, 22);

/* The browser restoring a mid-page scroll before the timeline is measured puts
 * the stage on the wrong scene, so the expedition always starts at the surface. */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

/* A development-only window into the media pipeline. Stripped from builds. */
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__pelagia', {
    value: { residentSequences, schedulerStats, getLiveTimeline, ScrollTrigger, gsap },
    configurable: true,
  });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('PELAGIA: #root container is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
