/**
 * Lazy, priority-scheduled WebP frame sequences.
 *
 * There are ~868 transition frames on disk. None of them are fetched on first
 * load; a sequence only starts filling once its transition is the next thing
 * the visitor could reach, and only two sequences are ever kept resident.
 *
 * Nothing in here touches React state. The canvas reads frames through refs.
 */
import { useEffect, useMemo } from 'react';
import { transitionManifest } from '@/generated/transitionManifest';

/* ------------------------------------------------------------------ *
 * Shared request scheduler
 *
 * A global concurrency cap, plus a reserved share of it. Filling a sequence in
 * the background queues over a hundred requests at once; without a reservation
 * those requests take every slot and the frames the visitor is actually
 * looking at end up waiting behind them.
 * ------------------------------------------------------------------ */
const MAX_CONCURRENT_REQUESTS = 8;
/** At most this many background (low-priority) requests may be in flight. */
const MAX_CONCURRENT_BACKGROUND = 4;

interface ScheduledTask {
  priority: number;
  seq: number;
  run: () => Promise<void>;
  cancelled: boolean;
  /** Once true the request is on the wire and can no longer be dropped. */
  started: boolean;
}

const queue: ScheduledTask[] = [];
let inFlight = 0;
let inFlightBackground = 0;
let taskSeq = 0;

/** Anything below this is a background fill and may be held back. */
const FOREGROUND_PRIORITY = 50;

function isBackground(task: ScheduledTask): boolean {
  return task.priority < FOREGROUND_PRIORITY;
}

/** Highest priority first, ties broken by insertion order. */
function pickTaskIndex(allowBackground: boolean): number {
  let best = -1;
  for (let i = 0; i < queue.length; i += 1) {
    const task = queue[i];
    if (task.cancelled) continue;
    if (!allowBackground && isBackground(task)) continue;
    if (best === -1) {
      best = i;
      continue;
    }
    const incumbent = queue[best];
    if (
      task.priority > incumbent.priority ||
      (task.priority === incumbent.priority && task.seq < incumbent.seq)
    ) {
      best = i;
    }
  }
  return best;
}

function pump(): void {
  while (inFlight < MAX_CONCURRENT_REQUESTS) {
    const allowBackground = inFlightBackground < MAX_CONCURRENT_BACKGROUND;
    const index = pickTaskIndex(allowBackground);
    if (index === -1) break;

    const task = queue.splice(index, 1)[0];
    const background = isBackground(task);
    task.started = true;

    inFlight += 1;
    if (background) inFlightBackground += 1;

    void task
      .run()
      .catch(() => undefined)
      .finally(() => {
        inFlight -= 1;
        if (background) inFlightBackground -= 1;
        pump();
      });
  }
}

function schedule(priority: number, run: () => Promise<void>): ScheduledTask {
  const task: ScheduledTask = { priority, seq: taskSeq++, run, cancelled: false, started: false };
  queue.push(task);
  pump();
  return task;
}

/** Drops cancelled work so a disposed sequence stops costing scheduler time. */
function compactQueue(): void {
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (queue[i].cancelled) queue.splice(i, 1);
  }
}

/* ------------------------------------------------------------------ *
 * Priorities
 * ------------------------------------------------------------------ */
export const PRIORITY = {
  /** The frame the canvas needs for its very next paint. */
  exact: 100,
  /** The handful of frames immediately either side of the playhead. */
  adjacent: 90,
  /** Anchors and flip-book of the sequence the visitor is about to enter.
   *  Deliberately above `window`: arriving at a transition with a coarse
   *  flip-book already resident matters more than refining the one being
   *  left behind. */
  lookAhead: 62,
  /** The wider hot window around the playhead. */
  window: 58,
  /** Everything else, filled only when nothing else wants a slot. */
  backfillStride: 22,
  backfill: 20,
} as const;

/* ------------------------------------------------------------------ *
 * FrameSequence
 * ------------------------------------------------------------------ */
type FrameStatus = 'idle' | 'loading' | 'loaded' | 'failed';

/* ------------------------------------------------------------------ *
 * Failure handling
 *
 * A dropped request must not break a sequence for the rest of the page
 * session. A failed frame is retried a bounded number of times with a short
 * increasing delay, then reported and left failed. Re-entering a sequence
 * re-queues any frames still missing, so a second pass repairs itself.
 * ------------------------------------------------------------------ */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 350;

export class FrameSequence {
  readonly id: string;
  readonly urls: readonly string[];
  readonly length: number;

  private readonly images: (HTMLImageElement | null)[];
  private readonly status: FrameStatus[];
  private readonly tasks: (ScheduledTask | null)[];
  private readonly attempts: number[];
  private loaded = 0;
  private failed = 0;
  private disposed = false;
  private onProgress: ((loaded: number, total: number) => void) | null = null;
  private onFailure: ((index: number, url: string, attempts: number) => void) | null = null;

  constructor(id: string, urls: readonly string[]) {
    this.id = id;
    this.urls = urls;
    this.length = urls.length;
    this.images = new Array(this.length).fill(null);
    this.status = new Array<FrameStatus>(this.length).fill('idle');
    this.tasks = new Array(this.length).fill(null);
    this.attempts = new Array(this.length).fill(0);
  }

  get loadedCount(): number {
    return this.loaded;
  }

  get failedCount(): number {
    return this.failed;
  }

  /** Enough frames decoded that drawing will not look broken. */
  get isUsable(): boolean {
    return this.loaded > 0;
  }

  setProgressHandler(handler: ((loaded: number, total: number) => void) | null): void {
    this.onProgress = handler;
  }

  /** Called when a frame exhausts its attempts and stays failed. */
  setFailureHandler(handler: ((index: number, url: string, attempts: number) => void) | null): void {
    this.onFailure = handler;
  }

  private clampIndex(index: number): number {
    if (this.length === 0) return 0;
    if (index < 0) return 0;
    if (index > this.length - 1) return this.length - 1;
    return index;
  }

  /** Queue one frame. Re-requesting an in-flight frame just raises its priority. */
  request(index: number, priority: number): void {
    if (this.disposed || this.length === 0) return;
    const i = this.clampIndex(index);
    const status = this.status[i];

    if (status === 'loaded') return;

    // A failed frame is not abandoned: re-queue it for a bounded retry.
    if (status === 'failed') {
      if (this.attempts[i] >= MAX_ATTEMPTS) return;
      this.status[i] = 'idle';
    }

    if (status === 'loading') {
      const existing = this.tasks[i];
      if (existing && !existing.cancelled && priority > existing.priority) {
        existing.priority = priority;
      }
      return;
    }

    this.status[i] = 'loading';
    this.tasks[i] = schedule(priority, async () => {
      if (this.disposed) return;
      await this.load(i);
    });
  }

  private load(index: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      // Frames are same-origin static files; no crossOrigin needed.
      const settle = (ok: boolean) => {
        if (this.disposed) {
          resolve();
          return;
        }
        this.tasks[index] = null;
        if (ok) {
          this.images[index] = image;
          this.status[index] = 'loaded';
          this.loaded += 1;
          this.onProgress?.(this.loaded, this.length);
          resolve();
        } else {
          this.attempts[index] += 1;
          if (this.attempts[index] < MAX_ATTEMPTS) {
            // Bounded retry with a short increasing delay.
            this.status[index] = 'idle';
            const delay = RETRY_BASE_DELAY_MS * this.attempts[index];
            window.setTimeout(() => {
              if (!this.disposed && this.status[index] === 'idle') {
                this.request(index, PRIORITY.window);
              }
            }, delay);
          } else {
            this.status[index] = 'failed';
            this.failed += 1;
            this.onFailure?.(index, this.urls[index], this.attempts[index]);
          }
          this.onProgress?.(this.loaded, this.length);
          resolve();
        }
      };

      image.onload = () => {
        // decode() keeps the first draw off the main-thread critical path.
        if (typeof image.decode === 'function') {
          image.decode().then(
            () => settle(true),
            () => settle(true), // decode can reject spuriously; the bitmap is still drawable
          );
        } else {
          settle(true);
        }
      };
      image.onerror = () => settle(false);
      image.src = this.urls[index];
    });
  }

  /**
   * Re-queue every frame that is still missing or failed, so re-entering a
   * sequence repairs itself instead of staying broken until a page reload.
   */
  repair(priority: number = PRIORITY.window): void {
    if (this.disposed || this.length === 0) return;
    for (let i = 0; i < this.length; i += 1) {
      if (this.status[i] === 'loaded' || this.status[i] === 'loading') continue;
      if (this.status[i] === 'failed' && this.attempts[i] >= MAX_ATTEMPTS) continue;
      this.request(i, priority);
    }
  }

  /** The three frames that make a sequence feel present before it is filled. */
  requestAnchors(priority: number = PRIORITY.lookAhead): void {
    if (this.length === 0) return;
    this.request(0, priority + 2);
    this.request(this.length - 1, priority + 1);
    this.request(Math.floor((this.length - 1) / 2), priority);
  }

  /**
   * A coarse flip-book across the whole sequence. Loaded while the visitor is
   * still on the previous scene so that entering the transition at any scroll
   * position already has a frame within a few of the one it wants.
   */
  requestSpread(count = 9, priority: number = PRIORITY.lookAhead - 1): void {
    if (this.length === 0) return;
    const step = Math.max(1, Math.floor((this.length - 1) / Math.max(1, count - 1)));
    for (let i = 0; i < this.length; i += step) this.request(i, priority);
    this.request(this.length - 1, priority);
  }

  /** Frames around the visitor's current position, nearest first. */
  requestAround(index: number, radius: number, priority: number = PRIORITY.window): void {
    if (this.length === 0) return;
    const center = this.clampIndex(index);
    this.request(center, priority + 10);
    for (let offset = 1; offset <= radius; offset += 1) {
      const falloff = priority - offset;
      this.request(center + offset, falloff);
      this.request(center - offset, falloff - 1);
    }
  }

  /**
   * Fill everything still missing, at background priority. Even indices go
   * first so a half-resolution flip-book exists well before the sequence is
   * complete. Safe to call repeatedly — already-loaded frames are skipped.
   */
  requestAll(priority: number = PRIORITY.backfill): void {
    for (let i = 0; i < this.length; i += 2) this.request(i, priority + 2);
    for (let i = 1; i < this.length; i += 2) this.request(i, priority);
  }

  /**
   * Cancels queued-but-unstarted requests far from the playhead. Without this
   * the queue accumulates requests for frames the visitor has already scrolled
   * past, and they outrank the sequence coming up next.
   */
  dropPendingOutside(center: number, radius: number): void {
    if (this.disposed || this.length === 0) return;
    const lo = center - radius;
    const hi = center + radius;
    let dropped = 0;

    for (let i = 0; i < this.length; i += 1) {
      if (i >= lo && i <= hi) continue;
      if (this.status[i] !== 'loading') continue;
      const task = this.tasks[i];
      if (!task || task.started) continue;
      task.cancelled = true;
      this.tasks[i] = null;
      this.status[i] = 'idle';
      dropped += 1;
    }

    if (dropped) compactQueue();
  }

  /** The head of a sequence, used by the initial loader. */
  requestHead(count: number, priority: number = PRIORITY.exact): void {
    const upto = Math.min(count, this.length);
    for (let i = 0; i < upto; i += 1) {
      this.request(i, priority - i);
    }
  }

  get(index: number): HTMLImageElement | null {
    if (this.length === 0) return null;
    const i = this.clampIndex(index);
    return this.status[i] === 'loaded' ? this.images[i] : null;
  }

  /**
   * The requested frame if it is decoded, otherwise the nearest decoded frame.
   * This is what keeps the canvas from ever going blank mid-sequence.
   */
  getClosest(index: number): HTMLImageElement | null {
    if (this.length === 0 || this.loaded === 0) return null;
    const center = this.clampIndex(index);
    const exact = this.get(center);
    if (exact) return exact;

    const span = Math.max(center, this.length - 1 - center);
    for (let offset = 1; offset <= span; offset += 1) {
      const before = center - offset;
      if (before >= 0 && this.status[before] === 'loaded') return this.images[before];
      const after = center + offset;
      if (after < this.length && this.status[after] === 'loaded') return this.images[after];
    }
    return null;
  }

  /** Drops decoded frames and cancels pending work so memory can be reclaimed. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.onProgress = null;

    for (let i = 0; i < this.length; i += 1) {
      const task = this.tasks[i];
      if (task) {
        task.cancelled = true;
        this.tasks[i] = null;
      }
      const image = this.images[i];
      if (image) {
        image.onload = null;
        image.onerror = null;
        // Releasing the src lets the decoder free the bitmap immediately
        // instead of waiting for the element to be collected.
        image.src = '';
        this.images[i] = null;
      }
      this.status[i] = 'idle';
    }
    this.loaded = 0;
    this.failed = 0;
    compactQueue();
  }
}

/* ------------------------------------------------------------------ *
 * Registry
 *
 * Sequences are shared across components and reference-counted, so scrolling
 * back up never refetches what is still resident. Eviction is explicit rather
 * than implicit: `pruneSequences` is told which ids matter right now, which
 * keeps a sequence that is currently on screen from ever being disposed out
 * from under the canvas.
 * ------------------------------------------------------------------ */
interface RegistryEntry {
  sequence: FrameSequence;
  refs: number;
}

const registry = new Map<string, RegistryEntry>();

function getOrCreate(id: string): RegistryEntry | null {
  const urls = transitionManifest[id];
  if (!urls || urls.length === 0) return null;

  let entry = registry.get(id);
  if (!entry) {
    entry = { sequence: new FrameSequence(id, urls), refs: 0 };
    registry.set(id, entry);
  }
  return entry;
}

/**
 * Returns the live sequence without changing its reference count. Callers that
 * need it to stay alive follow up with `retainSequence` in an effect.
 */
export function peekSequence(id: string): FrameSequence | null {
  return getOrCreate(id)?.sequence ?? null;
}

export function retainSequence(id: string): FrameSequence | null {
  const entry = getOrCreate(id);
  if (!entry) return null;
  entry.refs += 1;
  return entry.sequence;
}

export function releaseSequence(id: string): void {
  const entry = registry.get(id);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
}

/**
 * Disposes every resident sequence outside `keep`, releasing its decoded
 * frames. A referenced sequence is never touched.
 */
export function pruneSequences(keep: readonly string[]): void {
  const keepSet = new Set(keep);
  for (const [id, entry] of registry) {
    if (keepSet.has(id) || entry.refs > 0) continue;
    entry.sequence.dispose();
    registry.delete(id);
  }
}

/** Warm a sequence without holding a reference — used for look-ahead. */
export function warmSequence(id: string, mode: 'anchors' | 'head' | 'all'): FrameSequence | null {
  const entry = getOrCreate(id);
  if (!entry) return null;

  if (mode === 'anchors') {
    entry.sequence.requestAnchors();
    entry.sequence.requestSpread();
  } else if (mode === 'head') {
    entry.sequence.requestHead(16);
  } else {
    entry.sequence.requestAll();
  }

  return entry.sequence;
}

export function sequenceFrameCount(id: string): number {
  return transitionManifest[id]?.length ?? 0;
}

export function hasSequence(id: string | undefined): boolean {
  return Boolean(id && (transitionManifest[id]?.length ?? 0) > 0);
}

/** Dev-only visibility into the shared request queue. */
export function schedulerStats(): {
  queued: number;
  cancelled: number;
  inFlight: number;
  inFlightBackground: number;
  topPriorities: number[];
} {
  return {
    queued: queue.length,
    cancelled: queue.filter((t) => t.cancelled).length,
    inFlight,
    inFlightBackground,
    topPriorities: [...queue].sort((a, b) => b.priority - a.priority).slice(0, 5).map((t) => t.priority),
  };
}

/** Dev-only visibility into what is currently resident. */
export function residentSequences(): { id: string; refs: number; loaded: number; total: number }[] {
  return [...registry.entries()].map(([id, entry]) => ({
    id,
    refs: entry.refs,
    loaded: entry.sequence.loadedCount,
    total: entry.sequence.length,
  }));
}

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */

/**
 * Acquires a frame sequence for the lifetime of the component.
 * Returns `null` when the sequence is missing or the visitor asked for
 * reduced motion — callers fall back to a poster crossfade.
 */
export function useFrameSequence(id: string | null, enabled: boolean): FrameSequence | null {
  const sequence = useMemo(() => {
    if (!enabled || !id || !hasSequence(id)) return null;
    return peekSequence(id);
  }, [id, enabled]);

  // Retain in the effect, not the memo: StrictMode's mount/unmount/mount would
  // otherwise release a reference the memo never re-takes, leaving the live
  // sequence at zero refs and eligible for disposal while it is on screen.
  useEffect(() => {
    if (!sequence) return;
    retainSequence(sequence.id);
    return () => releaseSequence(sequence.id);
  }, [sequence]);

  return sequence;
}

/** Frame index for a scrub progress value, clamped to the sequence bounds. */
export function frameIndexForProgress(progress: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  const raw = Math.round(progress * (frameCount - 1));
  return raw < 0 ? 0 : raw > frameCount - 1 ? frameCount - 1 : raw;
}
