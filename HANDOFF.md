# HANDOFF

Updated by the agent at every checkpoint (tests green, committed).

## Done
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

## In progress
-

## Next (resume prompt)
- Iyad (engine/pipeline): "Read AGENTS.md, HANDOFF.md, ISSUES.md and prompts/A-iyad-claude-code-opus.md. Engine simulate() is done (HANDOFF T1.5). Prompt A T1.1-T1.7 are done. Next: merge lane/renad when ready and check the Pages run on GitHub; replace content-stub with content/*.json when Dua's content lands; golden 2 runs with 3 disclosed known fails (re-read slide 20 inputs if possible)."
- Renad (web/): "Read AGENTS.md, HANDOFF.md, and prompts/B-renad-ui-gemini-flash.md. Continue Renad's lane at STEP U1d (shell, routing and CML rail)."

## Blocked / disclosed limits
- contracts.ts adds `stormPolicy?: 'ride-out' | 'safe-mode'` (needed by T1.4 events.ts; not listed in s4) and an i18n `Msg` {key, params, en} for all plain-language text.
- OMNI has no SSN for Oct 2026 (29 nulls in sun_daily.ssn; F10.7/Ap complete).
- Forecast join: first forecast month F10.7 is +9% vs the last 27 OMNI days (13-month smoothed prediction).
- Plan Sun before Dec 2019 = real OMNI; cycle 26 in plan = cycle-25 shape +11 y (game-balanced).
- Orbit average: 12 points/orbit; SSO 2 UTs, ISS 4 node local times. MSIS storm under-response: only Feb 2022 x1.875 corrected.
- Golden 1 fit disclosed: unfitted beta 72.3 reentered 2025-12-26 (+60 d, 6.6% long) and missed the 2025-10-02 waypoint (350 vs 300 km); fitted plan/truth ratio 1.44 vs paper 1.52.
- Golden 2: 3 known fails (see Done); 550 km systematically short; reference values are chart-read, not DAS output; deck's launch day-of-year and slide 20 inputs unknown.
- @types/node install was blocked by the permission classifier; tests use engine/test/node-shim.d.ts instead (no new dependency).
- Local Node is v24; CI targets Node 22 LTS.
- simulate() runs on content-stub.json until content/parts.json, rockets.json, scenarios/angola.json land (game-balanced stub). With the stub the Angola revisit requirement is unmeetable (30 km swath -> about 84 d vs 10 d target): content balance, not engine.
- Storm cause = 2-day altitude loss x (1 - baseline density / storm density) at fixed altitude; an estimate, labelled "more than normal decay".
- Closest-design list has only FACSAT-2 (the one sourced reference mission).
