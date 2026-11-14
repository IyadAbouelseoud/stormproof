# HANDOFF

Updated by the agent at every checkpoint (tests green, committed).

## Done
- U1a: Vite + React 19 + TS strict + Zustand web app initialized, design/tokens.json created from design/README.md, web/scripts/make-tokens.mjs generating tokens.css, swatch test page with paper/night theme toggle running.
- T0.1 (Sat 08:3x) pnpm workspace (engine, web placeholder), uv project in pipeline/ (Py 3.12.14, pymsis 0.13.0), engine/src/contracts.ts (AGENTS.md s4), engine/test/fixtures/mock-result.json (hand-made, 6U 500 km SSO, launch 2023-04-15, truth, reenters 2025-11-06, 936 d; NOT engine output, missionCode not decodable). Engine tests 6/6.

## In progress
-

## Next (resume prompt)
- "Read AGENTS.md and HANDOFF.md. Continue Iyad's lane at T0.2 (pipeline fetch/build scripts) per prompts in HANDOFF."

## Blocked / disclosed limits
- contracts.ts adds `stormPolicy?: 'ride-out' | 'safe-mode'` (needed by T1.4 events.ts; not listed in s4) and an i18n `Msg` {key, params, en} for all plain-language text.
- Local Node is v24; CI targets Node 22 LTS.
