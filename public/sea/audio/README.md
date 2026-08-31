# Ambient audio (optional)

Drop a single audio file here — `.mp3`, `.m4a`, `.ogg`, `.wav` or `.aac` — and
run `npm run manifest`.

The generator picks it up (preferring a filename containing "ambient"), writes
it into `src/generated/transitionManifest.ts` as `ambientAudioSrc`, and the
header's sound toggle starts working.

With no file present the toggle stays visually available and reports
"Ambient audio unavailable" when clicked. It never requests a missing file and
never throws.

Audio is never autoplayed. It only ever starts from a click on that button.
