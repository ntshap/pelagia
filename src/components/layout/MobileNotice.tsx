/**
 * Below 1024px.
 *
 * No idle MP4s, no WebP sequences, no GSAP timeline — just the scene 1 poster
 * under a heavy scrim, the mark, and an honest sentence.
 */
import { memo } from 'react';
import { scenes } from '@/config/scenes';
import { PelagiaMark } from '@/components/layout/PelagiaMark';

function MobileNoticeImpl() {
  const surface = scenes[0];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-abyss">
      <img
        src={surface.poster}
        alt={surface.posterAlt}
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(2,7,11,0.86) 0%, rgba(2,7,11,0.78) 45%, rgba(2,7,11,0.94) 100%)',
        }}
      />

      <div className="relative flex min-h-screen flex-col justify-between px-7 py-12">
        <div className="flex items-center gap-3.5">
          <PelagiaMark size={30} tone="#FDF1E1" accent="#55E6EA" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-semibold text-white">pelagia</span>
            <span className="metadata mt-1.5">Deep ocean research</span>
          </span>
        </div>

        <div className="max-w-[34ch]">
          <p className="eyebrow">Expedition 07 / North Pacific</p>
          <h1 className="display mt-6 text-[clamp(2.2rem,9vw,3.1rem)] text-paper">
            The ocean is still mostly unknown.
          </h1>
          <p className="mt-7 text-[1.1rem] leading-[1.35] text-paper/80">
            The mobile expedition is currently being prepared.
          </p>
          <p className="metadata mt-8">
            AVAILABLE ON DESKTOP AT 1024 PX AND ABOVE
          </p>
        </div>

        <p className="metadata">© 2026 PELAGIA — ALL RIGHTS RESERVED</p>
      </div>
    </div>
  );
}

export const MobileNotice = memo(MobileNoticeImpl);
