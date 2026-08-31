/**
 * Static manifest of the seven scrubbed transition sequences.
 *
 * Every sequence is exactly 124 zero-padded WebP frames, so the paths are
 * derived rather than listed. This produces byte-for-byte the same data the
 * original disk-scanning generator emitted (868 frames total), but does not
 * depend on the frames being present at build time — a build-time scan that
 * finds no frames would silently emit an empty manifest and degrade every
 * transition to a poster crossfade.
 */

import { mediaUrl } from '@/config/media';

export type TransitionSequenceId =
  | 'transition-01-02'
  | 'transition-02-03'
  | 'transition-03-04'
  | 'transition-04-05'
  | 'transition-05-06'
  | 'transition-06-07'
  | 'transition-07-08';

const SEQUENCE_IDS: TransitionSequenceId[] = [
  'transition-01-02',
  'transition-02-03',
  'transition-03-04',
  'transition-04-05',
  'transition-05-06',
  'transition-06-07',
  'transition-07-08',
];

/** Frames per sequence. Filenames are frame_000001.webp … frame_000124.webp. */
const FRAMES_PER_SEQUENCE = 124;

/**
 * Six-digit zero padding is load-bearing: frame_000007.webp is a different file
 * from frame_7.webp, and one wrong pad is a 404 mid-scrub.
 */
function framePaths(id: TransitionSequenceId): string[] {
  return Array.from(
    { length: FRAMES_PER_SEQUENCE },
    (_, i) => mediaUrl(`/sea/transitions/${id}/frame_${String(i + 1).padStart(6, '0')}.webp`),
  );
}

export const transitionManifest: Record<string, string[]> = Object.fromEntries(
  SEQUENCE_IDS.map((id) => [id, framePaths(id)]),
);

/** Frame count per sequence. */
export const transitionFrameCounts: Record<string, number> = Object.fromEntries(
  SEQUENCE_IDS.map((id) => [id, FRAMES_PER_SEQUENCE]),
);

/** Total number of transition frames. */
export const totalTransitionFrames = SEQUENCE_IDS.length * FRAMES_PER_SEQUENCE;

/**
 * Ambient audio is optional. Drop a file at public/sea/audio/ambient.mp3 and
 * set this to '/sea/audio/ambient.mp3' to enable the header sound toggle;
 * while it is null the toggle correctly reports the track as unavailable.
 */
export const ambientAudioSrc: string | null = null;
