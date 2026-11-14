# HANDOFF

Updated by the agent at every checkpoint (tests green, committed).

## Done
- T0.1 (Sat 08:3x) pnpm workspace (engine, web placeholder), uv project in pipeline/ (Py 3.12.14, pymsis 0.13.0), engine/src/contracts.ts (AGENTS.md s4), engine/test/fixtures/mock-result.json (hand-made, 6U 500 km SSO, launch 2023-04-15, truth, reenters 2025-11-06, 936 d; NOT engine output, missionCode not decodable). Engine tests 6/6.

- T0.2 (Sat ~09:00) pipeline: fetch_omni (OMNI2 2014..2026, ends 2026-10-29, 2 F10.7 days interpolated), fetch_forecast (Oct 2026 MSFC Table 4, 50% SSN/Ap; F10.7 = 65.71+0.647*SSN+0.000799*SSN^2, R2 0.961), build_plan2019 (Hathaway shape, peak SSN 115 Jul 2025), fetch_donki (164 GST, 50-day chunks: API caps 60 d), fetch_gibs (MODIS 2025-06-16, HLS L30 Cunene 2024-08-13, HLS S30 Jeddah 2024-07-04), build_density (4 tables, 129 s on 22 cores), build_all (idempotent; outputs byte-identical on rerun). Density built 09:0x, so the 10:00 fallback is NOT needed.

- T0.3 test_pipeline.py: obs/adj F10.7 1.034 (4 Jan) and 0.967 (4 Jul); 500 km min->max x18.7 (sso and iss); no NaN; join +9.0%; data 2.72 MB < 4 MB. 14/14.

- T1.1 rng.ts (mulberry32), constants.ts (SOURCES tag per constant, test-enforced), orbit.ts (period, J2 SSO incl., eclipse@beta0, GSD/swath, revisit, Funda passes 30 s ground track, mask 10 deg game-balanced). Engine 14/14.

- T1.2 catalog.ts (content schema, CDS Rev 14.1 masses, BUS game-balanced), power.ts (1361 W/m2 x 30% x area x sunlit; CML 35% power+energy, DoD 0.3 game-balanced), comms.ts (downlink MB/day, overflowing bucket), launch.ts (resolveDesign + 10 fit checks with Msg reasons). content stub fixture + ISSUES.md schema note. Engine 21/21.

- T1.3 dates.ts, drag.ts (log-linear density lookup over daily+monthly rows), decay.ts (RK2, 1 d / 1 h below 250 km, 120 km reentry). Golden 1 PASS after the one allowed fit: beta 72.3 -> 68.43 kg/m2 (-5.3%), reentry 2025-10-26, waypoints 454/403/295 km. Golden 3 PASS: 210 km truth 1.27 d vs plan 2.80 d; storm costs 0.066% of life at 500 km. Golden 2 = todo (needs DAS reference values). Engine 29 + 1 todo.

- T1.4 rules.ts (gauge states vs CML 35%, FCC 5 y / NASA 25 y disposal, lower-bound case), events.ts (seeded slip 0-12 mo skewed short, DONKI Kp>=7 alerts, stormPolicy vote: safe-mode = payload off, ride-out = 20% buffer-reset chance, game-balanced), score.ts (requirements in contract order, 16 pts each + 20 Sun-resilience, game-balanced). Engine 35 + 1 todo.

- T1.5 (= prompt A T1.3 rest + T1.4) flight.ts simulate(design, data): plan/truth/truth-no-slip flights, seeded slip (truth only; timeline[0] = actual launch), DONKI storm flags + vote, daily power/data/battery timeline, outcomes reentered / alive (predicted on forecast Sun) / alive-at-forecast-end (>= N y), gauges, disposal, score. causes.ts (sun days, density x, slip, storm km over baseline, propulsion, verdict; 3..5). closest.ts (FACSAT-2 only, sourced). mission-code.ts ("SP1-" + base64url, pure ES, no DOM/Node). decay.ts reboost (fuel dv -> da = 2a dv/v). index.ts: createEngine(engineDataFrom(raw)) or setEngineData + simulate(design). content/sources.csv created (engine constants + golden refs). Engine 47 + 1 todo; 5-60 ms per simulate.

## In progress
-

## Next (resume prompt)
- "Read AGENTS.md, HANDOFF.md, ISSUES.md and prompts/A-iyad-claude-code-opus.md. Engine simulate() is done (HANDOFF T1.5). Continue Iyad's lane at prompt A T1.5 (tell Renad to switch her adapter; see ISSUES 'Engine wiring'), then T1.6 Pages deploy workflow, T1.7 README."

## Blocked / disclosed limits
- contracts.ts adds `stormPolicy?: 'ride-out' | 'safe-mode'` (needed by T1.4 events.ts; not listed in s4) and an i18n `Msg` {key, params, en} for all plain-language text.
- OMNI has no SSN for Oct 2026 (29 nulls in sun_daily.ssn; F10.7/Ap complete).
- Forecast join: first forecast month F10.7 is +9% vs the last 27 OMNI days (13-month smoothed prediction).
- Plan Sun before Dec 2019 = real OMNI; cycle 26 in plan = cycle-25 shape +11 y (game-balanced).
- Orbit average: 12 points/orbit; SSO 2 UTs, ISS 4 node local times. MSIS storm under-response: only Feb 2022 x1.875 corrected.
- Golden 1 fit disclosed: unfitted beta 72.3 reentered 2025-12-26 (+60 d, 6.6% long) and missed the 2025-10-02 waypoint (350 vs 300 km); fitted plan/truth ratio 1.44 vs paper 1.52.
- Golden 2 (NASA DAS 6U 430/550 km) not run: needs DAS output values from Iyad/Dua.
- @types/node install was blocked by the permission classifier; tests use engine/test/node-shim.d.ts instead (no new dependency).
- Local Node is v24; CI targets Node 22 LTS.
- simulate() runs on content-stub.json until content/parts.json, rockets.json, scenarios/angola.json land (game-balanced stub). With the stub the Angola revisit requirement is unmeetable (30 km swath -> about 84 d vs 10 d target): content balance, not engine.
- Storm cause = 2-day altitude loss x (1 - baseline density / storm density) at fixed altitude; an estimate, labelled "more than normal decay".
- Closest-design list has only FACSAT-2 (the one sourced reference mission).
