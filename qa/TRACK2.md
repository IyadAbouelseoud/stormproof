# Track 2: UX, accessibility, design conformance (final pass, 14 Nov 2026)

All results are on the release build (`web/dist`, JS `index-Cz58yarf.js`), served by `vite preview`, in installed Chrome driven by Playwright (headless). Scripts: `qa/track2/crash-walk.mjs`, `sweep.mjs`, `summarise.py`; `web/scripts/demo-walk.mjs`, `check-flag-j0.mjs`, `mock-mode.mjs`. Raw results: `qa/track2/results/`.

## 1. Flight playback crash (carryover item 1)
Required: 20 consecutive full Brief to Re-fly walks, production build, animation on, zero crashes.

**Result: 20/20 clean** (`qa/track2/results/walk20-release.log`, last line `RESULT 20/20 clean`; about 26 s per walk). The walks rotate 1440x900 and 390x844, EN and AR, and every fifth walk flies the Jeddah scenario. Each walk plays the flight with animation, answers storm votes, opens the Report and the Re-fly screen, and fails on any page crash, page error or console error.

History, so the result can be trusted:
- The first agent run on the build as it was on `main` at the start of the pass: 20/20 clean (`walk20.log`). The earlier fix on `main` (integer, bounded timeline indices in Flight and AltitudeChart) holds; the old "renderer crash" did not come back in any run of this pass.
- A new bug appeared during this pass and was caught by the same walk: after the Flight map was wired to `SimResult.groundTrack`, 2 of 20 walks threw "undefined is not iterable" during playback (walks 9 and 11). Cause: the new helper could index outside the engine track for an unusual start value. Fixed (finite, non-negative start; missing points skipped) with a unit test in `web/test/web.test.ts` (NaN, negative, fractional, infinite starts). The run below is after that fix.
- Headed runs were not done (no display in this session): unverified in a headed browser. Check once by hand before the pitch.

## 2. Axe (`@axe-core/playwright` 4.14, added as a dev dependency for this pass)
16 combinations: Angola and Jeddah x 390x844 and 1440x900 x EN and AR x Night and Paper. Screens per combination: Brief (and the scenario picker), Build, Orbit, Launch, Flight at start / storm card / mid-flight / reentry, Report, Re-fly.

| | Result |
|---|---|
| Serious + critical violations | **0** |
| Other violations | 64, all the same minor rule (`aria-allowed-role`): the altitude chart is an `svg` container with `role="slider"` so that it can be scrubbed with the keyboard. Left as is. |
| Console and page errors during the sweep | 0 |

Fixed on the way (found by axe or Lighthouse): contrast of muted labels (CML rail labels, faint ink on raised panels) raised to the muted-ink token; hard-coded English strings moved to i18n (scrub hint, score label, "met" count, passport heading, FCC / NASA labels, reentry stamp, medal notes); one blurred box shadow removed; the disposal dial used the Sun colour for "fails both rules", now the fail colour.

Build screen with the detail panel open and closed: covered by `qa/track7/hotspots.mjs` (focus trap, Esc, focus return, names) and by this sweep (panel closed). Axe with the panel open was not run separately: unverified.

## 3. Overflow sweep
- **Dial gauges:** 192 readouts measured (value and unit, 6 gauges, 16 combinations): every one fits its box and lies inside its dial, including "1.3M" / Arabic "1.3 مليون" for the budget.
- **Fixed:** Report backdrop picture clipped its "SI-generated" tag by 24 px; rocket card header overflowed by 9 px at 390 for "SpaceX Rideshare"; Launch and Flight header pictures pushed the main controls below the first screen; the Sun Stripe box on Brief ended 19 px below the first screen at 1440x900 (now ends at 883 px).
- **Left, harmless:** the hotspot dot's ping ring and the star layer are wider than their boxes by design (decorative, clipped by the page); the odometer is a clipped reel of digits; the sources table scrolls sideways inside its card at 390.
- **False alarms checked by hand:** "number overlaps the footer" on Report comes from table cells inside the closed sources drawer. With the drawer open at 390 the table ends at 2,029 px and the navigation bar starts at 2,183 px (`web/scripts/shot390.mjs`).
- No horizontal page scroll on any screen at 390 or 1440, EN and AR (`web/scripts/smoke.mjs`: "SMOKE OK: no console errors, no external requests, no overflow").

## 4. Design conformance (grep of `web/src`)
0 gradients; 0 glows or text shadows; 0 hex colours and 0 px font sizes outside `styles/tokens.css`; 0 emoji; the Sun colour only on the Sun, storms, drag bands and "the Sun took" numbers, never on a button or link. One star effect only (`ui/Starfield`). Reduced motion: the demo gate passes with `prefers-reduced-motion: reduce` (launch goes straight to Flight); frame-by-frame motion was not inspected. RTL: Arabic layouts mirror; charts and the Sun Stripe keep a left-to-right time axis by design; numbers stay Western digits in mono type.

## 5. Comprehension
First screen, 1440x900, without scrolling: title, "The Sun you launch into decides how long your satellite lives. FACSAT-2 was designed for five years, flew into a stronger Sun than forecast, and lasted 926 days. Plan with the forecast, fly with the truth.", the mission name, and the whole Sun Stripe box (bottom edge at 883 px).

## 6. Arabic completeness (carryover item 5)
English-only lines found on screen in Arabic mode, all screens, both scenarios: 5. All fixed: the closest-mission hint (now an Arabic template from the engine's own parameters), "NOMINAL", "SOL", "500 km SSO" in the mission log, the unit "looks". Part, rocket and scenario names come from `content/text` in Arabic. What stays Latin on purpose: mission codes, "SI-GENERATED", FACSAT-2, NASA, 6U, dataset names, file names in the sources table. The Arabic copy has not had a native-speaker review (disclosed).

## 7. Lighthouse (desktop preset, release build, `qa/track3/lh-release.json`)
Performance 100, accessibility 100, best practices 100, SEO 83 (before this pass: 100 / 96 / 100 / 83). FCP 0.2 s, LCP 0.2 s, TBT 0 ms, CLS 0.003, measured on localhost. One accessibility note remains and does not lower the score: the language button's visible text ("العربية") differs from its accessible name.

## 8. Other gates
- Demo gate (`web/scripts/demo-walk.mjs`): 0 wrong numbers, 0 console or network problems at 1440x900, at 390x844 and with reduced motion.
- `VITE_JEDDAH=0` build (`check-flag-j0.mjs`): no scenario picker, no Jeddah text, a pasted Jeddah code is refused with the inline error, 0 errors. `VITE_JEDDAH=1` is the release build.
- Sample-data fallback (`mock-mode.mjs`, data requests blocked): header shows "Sample data", Brief to Launch render, 0 page errors. The fallback flight did not reach the reentry panel within the script's wait: the fallback is for looking, not for playing; unverified beyond that.
