/**
 * Media scheduling.
 *
 * Two jobs:
 *  1. `useInitialPreload` — the short critical path the loading screen waits on.
 *  2. `useMediaPreloader` — the rolling look-ahead that keeps the next poster,
 *     the next idle video's metadata and the next WebP sequence warm without
 *     ever blocking the page.
 */
import { useEffect, useState } from 'react';
import { scenes, transitionIds } from '@/config/scenes';
import { PRIORITY, hasSequence, pruneSequences, warmSequence } from '@/hooks/useFrameSequence';

/* ------------------------------------------------------------------ *
 * Small caches so nothing is ever requested twice
 * ------------------------------------------------------------------ */
const imageCache = new Map<string, Promise<boolean>>();
const videoMetadataCache = new Map<string, Promise<boolean>>();
const videoProbes = new Set<HTMLVideoElement>();

/** Loads an image once. Resolves `false` on failure — it never rejects. */
export function preloadImage(src: string): Promise<boolean> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().then(
          () => resolve(true),
          () => resolve(true),
        );
      } else {
        resolve(true);
      }
    };
    image.onerror = () => resolve(false);
    image.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

/** Fetches just enough of a video for `loadedmetadata`. Never rejects. */
export function preloadVideoMetadata(src: string): Promise<boolean> {
  const cached = videoMetadataCache.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const video = document.createElement('video');
    // Held until metadata arrives: a detached element that gets collected
    // mid-flight makes the browser abort the request it just started.
    videoProbes.add(video);
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      videoProbes.delete(video);
      resolve(ok);
    };
    const onLoaded = () => finish(true);
    const onError = () => finish(false);

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.src = src;
    // Some browsers only start fetching once load() is called explicitly.
    try {
      video.load();
    } catch {
      finish(false);
    }
  });

  videoMetadataCache.set(src, promise);
  return promise;
}

/* ------------------------------------------------------------------ *
 * Initial critical path
 * ------------------------------------------------------------------ */
const INITIAL_TRANSITION_FRAMES = 12;
const LOADER_TIMEOUT_MS = 9000;

export interface InitialPreloadState {
  /** 0–1, weighted across poster / video metadata / first frames. */
  progress: number;
  ready: boolean;
  /** True when we gave up waiting and let the visitor in anyway. */
  timedOut: boolean;
}

/**
 * Waits only for: scene 1 poster, scene 1 idle metadata, and the first frames
 * of transition-01-02. Everything else streams in behind the curtain.
 */
export function useInitialPreload(active: boolean, loadSequences = true): InitialPreloadState {
  const [state, setState] = useState<InitialPreloadState>({
    progress: 0,
    ready: false,
    timedOut: false,
  });

  useEffect(() => {
    if (!active) {
      setState({ progress: 1, ready: true, timedOut: false });
      return;
    }

    let cancelled = false;
    const firstScene = scenes[0];
    const firstTransitionId = transitionIds[0];

    // Weights: the poster is the thing the visitor actually sees first.
    const WEIGHT_POSTER = 0.45;
    const WEIGHT_VIDEO = 0.15;
    const WEIGHT_FRAMES = 0.4;

    let posterDone = 0;
    let videoDone = 0;
    let framesDone = 0;

    const publish = () => {
      if (cancelled) return;
      const progress = Math.min(
        1,
        posterDone * WEIGHT_POSTER + videoDone * WEIGHT_VIDEO + framesDone * WEIGHT_FRAMES,
      );
      setState((previous) =>
        previous.ready ? previous : { ...previous, progress: Math.max(previous.progress, progress) },
      );
    };

    const finish = (timedOut: boolean) => {
      if (cancelled) return;
      setState({ progress: 1, ready: true, timedOut });
    };

    const timer = window.setTimeout(() => finish(true), LOADER_TIMEOUT_MS);

    const posterPromise = preloadImage(firstScene.poster).then((ok) => {
      posterDone = 1;
      publish();
      return ok;
    });

    const videoPromise = preloadVideoMetadata(firstScene.idleVideo).then((ok) => {
      videoDone = 1;
      publish();
      return ok;
    });

    let framesPromise: Promise<unknown> = Promise.resolve();
    if (loadSequences && firstTransitionId && hasSequence(firstTransitionId)) {
      const sequence = warmSequence(firstTransitionId, 'head');
      if (sequence) {
        const target = Math.min(INITIAL_TRANSITION_FRAMES, sequence.length);
        framesPromise = new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            sequence.setProgressHandler(null);
            resolve();
          };
          sequence.setProgressHandler((loaded) => {
            framesDone = Math.min(1, loaded / target);
            publish();
            if (loaded >= target) done();
          });
          sequence.requestHead(target, PRIORITY.exact);
          // The head may already be resident from a previous mount.
          if (sequence.loadedCount >= target) done();
        });
      }
    } else {
      framesDone = 1;
    }

    void Promise.all([posterPromise, videoPromise, framesPromise]).then(() => {
      window.clearTimeout(timer);
      finish(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, loadSequences]);

  return state;
}

/* ------------------------------------------------------------------ *
 * Rolling look-ahead
 * ------------------------------------------------------------------ */

/**
 * Keeps the media just ahead of the visitor warm:
 *  - current + next poster PNG
 *  - next idle video metadata
 *  - anchors of the next sequence, then a background fill
 *  - anchors of the previous sequence so scrolling back up is instant
 */
const BACKFILL_INTERVAL_MS = 700;

export function useMediaPreloader(
  sceneIndex: number,
  transitionIndex: number,
  enabled: boolean,
  /** False under reduced motion: no WebP frame is ever requested. */
  sequencesEnabled = true,
): void {

  useEffect(() => {
    if (!enabled) return;

    // Posters are WebP now — roughly 300 KB each rather than the 4-6 MB PNGs
    // this window was originally sized around — so the look-ahead reaches two
    // scenes instead of one and the next plate is already decoded on arrival.
    // Idle-video metadata is not fetched here: the mounted <video> elements
    // already carry preload="metadata".
    for (const index of [sceneIndex - 2, sceneIndex - 1, sceneIndex, sceneIndex + 1, sceneIndex + 2]) {
      const scene = scenes[index];
      if (!scene) continue;
      void preloadImage(scene.poster);
      if (index === sceneIndex && scene.foregrounds) {
        for (const src of scene.foregrounds) void preloadImage(src);
      }
    }
  }, [sceneIndex, enabled]);

  useEffect(() => {
    if (!enabled || !sequencesEnabled) return;

    // The sequence the visitor is about to enter.
    const upcoming = transitionIds[sceneIndex];
    if (upcoming && hasSequence(upcoming)) {
      warmSequence(upcoming, 'anchors');
    }

    // The one behind, so reversing does not stutter.
    const behind = transitionIds[sceneIndex - 1];
    if (behind && hasSequence(behind)) {
      warmSequence(behind, 'anchors');
    }

    // Everything else can give its decoded frames back. A sequence that is
    // still referenced by the canvas is never pruned.
    const keep = [transitionIds[sceneIndex - 1], transitionIds[sceneIndex]].filter(
      (id): id is string => Boolean(id),
    );
    pruneSequences(keep);
  }, [sceneIndex, enabled, sequencesEnabled]);

  useEffect(() => {
    if (sequencesEnabled) return;
    // Reduced motion: give back anything a previous mode left decoded.
    pruneSequences([]);
  }, [sequencesEnabled]);

  useEffect(() => {
    if (!enabled || !sequencesEnabled || transitionIndex < 0) return;

    const id = transitionIds[transitionIndex];
    if (!id || !hasSequence(id)) return;

    // Once a transition is genuinely in flight, fill the rest of it behind the
    // frames the visitor is looking at. Re-armed on an interval because the
    // canvas drops stale pending requests as the playhead moves, and those
    // frames still deserve to be filled in eventually.
    const fill = () => warmSequence(id, 'all');
    const first = window.setTimeout(fill, 140);
    const repeat = window.setInterval(fill, BACKFILL_INTERVAL_MS);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(repeat);
    };
  }, [transitionIndex, enabled, sequencesEnabled]);
}
