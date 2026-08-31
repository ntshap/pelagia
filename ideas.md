# PELAGIA Design Ground Truth

This project is an **exact implementation of the user-supplied two-part specification**. The provided source files, choreography, content, typography, media paths, and animation architecture are the ground-truth design system; no alternate stylistic approaches or generated substitutes are appropriate.

## Chosen Direction

**Design movement:** Scientific expedition editorialism combined with cinematic oceanic scrollytelling.

**Core principles:** Preserve the fixed-stage descent narrative; maintain native-scroll, reversible frame-sequence choreography; use restrained scientific instrumentation as interface chrome; keep all editorial typography and spatial pacing exactly as supplied.

**Color philosophy:** Near-black abyssal backgrounds support high-contrast white editorial type, cool cyan instrumentation, and increasingly deep marine imagery. Color communicates descent, pressure, and discovery rather than decoration.

**Layout paradigm:** A fixed full-viewport media stage is driven by a long native-scrolling document. Scene sections and transition spacers provide the timeline, while asymmetrical editorial blocks interrupt the descent at predetermined depths.

**Signature elements:** Scroll-scrubbed WebP descent sequences, a live metre-based depth readout, and pixel-styled scientific labels paired with large Geist headlines.

**Interaction philosophy:** Scrolling is the primary instrument. Every transition must remain directly reversible under the visitor’s finger, without smoothing, snapping, or intercepted wheel behavior.

**Animation:** GSAP ScrollTrigger reads native scroll position. Transition canvases are painted imperatively from the ticker, and looping idle videos hold each scene between transitions. Reduced-motion and non-desktop fallbacks remain exactly as specified.

**Typography system:** Geist carries editorial hierarchy and body copy; Silkscreen carries telemetry, labels, and technical microcopy.

**Brand essence:** Deep-ocean research presented as an explorable scientific descent for curious public audiences; precise, cinematic, and quietly urgent.

**Brand voice:** Headlines are declarative and investigative; labels are terse and instrument-like. Examples: “The ocean is still mostly unknown.” and “Expedition 07 / North Pacific.”

**Wordmark & logo:** The supplied PELAGIA mark and favicon geometry are retained unchanged.

**Signature brand color:** Instrument cyan, `#55E6EA`.

## Style Decisions

All 38 supplied files remain verbatim. The 897 archive entries are placed under `public/sea/` with exact filenames and six-digit frame numbering. No generated imagery, substitutions, or optimizations are used because fidelity to the supplied reference is the primary requirement.
