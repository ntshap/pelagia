/**
 * The fixed header.
 *
 * A glass pill holding the section links, a sound toggle, and the control that
 * opens the expedition index as a right-hand drawer. Nothing here transforms —
 * a transformed ancestor would break the backdrop blur.
 */
import { memo, useCallback, useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Menu, Volume2, VolumeX, X } from 'lucide-react';
import { primaryNav, scenes } from '@/config/scenes';
import { ambientAudioSrc } from '@/generated/transitionManifest';
import { PelagiaMark } from '@/components/layout/PelagiaMark';
import { scrollToHash, scrollToScene, useTimelineState } from '@/hooks/useActiveScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AMBIENT_TARGET_VOLUME = 0.32;
const STATUS_VISIBLE_MS = 3200;

const CTA_GRADIENT = { backgroundImage: 'linear-gradient(to bottom, #2B2B2B, #101010)' };
const DRAWER_EASE = 'cubic-bezier(0.16,1,0.3,1)';

function HeaderImpl() {
  const { sceneIndex } = useTimelineState();
  const reducedMotion = useReducedMotion();

  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const statusTimer = useRef<number | null>(null);
  const menuId = useId();

  /* A single highlight that slides to whichever link the pointer is on. */
  const [marker, setMarker] = useState({ left: 0, width: 0, shown: false });

  const trackMarker = useCallback((element: HTMLElement) => {
    setMarker({ left: element.offsetLeft, width: element.offsetWidth, shown: true });
  }, []);

  const releaseMarker = useCallback(() => {
    setMarker((previous) => ({ ...previous, shown: false }));
  }, []);

  const announce = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), STATUS_VISIBLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  /* ------------------------------------------------------------------ *
   * Sound. Audible playback is only ever started by this click.
   * ------------------------------------------------------------------ */
  const toggleSound = useCallback(() => {
    if (!ambientAudioSrc) {
      // The button stays available; it just reports the truth.
      announce('Ambient audio unavailable');
      return;
    }

    if (soundOn) {
      audioRef.current?.pause();
      setSoundOn(false);
      announce('Ambient audio muted');
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(ambientAudioSrc);
      audio.loop = true;
      audio.preload = 'none';
      audio.volume = AMBIENT_TARGET_VOLUME;
      audio.addEventListener('error', () => {
        setSoundOn(false);
        announce('Ambient audio unavailable');
      });
      audioRef.current = audio;
    }

    const attempt = audio.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(
        () => {
          setSoundOn(true);
          announce('Ambient audio on');
        },
        () => {
          setSoundOn(false);
          announce('Ambient audio unavailable');
        },
      );
    } else {
      setSoundOn(true);
    }
  }, [announce, soundOn]);

  const handleNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      event.preventDefault();
      setMenuOpen(false);
      // Smooth scrolling is used for navigation only, never for the timeline.
      scrollToHash(href, !reducedMotion);
    },
    [reducedMotion],
  );

  const handleSceneJump = useCallback(
    (index: number) => {
      setMenuOpen(false);
      scrollToScene(index, !reducedMotion);
    },
    [reducedMotion],
  );

  /* Escape closes the drawer. */
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-[80]">
      <div className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
        {/* Left — identity */}
        <a
          href="#top"
          onClick={(event) => handleNavClick(event, '#top')}
          className="reveal-down flex shrink-0 items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-2.5 pr-4 text-white backdrop-blur-lg transition-colors duration-300 hover:bg-white/15"
          style={{ animationDelay: '80ms' }}
          aria-label="PELAGIA — back to the surface"
        >
          <PelagiaMark
            size={24}
            tone="currentColor"
            accent={scenes[sceneIndex]?.accent ?? '#55E6EA'}
          />
          <span className="text-lg font-semibold">pelagia</span>
        </a>

        {/* Right — glass cluster, sound, index */}
        <div className="flex shrink-0 items-center gap-3">
          <div
            className="reveal-down relative hidden items-center gap-1 rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg lg:flex"
            style={{ animationDelay: '160ms' }}
            onMouseLeave={releaseMarker}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-1.5 rounded-full bg-white/15"
              style={{
                left: marker.left,
                width: marker.width,
                opacity: marker.shown ? 1 : 0,
                transform: marker.shown ? 'scale(1)' : 'scale(0.86)',
                transition:
                  'left 380ms var(--ease-depth), width 380ms var(--ease-depth), opacity 220ms ease, transform 260ms var(--ease-depth)',
              }}
            />
            {primaryNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                onMouseEnter={(event) => trackMarker(event.currentTarget)}
                onFocus={(event) => trackMarker(event.currentTarget)}
                className="relative z-10 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors duration-300 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="reveal-down flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-lg transition-colors hover:text-white"
            style={{ animationDelay: '240ms' }}
            title={ambientAudioSrc ? 'Toggle ambient audio' : 'Ambient audio unavailable'}
          >
            {soundOn ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
            <span className="sr-only">
              {soundOn ? 'Mute ambient audio' : 'Play ambient audio'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            style={{ ...CTA_GRADIENT, animationDelay: '320ms' }}
            className="reveal-down relative z-[90] flex h-10 items-center gap-2.5 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <Menu
                size={16}
                aria-hidden
                className={[
                  'absolute transition-all duration-300',
                  menuOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
                ].join(' ')}
              />
              <X
                size={16}
                aria-hidden
                className={[
                  'absolute transition-all duration-300',
                  menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
                ].join(' ')}
              />
            </span>
            {menuOpen ? 'Close' : 'Index'}
          </button>
        </div>
      </div>

      {/* Status line — used when ambient audio is not present. */}
      <div
        className="pointer-events-none absolute right-5 top-full text-right sm:right-8 lg:right-12"
        role="status"
        aria-live="polite"
      >
        <span
          className={[
            'inline-block rounded-full bg-white px-4 py-1.5 text-[0.85rem] font-medium text-[#010101] transition-opacity duration-300',
            status ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {status ?? ''}
        </span>
      </div>

      {/* ---------------------------------------------- expedition index */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      <div
        id={menuId}
        className={[
          'fixed right-0 top-0 z-40 flex h-full w-80 flex-col bg-black/90 backdrop-blur-xl transition-transform duration-500',
          menuOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{ transitionTimingFunction: DRAWER_EASE }}
      >
        <p className="px-6 pt-24 text-[0.8125rem] text-white/60">Expedition index</p>

        <div className="mt-5 flex flex-col gap-1 px-6">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => handleSceneJump(index)}
              className="group flex items-baseline gap-4 rounded-xl px-4 py-3 text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:bg-white/10"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateX(0)' : 'translateX(24px)',
                transition: `opacity 400ms ease, transform 400ms ${DRAWER_EASE}`,
                transitionDelay: menuOpen ? `${(index + 1) * 60}ms` : '0ms',
              }}
            >
              <span className="numeral w-6 shrink-0 text-sm text-white/50">
                {String(scene.number).padStart(2, '0')}
              </span>
              <span className="text-base font-medium text-white/80 transition-colors duration-300 group-hover:text-white">{scene.name}</span>
              <span className="numeral ml-auto text-sm text-white/50">
                {scene.depth.toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        <div
          className="mt-auto px-6 pb-10"
          style={{
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
            transitionDelay: menuOpen ? '300ms' : '0ms',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              scrollToHash('#final-cta', !reducedMotion);
            }}
            style={CTA_GRADIENT}
            className="w-full rounded-full px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Support the expedition
          </button>
        </div>
      </div>
    </header>
  );
}

export const Header = memo(HeaderImpl);
