# HANDOFF

Updated by the agent at every checkpoint (tests green, committed).

## Done
- Merged lane/renad into main (e0ecfe4) after Renad's real-browser playtest passed (no crash, no console errors, 2026-11-14). Merged tests: engine 79 + 3 expected fail + 6 skipped, web i18n + shell + vitest 9/9, build ok. Next: Renad/Iyad release and tag v1.0-rc.
- U1e-U8 (Renad's lane, run on Claude Code Opus 5.5 at Renad's request; prompt B fallback, Iyad to be told). One pass, all on lane/renad:
  - Data: web/src/engineAdapter.ts is the ONLY data gateway. It runs the real engine (engine/src read-only, `@stormproof/engine` workspace dep) on web/public/data, and falls back to mock-result.json until the data loads or if it fails (header shows "Sample data"). Catalog = engine/test/fixtures/content-stub.json until content/*.json lands (swap one import in the adapter). Store: web/src/store.ts (design, live truth result, flight = truth+plan runs, re-fly baseline, team mode, storm votes).
  - U1e components (web/src/ui/components.tsx + styles/components.css, tokens only): Button, Gauge, PartCard, RoleChip, VerdictStamp, MissionTicket, CauseChain, SI tag (`sp-si-tag`), source tags; SunStripe, AltitudeChart, GroundMap (SVG). Gallery at #gallery (Paper and Night side by side); old swatch page moved to #tokens.
  - U2 Brief: title, story, 3 requirements (data-l, from result targets), art slot, Solo/Team setup. U3 Build: 7 part slots + 1U/3U/6U, six gauges (sticky), changed gauges pulse one by one with --dur-base stagger (off for reduced motion), knock-on trail from gauge deltas of two results. U4a Orbit: 200-800 km slider with drag (sol-ink) / FCC disposal (lapis) bands, SSO vs ISS, rocket list, fit verdict + reasons. U4b Launch: SunStripe 2015-2026 monthly F10.7 (keyboard slider: arrows 1 month, PgUp/PgDn 1 year, Home/End; forecast months hatched), plan-vs-truth note, Launch -> Flight.
  - U5 Flight: Paper -> Night over --dur-launch (instant if reduced motion); altitude chart (truth solid ink, plan dashed lapis, gap sol-tint, 120 km rule, forecast shading), rAF play 1x/10x/100x (10/100/1000 days per s), skip, storm alert card (Kp >= engine STORM_ALERT_KP) pauses play and asks the vote (standing policy, re-simulates), 2D map with ground track + Funda + target latitude, battery-minimum strip (floor = engine 1 - BATTERY_DOD), data bucket, reentry burn + day count. U6 Report: LIVED/DIED stamp, "the Sun took N days", per-requirement stamps, CauseChain, closest mission, GIBS HLS 30 m image canvas-blurred to the player's GSD with caption and credit, MissionTicket copy, sources drawer (every number tagged sourced/computed/game-balanced). U7a Re-fly: same seed, two altitude lines + verdict rows, "change one thing" keeps the baseline. U7b Team: 4 RoleChips, screen owners (Brief/Report systems lead, Build power+spacecraft, Orbit orbit+comms, Launch science), hand-over screen hides choices, 4-vote storm majority (tie: systems lead).
  - U8: focus rings, skip link, focus moves to screen heading, aria labels, 48 px targets, RTL (charts/stripe keep LTR time axis), Arabic units in Plex Sans Arabic, engine messages in Arabic via web/src/i18n/engine-ar.json when all params exist (else engine English), inline SVG favicon (no 404). en/ar 328 keys, same placeholders (tested).
  - Tests: web `pnpm test` = i18n + shell checks + vitest 9/9 (adapter on real data, band edges vs engine, trail, ground track, votes, re-fly). Engine unchanged 79 + 3 expected fail + 6 skipped. Build ok. Smoke: `pnpm build && node scripts/smoke.mjs` walks all screens at 390/1440 EN/AR; clean run: no console errors, no external requests, no horizontal overflow; screenshots in qa/screens/ (git-ignored). Dev deps added (pre-approved list): vitest, @playwright/test.
- U1d: Built app shell with uppercase display-l title, language toggle, and root data-theme attribute; Zustand routing store in web/src/navigation.ts covering 7 screens (Brief, Build, Orbit, Launch, Flight, Report, Refly) with segment tags (user, space, launch, ground) in web/src/screens/; CML progress rail (Cocktail Napkin, Initial Feasibility, Trade Space, Point Design) with brass ticks and step tracking; Back and Next navigation buttons in lapis (never sol). Tests green (77/77 keys symmetrical, unit tests in test-shell.mjs).
- U1c: Built i18n system in web/src/i18n/ (t(key), en.json, ar.json, useI18n Zustand in-memory store) covering app title, 7 screen names, Next/Back/Language, fallback to key text, parameter interpolation, document.documentElement.lang/dir updates, Arabic font fallbacks (:lang(ar), [lang="ar"]), and LanguageToggle component. Tests green (71/71 keys symmetrical, missing key fallback, store toggle).
- U1b: Self-hosted 5 font families as woff2 in web/public/fonts/ with OFL licences (Big Shoulders Display 800, Reem Kufi, IBM Plex Sans, IBM Plex Sans Arabic, IBM Plex Mono), created fonts.css with @font-face and font-display: swap, wired into app with 9 typography hierarchy styles verified.
- U1a: Vite + React 19 + TS strict + Zustand web app initialized, design/tokens.json created from design/README.md, web/scripts/make-tokens.mjs generating tokens.css, swatch test page with paper/night theme toggle running.
- T0.1 (Sat 08:3x) pnpm workspace (engine, web placeholder), uv project in pipeline/ (Py 3.12.14, pymsis 0.13.0), engine/src/contracts.ts (AGENTS.md s4), engine/test/fixtures/mock-result.json (hand-made, 6U 500 km SSO, launch 2023-04-15, truth, reenters 2025-11-06, 936 d; NOT engine output, missionCode not decodable). Engine tests 6/6.

- T0.2 (Sat ~09:00) pipeline: fetch_omni (OMNI2 2014..2026, ends 2026-10-29, 2 F10.7 days interpolated), fetch_forecast (Oct 2026 MSFC Table 4, 50% SSN/Ap; F10.7 = 65.71+0.647*SSN+0.000799*SSN^2, R2 0.961), build_plan2019 (Hathaway shape, peak SSN 115 Jul 2025), fetch_donki (164 GST, 50-day chunks: API caps 60 d), fetch_gibs (MODIS 2025-06-16, HLS L30 Cunene 2024-08-13, HLS S30 Jeddah 2024-07-04), build_density (4 tables, 129 s on 22 cores), build_all (idempotent; outputs byte-identical on rerun). Density built 09:0x, so the 10:00 fallback is NOT needed.

- T0.3 test_pipeline.py: obs/adj F10.7 1.034 (4 Jan) and 0.967 (4 Jul); 500 km min->max x18.7 (sso and iss); no NaN; join +9.0%; data 2.72 MB < 4 MB. 14/14.

- T1.1 rng.ts (mulberry32), constants.ts (SOURCES tag per constant, test-enforced), orbit.ts (period, J2 SSO incl., eclipse@beta0, GSD/swath, revisit, Funda passes 30 s ground track, mask 10 deg game-balanced). Engine 14/14.

- T1.2 catalog.ts (content schema, CDS Rev 14.1 masses, BUS game-balanced), power.ts (1361 W/m2 x 30% x area x sunlit; CML 35% power+energy, DoD 0.3 game-balanced), comms.ts (downlink MB/day, overflowing bucket), launch.ts (resolveDesign + 10 fit checks with Msg reasons). content stub fixture + ISSUES.md schema note. Engine 21/21.

- T1.3 dates.ts, drag.ts (log-linear density lookup over daily+monthly rows), decay.ts (RK2, 1 d / 1 h below 250 km, 120 km reentry). Golden 1 PASS after the one allowed fit: beta 72.3 -> 68.43 kg/m2 (-5.3%), reentry 2025-10-26, waypoints 454/403/295 km. Golden 3 PASS: 210 km truth 1.27 d vs plan 2.80 d; storm costs 0.066% of life at 500 km. Golden 2 = todo (needs DAS reference values). Engine 29 + 1 todo.

- T1.4 rules.ts (gauge states vs CML 35%, FCC 5 y / NASA 25 y disposal, lower-bound case), events.ts (seeded slip 0-12 mo skewed short, DONKI Kp>=7 alerts, stormPolicy vote: safe-mode = payload off, ride-out = 20% buffer-reset chance, game-balanced), score.ts (requirements in contract order, 16 pts each + 20 Sun-resilience, game-balanced). Engine 35 + 1 todo.

- T1.5 (= prompt A T1.3 rest + T1.4) flight.ts simulate(design, data): plan/truth/truth-no-slip flights, seeded slip (truth only; timeline[0] = actual launch), DONKI storm flags + vote, daily power/data/battery timeline, outcomes reentered / alive (predicted on forecast Sun) / alive-at-forecast-end (>= N y), gauges, disposal, score. causes.ts (sun days, density x, slip, storm km over baseline, propulsion, verdict; 3..5). closest.ts (FACSAT-2 only, sourced). mission-code.ts ("SP1-" + base64url, pure ES, no DOM/Node). decay.ts reboost (fuel dv -> da = 2a dv/v). index.ts: createEngine(engineDataFrom(raw)) or setEngineData + simulate(design). content/sources.csv created (engine constants + golden refs). Engine 47 + 1 todo; 5-60 ms per simulate.

- T1.6 .github/workflows/pages.yml: on push to main / PR: pnpm install, engine tests, pipeline pytest (uv), web build (--if-present), upload web/dist and deploy to Pages only when web/dist/index.html exists (web/ on main is still a placeholder). Needs repo Settings > Pages > Source: GitHub Actions. Not yet run on GitHub.

- T1.7 README: name, challenge, summary, how to run, NASA datasets, team, AI use, NRLMSIS licence, golden results, disclosed limits.

- Merged lane/renad (U1a-U1c) into main; HANDOFF conflict resolved (both lanes' Done lines and resume prompts kept). Lockfile valid, web builds (237 kB JS), web i18n checks pass.

- Golden 2 (NASA DAS 6U, 51.6 deg, iss_truth table, 1 Jan launches, Cd*A/m 0.0154, no fit) from Iyad's chart-read fixture das-6u-reference.json: 18/21 checkable points within +/-30%; 3 KNOWN FAIL (it.fails, decided by Iyad): 430/2039 0.67, 550/2033 0.69, 550/2034 0.55. 550 km runs 0.69-0.88 for 2027-2033. 10 lower-bound points (alive at Oct 2041) checked <= DAS +30%; 6 launches after table end skipped; 2021-2026 informational. 3 shape checks pass. Engine 79 + 3 expected fail + 6 skipped.

- Fonts: Reem Kufi removed at Iyad's request (hard to read). Arabic display is now IBM Plex Sans Arabic 700 (already shipped): design/tokens.json display-ar -> regenerated tokens.css; Reem Kufi @font-face, woff2 files, OFL txt and download entries removed; AGENTS.md s3 and design/README.md updated. Renad: do not reintroduce it.

- Pages check (Sat ~09:40): test-and-deploy run 43567151355 green (build + deploy); https://iyadabouelseoud.github.io/stormproof/ serves the Vite app, JS, data/*.json and fonts return 200. lane/renad has nothing new to merge. Content (Dua) not landed yet. Tests: engine 79 + 3 expected fail + 6 skipped, pipeline 14/14, web i18n pass.

## In progress
-

## Next (resume prompt)
- Iyad (engine/pipeline): "Read AGENTS.md, HANDOFF.md, ISSUES.md and prompts/A-iyad-claude-code-opus.md. Engine simulate() is done (HANDOFF T1.5). Prompt A T1.1-T1.7 are done. Next: merge lane/renad when ready and check the Pages run on GitHub; replace content-stub with content/*.json when Dua's content lands; golden 2 keeps its 3 disclosed known fails (430/2039, 550/2033, 550/2034): FINAL, Iyad 2026-11-14. Do not tune Cd*A/m, density, inputs or tolerances to close them."
- Renad (web/): "Read AGENTS.md, HANDOFF.md, and prompts/B-renad-ui-gemini-flash.md. Prompt B U1a-U8 are done on lane/renad. Next: check every screen yourself in a real browser (390 and 1440 px, EN and AR); look into the intermittent headless-Chrome crash (Blocked list); answer the Contract requests below; swap content-stub for content/*.json and add hero art (SI tag) when Dua's content lands."

## Contract requests (UI; stubbed in web/src/engineAdapter.ts, contracts not edited)
- Scenario title + story text: content stub has none. Stub: i18n brief.title.angola / brief.story.angola, labelled "placeholder story" on screen.
- Altitude thresholds for the Orbit band: not in SimResult. Stub: adapter binary-searches the engine (10 km grid, about 12 runs per design): lowest altitude meeting the lifetime requirement, highest passing FCC 5 y. Tested against the engine at the band edges.
- Ground track: not in SimResult. Stub: computed in the adapter from engine inclinationDeg/periodS (circular, spherical Earth); start longitude illustrative, labelled.
- Plan timeline for the dashed line: not in SimResult; the UI runs simulate() again with mode 'plan' (same design and seed).
- Map coastline: no coastline data ships (would need e.g. Natural Earth 110 m, public domain, in content/). Map shows graticule, equator, target latitude and Funda only.
- Engine Msg Arabic: some engine messages carry numbers only inside `en` (e.g. fit.mass.ok has no form-factor param); those stay English in Arabic mode. Long-term home: content/i18n.

## Blocked / disclosed limits
- UI: intermittent renderer crash in headless Chrome during the first second of Flight playback in the smoke script (crashed in 5 of the last 9 full smoke runs on 2026-11-14, including 2 of 3 after the fix below). JS heap stays flat (about 25 MB); not reproduced in 24 isolated runs of the same flow (dev and production builds, with screenshots); cause unknown. Flight per-frame work was reduced afterwards; that did not fix it. Needs a check in a real browser before the demo.
- UI: part, rocket and scenario names are English only (content stub); Arabic needs content/i18n.
- Pages Source is still "Deploy from a branch" (build_type legacy, main /), so a Jekyll pages-build-deployment runs on every push and races the Actions deploy (last finisher wins). Iyad: set Settings > Pages > Source to "GitHub Actions" (or `gh api -X PUT repos/IyadAbouelseoud/stormproof/pages -f build_type=workflow`).
- CI annotation: actions/* v4 target Node 20 (deprecated, forced to Node 24); works today.
- contracts.ts adds `stormPolicy?: 'ride-out' | 'safe-mode'` (needed by T1.4 events.ts; not listed in s4) and an i18n `Msg` {key, params, en} for all plain-language text.
- OMNI has no SSN for Oct 2026 (29 nulls in sun_daily.ssn; F10.7/Ap complete).
- Forecast join: first forecast month F10.7 is +9% vs the last 27 OMNI days (13-month smoothed prediction).
- Plan Sun before Dec 2019 = real OMNI; cycle 26 in plan = cycle-25 shape +11 y (game-balanced).
- Orbit average: 12 points/orbit; SSO 2 UTs, ISS 4 node local times. MSIS storm under-response: only Feb 2022 x1.875 corrected.
- Golden 1 fit disclosed: unfitted beta 72.3 reentered 2025-12-26 (+60 d, 6.6% long) and missed the 2025-10-02 waypoint (350 vs 300 km); fitted plan/truth ratio 1.44 vs paper 1.52.
- Golden 2: 3 known fails (see Done); 550 km systematically short; reference values are chart-read, not DAS output; slide 20 inputs read (identical to slide 19 except 550 km, matching our assumption); launch day-of-year, eccentricity, Cd and mass not on the slides.
- @types/node install was blocked by the permission classifier; tests use engine/test/node-shim.d.ts instead (no new dependency).
- Local Node is v24; CI targets Node 22 LTS.
- simulate() runs on content-stub.json until content/parts.json, rockets.json, scenarios/angola.json land (game-balanced stub). With the stub the Angola revisit requirement is unmeetable (30 km swath -> about 84 d vs 10 d target): content balance, not engine.
- Storm cause = 2-day altitude loss x (1 - baseline density / storm density) at fixed altitude; an estimate, labelled "more than normal decay".
- Closest-design list has only FACSAT-2 (the one sourced reference mission).
- 2026-11-14 13:40: game-feel plan added. prompts/G-game-feel.md (motion, sound, art wiring, tasks G1-G9), prompts/D2-extra-art-gemini.md (Dua: P8-P12), prompts/C now has Track 5 (audit and fill gaps). design/README.md art cap 7 to 12. Renad can run G1-G5 now; Fable only verifies.
