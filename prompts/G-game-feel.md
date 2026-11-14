# Prompt G: Game feel (motion, sound, illustration wiring)

**Who/when:** Renad (UI lane) in Antigravity, or Iyad with a Sonnet `worker`, any time before the Sat 21:00 Fable pass. Fable (prompt C, Track 5) verifies it and fills gaps only.
**Why:** the live site reads as a report, not a game. Judges score Presentation and Validity (usability). Fix: motion, feedback and illustration, with zero new dependencies and zero change to engine, contracts or numbers.

<rules>
Read AGENTS.md and design/README.md first. They stay binding:
- Motion durations only from tokens (120, 240, 600 ms, plus the existing --dur-launch). CSS and SVG only; no animation library, no Canvas loop, no video.
- No gradients, glows, blur halos, emoji, starfield, confetti. Flat shapes, hairline strokes, paper/night tokens only.
- `--sol` only for the Sun and its effects (storm rings, Sun Stripe, "the Sun took N days"). Actions stay lapis.
- Every animation: transform/opacity only, honours prefers-reduced-motion (cross-fade or none), mirrors in RTL (arrows, slides, chains), never blocks input, never delays the result number.
- Numbers shown are always the real SimResult values; animation only reveals them (count-up ends exactly on the true value).
- No change to engine/, contracts, content numbers. UI strings go through i18n (en and ar). New art: SI tag visible, alt text in content/text/art-alt.json (en and ar).
- Budget: bundle +60 kB gzip max, art folder under 1.5 MB total, Lighthouse performance stays at 85 or more.
</rules>

<tasks>
Do in this order; commit after each (tests green). Stop at the first three if time is short: they carry most of the feel.

G1. Launch ceremony (Launch.tsx). On Launch press: 3-2-1 countdown in Plex Mono data-l (240 ms per tick), rocket SVG (flat, from tokens) rises and the Paper-to-Night 600 ms turn plays under it, then straight into Flight. Skippable with any key/click. Reduced motion: single cross-fade.
G2. Flight (Flight.tsx). (a) Day counter rolls like an odometer; (b) satellite marker travels the orbit ring in step with the timeline cursor; (c) the altitude line draws in as time advances; (d) a storm day pulses flat concentric sol rings on the Sun Stripe and shakes nothing; (e) reentry: altitude line turns fail colour, a short streak, then the screen holds 600 ms before the verdict. Add play / pause / 1x 4x 16x speed controls if absent (UI only).
G3. Verdict (Report.tsx / VerdictStamp). Stamp slams in (scale 1.12 to 1, 240 ms, once). "The Sun took N days" counts up to N. Requirement rows tick one by one (check strokes draw, 120 ms apart); Sun-resilience meter fills to its real score. On FIX success, a quiet "Plan flown" line sweeps the Sun Stripe once.
G4. Build (Build.tsx). Part cards: 120 ms lift on hover, snap-and-settle when added; the six gauges animate to new values (240 ms) and a gauge that crosses its limit flashes fail colour once with the reason text; code-drawn line icons per part family (camera, panels, battery, radio, computer, pointing, fuel) as inline SVG, one stroke weight. The exploded 6U (Art P5) with hover labels is the one ornament of this screen.
G5. Screen transitions and pressed states. 240 ms cross-fade + 8 px slide (mirrored in RTL) between screens; buttons depress 1 px on press; focus ring unchanged; a progress rail (the existing CmlRail) animates to the current stage.
G6. Illustration wiring (needs Dua's art, see prompts/D2-extra-art-gemini.md). Place art with the SI tag, lazy-loaded, fixed aspect boxes (no layout shift): P1 Brief hero, P2 Angola card, P3 ground-station panel, P5 Build, P6 Report/pitch backdrop; and the new P8 Launch header, P9 Flight header, P10 died verdict card, P11 Launch-date/storm panel, P12 success verdict card. Missing file = no placeholder box, the screen simply stays clean.
G7. Empty and loading states with a small code-drawn illustration each (no parts yet, no flight yet, loading data table). One line of copy each, from ui.json.
G8. Optional sound, OFF by default, toggle in the header, remembered per browser: Web Audio synthesised blips only (no audio files, no licences): part snap, launch tick, reentry low tone, stamp thud, success chord. Never autoplays; muted when reduced motion is on.
G9. Brief first screen: one-line game description, the FACSAT-2 hook, a single big "Start mission" button, Sun Stripe visible without scrolling at 1440x900 and 390x844.
</tasks>

<acceptance>
- `pnpm test`, build and the Playwright walk Brief to Re-fly pass in EN and AR, Paper and Night, with reduced motion on and off.
- grep of web/src finds no gradient, glow, box-shadow blur halo, emoji, hex colour or px font size outside tokens.css.
- Screen recording or screenshots saved to qa/screens/ (launch, flight storm day, reentry, verdict).
- HANDOFF.md line per task: done, partly, or cut, with the reason.
</acceptance>
