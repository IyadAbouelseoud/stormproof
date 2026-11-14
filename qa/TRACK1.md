# Track 1: physics and validity (final pass, 2026-11-14)

All numbers below are from command output on commit 0c14577 + this pass.

## Independent recomputation (`qa/independent_check.py`)
Separate Python implementation (no engine import): period from mean motion, SSO inclination by Newton solve of the J2 precession rate (cross-checked with the (a/12352 km)^3.5 rule), eclipse from asin(R/a), decay by RK4 with 1/8-day steps (1/96 day below 250 km; the engine uses RK2 with 1-day / 1-hour steps), its own density-table reader, and the launch-fit check from content/*.json.
Engine numbers: `cd engine && QA_DUMP=1 pnpm exec vitest run test/independent-dump.test.ts` -> `qa/track1/engine_values.json`.
Result: **51 comparisons, 0 over the limit** (limit 5%, 10% for lifetimes). Largest delta 0.34%.

| Case | Engine | Independent | Delta |
|---|---|---|---|
| FACSAT-2 truth lifetime (497 km SSO, 15 Apr 2023, fitted beta 68.43) | 925.96 d | 925.34 d | 0.07% |
| FACSAT-2 altitude 29 Aug 2024 / 3 Mar 2025 / 2 Oct 2025 | 454.4 / 403.4 / 294.9 km | 454.4 / 403.3 / 293.9 km | <= 0.34% |
| FACSAT-2 plan lifetime | 1334.07 d | 1334.05 d | 0.002% |
| 6U 430 km, 51.6 deg, 1 Jan 2021 | 746.2 d | 746.0 d | 0.03% |
| 6U 550 km, 51.6 deg, 1 Jan 2021 | 3581.0 d | 3574.0 d | 0.20% |
| 210 km on 3 Feb 2022, truth / plan | 1.269 / 2.797 d | 1.267 / 2.794 d | 0.21% / 0.11% |
| 6U 497 km plan flight with reboost (simulate) | 1637 d | 1637.4 d | 0.03% |
| Oversized 1U (largest parts) | fails mass and volume | fails mass and volume | same verdicts |
| Period, SSO inclination, eclipse fraction at 210/430/497/550 km | | | <= 0.001% |

Not recomputed: ground-station pass geometry (data and comms fit checks) and seeded events.

## Sun-data rules, AGENTS.md s5 (`qa/track1/pipeline_check.py`, on the shipped files): 0 failed
- Adjusted -> observed F10.7: 4,320 days against an independent Earth-Sun distance formula, max ratio difference 0.0018; mean ratio 1.0344 on 4 Jan and 0.9675 on 4 Jul (rule: 1.034 / 0.967).
- 81-day centred mean of observed: max difference 0.058 sfu (days 41 onward; the first 40 days use Dec 2014 OMNI days in the pipeline window, which is correct).
- Join: OMNI ends 2026-10-29; forecast rows 2026-11-15 to 2041-10-15 (180 monthly rows); first forecast month is +9.0% against the last 27 OMNI days (disclosed); SSN -> F10.7 fit reproduces the file to 0.05 sfu (R2 0.961).
- Feb 2022 correction: NRLMSIS 2.1 re-run (pymsis) from the shipped drivers for 1-7 Feb 2022: shipped minus recomputed log10 density is +0.2733 / +0.2731 / +0.2729 on 3-5 Feb (factor 1.876 / 1.875 / 1.874) and within 0.0003 on the other days.

## Invariants (`engine/test/invariants.test.ts`, 6 tests, all pass)
60 seeded random designs on the real catalog (both scenarios): battery within 0..100%; no negative data quantity; every altitude gain is a reboost that stays at or below the design altitude; without propulsion altitude never rises (8 flights); identical SimResult hash on 3 re-runs (20 designs); mission codes round-trip and re-simulate to the same hash (20 designs; 100 more in simulate.test.ts); with the plan tables replaced by the truth tables and a zero-slip seed, plan and truth give the same lifetime and altitudes and "the Sun took 0 days".

## Golden tests (`pnpm --filter @stormproof/engine exec vitest run test/golden.test.ts --reporter=verbose`)
1. FACSAT-2: PASS. Reentry 2025-10-26 (926 d) vs real 2025-10-27; waypoints 454 / 403 / 295 km; plan/truth 1.44 (paper 1.52). One disclosed fit (beta 72.3 -> 68.43).
2. NASA DAS 6U: 18 of 21 checkable points within +/-30%; 3 KNOWN FAIL, unchanged and disclosed: 430 km/2039 ratio 0.67, 550 km/2033 0.69, 550 km/2034 0.55. 10 lower-bound points pass, 6 skipped (launch after Oct 2041), 3 shape checks pass. Informational 2021-2026: 430 km ratios 0.97, 0.96, 0.95, 0.55, 0.71, 1.05; 550 km 0.71-0.90.
3. Starlink trap: PASS. Truth 1.27 d, plan 2.80 d; at 500 km the storm costs 0.066% of life.
No tolerance, fixture or constant was changed.
