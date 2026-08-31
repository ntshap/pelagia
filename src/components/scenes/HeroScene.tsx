/**
 * The opening scene's content.
 *
 * Bottom-anchored: kicker, headline, email capture. Nothing else — the plate
 * behind it is the point. There is no video here either; the imagery is the
 * fixed `MediaStage`, which is already showing the surface idle loop and hands
 * over to the scrubbed frame sequence on the first transition.
 *
 * Every animated element carries `data-anim`; the parent scene owns the
 * entrance timeline.
 */
import { useCallback, type FormEvent } from 'react';

const CTA_GRADIENT = { backgroundImage: 'linear-gradient(to bottom, #2B2B2B, #101010)' };

export function HeroScene() {
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="max-w-xl">
      <p data-anim className="eyebrow">
        Expedition 07 / North Pacific
      </p>

      <h1 data-anim className="display mt-5 text-3xl text-white sm:text-4xl lg:text-[3.5rem]">
        The ocean is still mostly unknown
      </h1>

      <form
        data-anim
        onSubmit={handleSubmit}
        className="pointer-events-auto mt-6 flex flex-col gap-3 transition-shadow duration-300 focus-within:ring-4 focus-within:ring-white/25 sm:mt-8 sm:inline-flex sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white sm:p-1.5"
      >
        <label htmlFor="hero-email" className="sr-only">
          Email address
        </label>
        <input
          id="hero-email"
          type="email"
          placeholder="Type your email"
          className="rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none sm:w-64 sm:rounded-none sm:bg-transparent sm:px-4 sm:py-2"
        />
        <button
          type="submit"
          style={CTA_GRADIENT}
          className="rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:py-2.5"
        >
          Get started
        </button>
      </form>
    </div>
  );
}
