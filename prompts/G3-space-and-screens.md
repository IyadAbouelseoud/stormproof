# Prompt G3: space look + per-screen game redesign (Renad, or Iyad with a Sonnet worker)

Read G and G2 first. Same hard rules: tokens only (no hex or px font sizes outside tokens.css), no gradients, glow, emoji, confetti, no new dependency, transform/opacity animation only, prefers-reduced-motion honoured, RTL mirrored, animation only reveals real SimResult values, engine, contracts and numbers untouched, SI tags on art.

## Decision (Iyad, 2026-11-14)
The whole mission runs in the Night theme over a live star backdrop. Already pushed: `web/src/ui/Starfield.tsx` + `styles/starfield.css` (three CSS box-shadow layers drifting on the GPU, slow twinkle, two rare shooting stars, fixed, aria-hidden, static under reduced motion, hidden in Paper). `App.tsx` sets theme night for view=mission, paper for gallery/tokens. Paper stays as an optional toggle (add a header toggle, persisted in localStorage in try/catch). Revert path: set theme back to the old Flight-only rule.

## S0. Verify the backdrop (first, 20 min)
- Contrast: every text/background pair on every screen >= 4.5:1 over the translucent panels (raise the `color-mix` opacity if any fails). Stars must never sit behind body text without a panel.
- Perf: no layout/paint cost; Performance panel shows only compositor work; 60 fps on a mid laptop; CPU idle < 3 %. If not, drop layer 3 twinkle first.
- Replace the Paper-to-Night "turn" at liftoff with a warp: stars stretch (scaleY, 600 ms token) then settle. Skip under reduced motion.
- Keep `--sol` for the Sun only; stars use ink/lapis/brass tokens.

## S1. Orbit / Trade Space (Orbit.tsx)
Looks like a form today. Make it a mission-planning table: (a) a big orbit scene (SVG): Earth disc, the chosen orbit ring drawn at true altitude ratio, a satellite dot moving along it, day/night terminator, eclipse arc shaded; altitude slider drags the ring live. (b) Orbit-type cards (SSO / 51.6 deg) as selectable tiles with a mini ring icon each. (c) A "Sun risk" strip beside the slider: forecast vs real lifetime numbers from the engine, updating as you drag, with a snap marker at the 5-year FCC line. (d) Every number tile animates on change (count-up 240 ms). No empty columns: the scene takes the left 60 %, the cards and strip the right.

## S2. Launch (Launch.tsx)
Fix spacing: one vertical rhythm from tokens (`--space-*`), card grid with equal gaps, the pre-flight checklist and rocket cards on the same baseline grid, countdown button centred under them with a fixed min height. Rocket cards: portrait slot (generic rocket silhouette drawn in SVG; art P18/P19 if delivered), capacity bar vs your mass, orbit-fit tick. Checklist rows tick in sequence (staggered 120 ms) before the launch button unlocks.

## S3. Flight (Flight.tsx)
- Fill the empty bottom-left: a "Mission log" panel (events from SimResult.eventReplay, newest on top, each with date, icon, one line) with a live status line above it. If no eventReplay, show the storm flags from the daily timeline.
- Both top charts (AltitudeChart and SunStripe) become instruments: scrub by dragging or arrow keys, a vertical cursor syncs both charts and the ground map and the log; a hover readout shows date, altitude, density, Kp/storm flag; play/pause/speed (1x, 4x, 16x) buttons, space bar toggles; the decay line draws in as time plays; storm days pulse once when passed; the reentry point gets a stamp. Fix any chart bug seen on the live site (clipping, axis labels overlapping, RTL mirror). All values come from the result.
- Layout: charts row, then map + log row, no dead space at any width (390, 768, 1440).

## S4. Report (Report.tsx)
Make it a mission debrief console, not a document. Header: verdict stamp + score count-up + the three medals. Then a two-column grid of "cards": cause chain (steps reveal one by one), plan-vs-truth twin gauges, requirements checklist with tick animation, disposal verdict panel (FCC 5 y, NASA 25 y) as a dial, mission code in a console-style box with Copy button (flash "copied"), closest-design hint as a tile with Apply button. Fix spacing in the mission-code/P6 area and the closest-mission/GIBS area: fixed grid, GIBS image inside a "viewfinder" frame (corner brackets, fixed aspect, credit line under it), P6 cropped by `object-fit: cover` to a fixed aspect so it never leaves a gap.

## S5. Re-fly (Refly.tsx)
Fill the page: left "what changed" panel with a before/after table of design deltas (each row slides in), centre a big dual-run comparison (previous vs new lifetime bars racing in), right a "try next" list of 3 one-click tweaks from the engine's closest-design hint. Big "Fly again" button with the same ceremony as Launch. An empty state (no previous run) shows a drawn rocket-and-orbit illustration plus one instruction line, never a blank page.

## S6. Shared
- Header strip, section titles and cards use one consistent "console" frame: hairline border, corner ticks, label in `type-label`.
- Every screen has at most one ornament, no empty column wider than 48px at 1440.
- Add `qa/screens-1440-390-EN-AR-night.md`: screenshots checklist for each screen at 1440x900 and 390x844 in EN and AR.

## Acceptance
- `pnpm test`, `pnpm build` green; bundle gain <= 40 kB gzip.
- 20 clean walkthroughs (design to report) with no console errors, no layout shift, no dead space.
- axe: zero serious/critical at both viewports, EN and AR, Night and Paper.
- Offline run works (no network requests).
