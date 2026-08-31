/**
 * PELAGIA — one landing page, eight scenes, seven scrubbed transitions.
 *
 * The page is a plain, natively scrolled document. Everything visual lives on
 * one fixed stage; the sections below only supply scroll length and copy. GSAP
 * ScrollTrigger reads the native scroll position — there is no scroll snapping,
 * no wheel interception and no smoothing library.
 */
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

import {
  EDITORIAL_VH,
  mediaSpineVh,
  researchCards,
  scenes,
  totalTimelineVh,
} from '@/config/scenes';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SceneNavigation } from '@/components/layout/SceneNavigation';
import { MediaStage } from '@/components/media/MediaStage';
import { LoadingScreen } from '@/components/media/LoadingScreen';
import { SceneSection, TransitionSpacer } from '@/components/scenes/SceneSection';
import { MobileNotice } from '@/components/layout/MobileNotice';

import { useInitialPreload } from '@/hooks/useMediaPreloader';
import { useIsDesktop, useReducedMotion } from '@/hooks/useReducedMotion';
import {
  refreshSceneMetrics,
  refreshScrollExtent,
  tickTimeline,
} from '@/hooks/useActiveScene';

/* Editorial blocks are split out of the first-load bundle. Each one is
 * rendered into a slot that already reserves its exact height, so a chunk
 * arriving late cannot move the timeline underneath the visitor. */
const MissionSection = lazy(() =>
  import('@/components/sections/MissionSection').then((m) => ({ default: m.MissionSection })),
);
const ResearchCardBlock = lazy(() =>
  import('@/components/sections/ResearchCards').then((m) => ({ default: m.ResearchCardBlock })),
);
const ImpactSection = lazy(() =>
  import('@/components/sections/ImpactSection').then((m) => ({ default: m.ImpactSection })),
);
const JournalSection = lazy(() =>
  import('@/components/sections/JournalSection').then((m) => ({ default: m.JournalSection })),
);
const FinalCTA = lazy(() =>
  import('@/components/sections/FinalCTA').then((m) => ({ default: m.FinalCTA })),
);

/** Reserves a lazy block's height and re-measures the timeline once it lands. */
function EditorialSlot({ heightVh, children }: { heightVh: number; children: ReactNode }) {
  return (
    <div style={{ minHeight: `${heightVh}vh` }}>
      <Suspense fallback={<div style={{ height: `${heightVh}vh` }} aria-hidden />}>
        {children}
      </Suspense>
    </div>
  );
}

const cardByScene = new Map(researchCards.map((card) => [card.scene, card]));

export default function App() {
  const isDesktop = useIsDesktop();
  const reducedMotion = useReducedMotion();
  const { progress, ready } = useInitialPreload(isDesktop, !reducedMotion);
  const [loaderDismissed, setLoaderDismissed] = useState(false);

  /* ------------------------------------------------------------------ *
   * One ticker for the whole timeline.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDesktop) return;

    const onRefresh = () => {
      refreshScrollExtent();
      refreshSceneMetrics();
    };

    ScrollTrigger.addEventListener('refresh', onRefresh);
    gsap.ticker.add(tickTimeline);
    onRefresh();

    const onResize = () => onRefresh();
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      gsap.ticker.remove(tickTimeline);
      ScrollTrigger.removeEventListener('refresh', onRefresh);
    };
  }, [isDesktop]);

  /* Media settles at its own pace; re-measure once the opening scene is up. */
  useEffect(() => {
    if (!isDesktop || !ready) return;
    const handle = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(handle);
  }, [isDesktop, ready]);

  const handleLoaderDismissed = useCallback(() => {
    setLoaderDismissed(true);
    ScrollTrigger.refresh();
  }, []);

  /* A deep link should land on its section once the timeline is measured. */
  useEffect(() => {
    if (!isDesktop || !loaderDismissed) return;
    const { hash } = window.location;
    if (!hash || hash === '#top') return;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY });
      ScrollTrigger.refresh();
    }
  }, [isDesktop, loaderDismissed]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Keeps the page-length budget honest during development.
    console.info(
      `[pelagia] media spine ${mediaSpineVh}vh (8 holds + 7 transitions), ` +
        `document ${totalTimelineVh}vh incl. editorial inserts`,
    );
  }, []);

  if (!isDesktop) return <MobileNotice />;

  return (
    <>
      <a className="pelagia-skip-link" href="#mission">
        Skip to the mission statement
      </a>

      {/* The fixed stage — every pixel of imagery on the site. */}
      <MediaStage reducedMotion={reducedMotion} />

      {/* Fixed interface first in the DOM so keyboard focus reaches the
       *  navigation before the narrative, even though both are painted above
       *  the stage by z-index rather than document order. */}
      <Header />
      <SceneNavigation />

      {/* Layer 7 — narrative content, scrolling above the stage. */}
      <main id="top" className="relative z-10">
        {scenes.map((scene, index) => {
          const card = cardByScene.get(scene.id);
          return (
            <div key={scene.id}>
              <SceneSection scene={scene} index={index}>
                {scene.id === 'midwater' ? (
                  <EditorialSlot heightVh={EDITORIAL_VH.mission}>
                    <MissionSection />
                  </EditorialSlot>
                ) : null}

                {card ? (
                  <EditorialSlot heightVh={EDITORIAL_VH.researchCard}>
                    <ResearchCardBlock
                      card={card}
                      flip={index % 2 === 1}
                      anchor={card.scene === 'canyon'}
                    />
                  </EditorialSlot>
                ) : null}

                {scene.id === 'laboratory' ? (
                  <EditorialSlot heightVh={EDITORIAL_VH.impact}>
                    <ImpactSection />
                  </EditorialSlot>
                ) : null}

                {scene.id === 'hydrothermal' ? (
                  <EditorialSlot heightVh={EDITORIAL_VH.journal}>
                    <JournalSection />
                  </EditorialSlot>
                ) : null}

                {scene.id === 'observatory' ? (
                  <EditorialSlot heightVh={EDITORIAL_VH.finalCta}>
                    <FinalCTA />
                  </EditorialSlot>
                ) : null}
              </SceneSection>

              {scene.transitionToNext ? (
                <TransitionSpacer
                  index={index}
                  id={scene.transitionToNext}
                  label={`${scene.name} to ${scenes[index + 1]?.name ?? ''}`}
                />
              ) : null}
            </div>
          );
        })}
      </main>

      <div className="relative z-10">
        <Footer />
      </div>

      {!loaderDismissed ? (
        <LoadingScreen
          progress={progress}
          ready={ready}
          onDismissed={handleLoaderDismissed}
        />
      ) : null}
    </>
  );
}
