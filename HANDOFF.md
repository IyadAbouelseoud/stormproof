# HANDOFF

Updated by the agent at every checkpoint (tests green, committed).

## Done
- T0.1 (Sat 08:3x) pnpm workspace (engine, web placeholder), uv project in pipeline/ (Py 3.12.14, pymsis 0.13.0), engine/src/contracts.ts (AGENTS.md s4), engine/test/fixtures/mock-result.json (hand-made, 6U 500 km SSO, launch 2023-04-15, truth, reenters 2025-11-06, 936 d; NOT engine output, missionCode not decodable). Engine tests 6/6.

- T0.2 (Sat ~09:00) pipeline: fetch_omni (OMNI2 2014..2026, ends 2026-10-29, 2 F10.7 days interpolated), fetch_forecast (Oct 2026 MSFC Table 4, 50% SSN/Ap; F10.7 = 65.71+0.647*SSN+0.000799*SSN^2, R2 0.961), build_plan2019 (Hathaway shape, peak SSN 115 Jul 2025), fetch_donki (164 GST, 50-day chunks: API caps 60 d), fetch_gibs (MODIS 2025-06-16, HLS L30 Cunene 2024-08-13, HLS S30 Jeddah 2024-07-04), build_density (4 tables, 129 s on 22 cores), build_all (idempotent; outputs byte-identical on rerun). Density built 09:0x, so the 10:00 fallback is NOT needed.

- T0.3 test_pipeline.py: obs/adj F10.7 1.034 (4 Jan) and 0.967 (4 Jul); 500 km min->max x18.7 (sso and iss); no NaN; join +9.0%; data 2.72 MB < 4 MB. 14/14.

## In progress
-

## Next (resume prompt)
- "Read AGENTS.md and HANDOFF.md. Continue Iyad's lane at T0.2 (pipeline fetch/build scripts) per prompts in HANDOFF."

## Blocked / disclosed limits
- contracts.ts adds `stormPolicy?: 'ride-out' | 'safe-mode'` (needed by T1.4 events.ts; not listed in s4) and an i18n `Msg` {key, params, en} for all plain-language text.
- OMNI has no SSN for Oct 2026 (29 nulls in sun_daily.ssn; F10.7/Ap complete).
- Forecast join: first forecast month F10.7 is +9% vs the last 27 OMNI days (13-month smoothed prediction).
- Plan Sun before Dec 2019 = real OMNI; cycle 26 in plan = cycle-25 shape +11 y (game-balanced).
- Orbit average: 12 points/orbit; SSO 2 UTs, ISS 4 node local times. MSIS storm under-response: only Feb 2022 x1.875 corrected.
- Local Node is v24; CI targets Node 22 LTS.
