# Track 6: functional and data integrity (final pass, 14 Nov 2026)

Scripts are in `qa/track6/` (matrix.mjs, flows.mjs, audit.mjs) and `engine/test/` (fuzz, edge, invariants, demo). Raw rows are in `qa/track6/out/*.json`. The browser matrix and flows ran on the build before the fixes listed below; the fixes were then checked by engine tests, `web/scripts/demo-walk.mjs` and the final sweeps in `qa/TRACK2.md`. The matrix was not re-run in full after the fixes (stated where it matters).

## Engine: fuzz, edge designs, invariants (all pass)
`pnpm --filter @stormproof/engine test`: 164 passed, 3 expected fail (golden 2), 7 skipped.
- **Fuzz** (`fuzz.test.ts`): 500 seeded random valid designs, both scenarios, all form factors, both orbits, 150-800 km, 2015-01 to 2026-10, both modes, all rockets, both storm policies. No exception; no NaN, Infinity or undefined anywhere in SimResult; battery within 0..100%; data bucket never negative; gauges consistent with the timeline; outcome consistent with lifetime days; score within 0..100; causes ordered and non-empty; mission code round-trips and re-simulates to the same hash.
- **Mission-code robustness**: empty, truncated, wrong-prefix and tampered codes, plus 1,000 random single-character mutations.
- **Edge designs** (`edge.test.ts`): 1U with the largest parts (fails mass and volume, with reasons), 6U maximum parts, 150 km and 800 km, launches at both ends of the timeline, a rocket that cannot reach the orbit, launch before a rocket's first flight, zero fuel (stub catalog), every camera including radar in both scenarios, radar in Angola, Jeddah launch before and after the event. Each gives a verdict or a fit-check message, no NaN, no negative bucket.
- **Invariants** (`invariants.test.ts`) and **demo numbers** (`demo.test.ts`, `demo-numbers.test.ts`): see `qa/TRACK1.md` and `DEMO.md`.

## Bugs found and fixed
| # | Bug | Found by | Fix | Regression test |
|---|---|---|---|---|
| 1 | `decodeMission` leaked a raw `URIError` for a broken percent escape | fuzz mutations | clean `mission code: bad text` error | `invariants.test.ts` |
| 2 | A code with a launch year far outside 2015-2026 (or an off-calendar date) decoded, then `simulate()` threw a TypeError | fuzz mutations | date must be a real day inside the contract's 2015-2026 timeline | `invariants.test.ts` |
| 3 | A code with altitude 5000 km or -40 km loaded and changed the design | matrix (Report, mission code field) | altitude must be a plain number inside the density table range, 150-800 km | `invariants.test.ts` |
| 4 | Empty or whitespace code + Load did nothing (no message) | matrix | shows the inline "invalid code" message | not automated |
| 5 | Re-fly comparison table showed raw ids (`spacex-rideshare`, `battery-large`) and English-only labels ("Param", "Run 1", "Orbit Type") | flows F5 | names from content/text and i18n, in EN and AR | `demo-walk.mjs` reads the table |
| 6 | Re-fly one-click tweaks were hidden until a second flight existed | judge walk | shown under the first flight too | `demo-walk.mjs` clicks one |
| 7 | Report backdrop picture was clipped by 24 px, cutting the "SI-generated" tag | overflow sweep | frame sets the shape | final sweep |
| 8 | Launch and Flight header pictures were about 740 px tall at 1440 and pushed the Sun Stripe, the Launch button and the altitude chart below the first screen | judge walk | capped to a band | screenshots `qa/screens/judge-*` |

## Browser functional matrix (production build, before the fixes)
62 controls per run, 5 runs: 1440 EN mouse, 1440 EN keyboard-only, 1440 AR, 390 EN, 390 AR. Each run: 56 pass, 6 flagged, 0 page errors.

| Flagged row (same in all 5 runs) | Verdict |
|---|---|
| Mission code: empty + Load, whitespace + Load: no inline error | Bug 4, fixed |
| Mission code: altitude 5000, altitude -40 accepted | Bug 3, fixed |
| Sources drawer: "raw keys" in text | False alarm: the matched text is file names in the Source column (`score.ts`, `score.requirements`). All label keys exist in en.json and ar.json (checked). |
| Build: no zero-fuel option | Not a bug: the catalog has two tanks and no "none". Content decision; disclosed. |

Flows, 28 steps per run, 4 runs (1440 and 390, EN and AR): 25 pass, 3 flagged each.

| Flagged step | Verdict |
|---|---|
| Team mode: "Continue after vote" still saw a storm card 0.5 s later | Not confirmed as a bug: at 16x the next Kp 7+ storm arrives within that half second and opens its own card. The flow then finished the flight with the voted policy. Not re-tested by hand: unverified. |
| Re-fly text had raw ids | Bug 5, fixed |
| Offline reload: one lazy picture (`art-p6`) that had not been seen before going offline did not load | Limit, disclosed: there is no service worker. Zero requests left the origin. For a demo without Wi-Fi, serve the built site locally (`pnpm preview`); then nothing needs the network. |

Passed in every run: Solo and Team setup (names, roles, hand-over), Back/Next and the CML rail jumps, reload and hash routes, language and theme switch mid-flow keeping the design, Re-fly baseline and deltas, scenario switch Angola to Jeddah and back with no Jeddah state left in Angola, valid code loads the design, truncated / wrong-prefix / tampered codes show the inline error and never change the design, no "undefined", "NaN", "[object" or "Infinity" in the rendered text of any screen.

## Data audit (`node qa/track6/audit.mjs`): 56 checks, 52 pass, 4 flagged
Pass: every file in `web/public/data` and `content/**/*.json` parses; `.bin` sizes match `density_meta.json`; all densities finite and strictly decreasing with altitude (20 sampled rows per table, and 0 non-monotone rows in the full tables); `sun_daily` has 4,320 days with no nulls in F10.7; Sun Stripe months equal the monthly means recomputed from `sun_daily.json` for 5 months (2015-01 137.5, 2019-12 68.7, 2022-02 106.5, 2024-05 191.9, 2026-06 142.9 sfu); `sources.csv` has 85 rows, unique ids; part, rocket, scenario and message ids unique with EN and AR text; en.json and ar.json have the same keys and placeholders; every picture referenced in `web/src` exists; all 27 art pictures have EN and AR alt text; GIBS pictures match `credits.json` both ways.

Flagged (hygiene, none changes a number on screen):
1. Two catalog `src` fields are a sentence, not a bare id: Electron ("AGENTS.md s5 (200 kg to 500 km SSO); price ... game-balanced") and the Angola scenario ("game-balanced (targets); target point approximate"). The csv has `electron-capacity`. Left as is.
2. The 14 GIBS pictures have no `sources.csv` row. They are credited in `web/public/img/gibs/credits.json` (layer, date, credit), which AGENTS.md s8 names as the GIBS credit file.
3. Eight `art-alt.json` keys match no shipped file (older names and uncropped originals).
4. Four `sources.csv` rows point to art files that are not shipped (`p14-medals`, `p16-role-emblems`, `p18`, `p19` originals; the cropped versions ship).

## Demo-path numbers
`web/scripts/demo-walk.mjs` performs the DEMO.md script in the browser and checks 24 strings on screen against the engine values (FAIL: DIED, Aug 25, 2025, 386, 833, 1219, 78, 4 / 5; FIX: LIVED, Aug 29, 2026, 435, 1202, 1637, 95, 5 / 5, FCC text; both mission codes). Result at 1440x900, 390x844 and with reduced motion: 0 wrong numbers, 0 console or network problems. The three Jeddah codes are checked against the engine in `engine/test/demo.test.ts` and `demo-numbers.test.ts`; they were not walked in the browser by this script (the Jeddah scenario is walked in the crash walks and the axe sweep).
