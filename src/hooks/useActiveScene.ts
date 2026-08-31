/**
 * The timeline store.
 *
 * GSAP writes scroll state here every animation frame; React reads only the
 * parts that change rarely. Anything that changes per-frame (depth readout,
 * canvas frame index, parallax offsets) is consumed through `subscribeFrame`
 * and written straight to the DOM, so no component re-renders while scrolling.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { scenes, sceneCount, transitionIds } from '@/config/scenes';
import { HANDOFF } from '@/config/choreography';

/** Fields that change rarely enough to drive React renders. */
export interface DiscreteTimelineState {
  sceneIndex: number;
  /** -1 when no transition is in flight. */
  transitionIndex: number;
  /**
   * Which scene's idle clip may run. -1 through the body of a transition, when
   * the WebP sequence owns the stage and every video should be paused.
   */
  playingSceneIndex: number;
  /** True once the hero has been left behind. */
  pastHero: boolean;
}

/** Live, mutable per-frame state. The object identity never changes. */
export interface LiveTimelineState {
  sceneIndex: number;
  transitionIndex: number;
  transitionProgress: number;
  depth: number;
  pageProgress: number;
  scrollY: number;
  /** +1 scrolling down, -1 scrolling up. */
  direction: number;
}

const transitionCount = transitionIds.length;
const progressPerTransition = new Array<number>(transitionCount).fill(0);

const live: LiveTimelineState = {
  sceneIndex: 0,
  transitionIndex: -1,
  transitionProgress: 0,
  depth: scenes[0].depth,
  pageProgress: 0,
  scrollY: 0,
  direction: 1,
};

let discrete: DiscreteTimelineState = {
  sceneIndex: 0,
  transitionIndex: -1,
  playingSceneIndex: 0,
  pastHero: false,
};

const discreteListeners = new Set<() => void>();
const frameListeners = new Set<(state: LiveTimelineState) => void>();

const sceneSections: (HTMLElement | null)[] = new Array(sceneCount).fill(null);

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Smoothstep keeps the depth readout from snapping at the transition edges. */
function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function emitDiscrete(next: DiscreteTimelineState): void {
  if (
    next.sceneIndex === discrete.sceneIndex &&
    next.transitionIndex === discrete.transitionIndex &&
    next.playingSceneIndex === discrete.playingSceneIndex &&
    next.pastHero === discrete.pastHero
  ) {
    return;
  }
  discrete = next;
  discreteListeners.forEach((listener) => listener());
}

function recompute(): void {
  // The last transition still strictly in flight owns the stage.
  let activeTransition = -1;
  let activeProgress = 0;
  let crossed = 0;

  for (let i = 0; i < transitionCount; i += 1) {
    const p = progressPerTransition[i];
    if (p >= 0.5) crossed += 1;
    if (p > 0.0001 && p < 0.9999) {
      activeTransition = i;
      activeProgress = p;
    }
  }

  const sceneIndex = Math.min(crossed, sceneCount - 1);

  live.sceneIndex = sceneIndex;
  live.transitionIndex = activeTransition;
  live.transitionProgress = activeProgress;

  if (activeTransition >= 0) {
    const from = scenes[activeTransition].depth;
    const to = scenes[Math.min(activeTransition + 1, sceneCount - 1)].depth;
    live.depth = from + (to - from) * smoothstep(activeProgress);
  } else {
    live.depth = scenes[sceneIndex].depth;
  }

  // Only one clip may run at a time. Through the body of a transition none do.
  let playingSceneIndex = sceneIndex;
  if (activeTransition >= 0) {
    if (activeProgress < HANDOFF.outgoingPlayUntil) {
      playingSceneIndex = activeTransition;
    } else if (activeProgress >= HANDOFF.incomingPlayFrom) {
      playingSceneIndex = Math.min(activeTransition + 1, sceneCount - 1);
    } else {
      playingSceneIndex = -1;
    }
  }

  emitDiscrete({
    sceneIndex,
    transitionIndex: activeTransition,
    playingSceneIndex,
    pastHero: progressPerTransition[0] > 0.12,
  });

  frameListeners.forEach((listener) => listener(live));
}

let dirty = true;
let maxScroll = 1;

/** Called by the ScrollTrigger scrub tweens. Batched into the next tick. */
export function setTransitionProgress(index: number, progress: number): void {
  if (index < 0 || index >= transitionCount) return;
  const next = clamp01(progress);
  if (progressPerTransition[index] === next) return;
  progressPerTransition[index] = next;
  dirty = true;
}

/** Cached on refresh/resize so the per-frame tick never forces a layout. */
export function refreshScrollExtent(): void {
  maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  dirty = true;
}

/**
 * The single per-frame entry point, driven by gsap.ticker. Scroll position and
 * transition progress are folded into one recompute, so however many triggers
 * fire, subscribers are notified at most once per browser frame.
 */
export function tickTimeline(): void {
  const scrollY = window.scrollY;
  if (scrollY === live.scrollY && !dirty) return;

  if (scrollY !== live.scrollY) {
    live.direction = scrollY > live.scrollY ? 1 : -1;
    live.scrollY = scrollY;
  }
  live.pageProgress = clamp01(scrollY / maxScroll);
  dirty = false;
  recompute();
}

export function getLiveTimeline(): LiveTimelineState {
  return live;
}

export function subscribeFrame(listener: (state: LiveTimelineState) => void): () => void {
  frameListeners.add(listener);
  listener(live);
  return () => {
    frameListeners.delete(listener);
  };
}

function subscribeDiscrete(listener: () => void): () => void {
  discreteListeners.add(listener);
  return () => {
    discreteListeners.delete(listener);
  };
}

function getDiscrete(): DiscreteTimelineState {
  return discrete;
}

/** Full discrete state — re-renders only when one of its three fields changes. */
export function useTimelineState(): DiscreteTimelineState {
  return useSyncExternalStore(subscribeDiscrete, getDiscrete, getDiscrete);
}

/** Convenience: the index of the scene currently owning the stage. */
export function useActiveScene(): number {
  return useTimelineState().sceneIndex;
}

/* ------------------------------------------------------------------ *
 * Section registry — lets the navigator scroll to a scene without
 * components having to know about each other.
 * ------------------------------------------------------------------ */
const sceneTops: number[] = new Array(sceneCount).fill(0);
const sceneHeights: number[] = new Array(sceneCount).fill(1);

export function registerSceneSection(index: number, element: HTMLElement | null): void {
  sceneSections[index] = element;
}

/**
 * Caches section geometry so per-frame parallax never calls
 * getBoundingClientRect. Re-run from ScrollTrigger's refresh.
 */
export function refreshSceneMetrics(): void {
  const scrollY = window.scrollY;
  for (let i = 0; i < sceneCount; i += 1) {
    const element = sceneSections[i];
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    sceneTops[i] = rect.top + scrollY;
    sceneHeights[i] = Math.max(1, rect.height);
  }
}

export function getSceneTop(index: number): number {
  return sceneTops[index] ?? 0;
}

export function getSceneHeight(index: number): number {
  return sceneHeights[index] ?? 1;
}

export function scrollToScene(index: number, smooth: boolean): void {
  const element = sceneSections[index];
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

export function scrollToHash(hash: string, smooth: boolean): boolean {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  const element = document.getElementById(id);
  if (!element) return false;
  const top = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  return true;
}

/* ------------------------------------------------------------------ *
 * Per-frame DOM binding helper
 * ------------------------------------------------------------------ */

/**
 * Runs `callback` on every timeline update with the live state. The callback is
 * kept in a ref so an inline arrow function does not resubscribe each render.
 */
export function useTimelineFrame(callback: (state: LiveTimelineState) => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => subscribeFrame((state) => ref.current(state)), []);
}

/**
 * A throttled numeric readout, e.g. the header depth value. Re-renders at most
 * once per `step` change instead of once per frame.
 */
export function useSteppedDepth(step = 1): number {
  const [value, setValue] = useState(() => Math.round(live.depth / step) * step);
  const lastRef = useRef(value);

  const handler = useCallback(
    (state: LiveTimelineState) => {
      const next = Math.round(state.depth / step) * step;
      if (next !== lastRef.current) {
        lastRef.current = next;
        setValue(next);
      }
    },
    [step],
  );

  useTimelineFrame(handler);
  return value;
}

/** Resets the store — used when the stage unmounts (e.g. dropping to mobile). */
export function resetTimeline(): void {
  progressPerTransition.fill(0);
  dirty = true;
  recompute();
}
