# Jeddah flood watch: calibration (prompt E3, G4)

All targets in `content/scenarios/jeddah-flood.json` are **game-balanced**. Cloud tags (G4, final): 23 Nov partly, 24 Nov cloudy, 25 Nov clear, 26 Nov no-image, 27 Nov clear.

Targets: budget 1.9 M USD, revisit <= 5 d, GSD <= 30 m, data >= 100 GB, lifetime >= 365 d, event look within **2 days** of 24 Nov 2022 (`lookWindowDays: 2`). Six requirements, each 80/6 points, +20 Sun resilience (perfect = 100).

Reference build: 6U, SSO 500 km, SpaceX rideshare (350,000 USD estimate), launch 2021-06-01, truth mode, large panels, medium battery, fast radio, standard computer, precise pointing, small fuel.

| Design (seed 1) | Event look | Fit | Score | Event pass over seeds 1-40 |
|---|---|---|---|---|
| Budget optical camera | FAIL: one pass on 24 Nov, storm cloud | all pass | 80 | 13/40 |
| Same, radar study camera | PASS (24 Nov) | FAIL budget 2.01 M, volume 6.25 U | 80 | 39/40 |
| Lean radar (medium panels, small battery, basic computer, standard pointing) | PASS (24 Nov) | all pass | 80 | 18/40 |
| Budget optical, standard pointing | PASS (25 Nov, clear) | all pass | 80 | 11/40 |
| Standard optical | PASS (25 Nov) | all pass | 80 | 11/40 |
| Sharp optical | no pass in window (revisit 13.6 d) | all pass | 67 | 0/40 |
| Budget optical at 300 km, Electron | reentered before the storm | all pass | 40 | 0/40 |

Checks (engine/test/event.test.ts, "Jeddah calibration"): optical fixed design fails on cloud; radar swap passes but busts the budget; lean radar passes and fits; at least three balanced designs score >= 80.

Notes: optical success depends on when the pass falls (seeded phase): on the flood day the cloud blocks it, the next day is clear. That is the lesson, not noise. Only game numbers were tuned (Jeddah budget 1.5 -> 1.9 M, radar volume 3 -> 2.5 U); no sourced number and no physics constant was changed.
