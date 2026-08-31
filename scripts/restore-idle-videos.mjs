/**
 * Restores the eight original idle MP4s into public/sea/idle/ when absent.
 *
 * The files are the byte-identical originals from pelagia-assets.zip. They are
 * kept outside the repository because the checkpoint system rejects files over
 * 1 MB, in the persistent webdev assets area, and copied back verbatim before
 * every dev start and build. Nothing is re-encoded, renamed, or substituted.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = '/home/ubuntu/webdev-static-assets/pelagia/sea/idle';
const TARGET = new URL('../public/sea/idle', import.meta.url).pathname;

if (!existsSync(SOURCE)) {
  console.warn('[pelagia] idle-video source missing; leaving public/sea/idle as-is');
  process.exit(0);
}

mkdirSync(TARGET, { recursive: true });
let restored = 0;
for (const name of readdirSync(SOURCE).filter((n) => n.endsWith('.mp4'))) {
  const from = join(SOURCE, name);
  const to = join(TARGET, name);
  if (existsSync(to)) continue;
  copyFileSync(from, to);
  restored += 1;
}
console.log(`[pelagia] idle videos in place (${restored} restored, 8 expected)`);
