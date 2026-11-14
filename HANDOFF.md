# HANDOFF

Updated by the agent at every checkpoint (tests green, committed).

## Done
- U1b: Self-hosted 5 font families as woff2 in web/public/fonts/ with OFL licences (Big Shoulders Display 800, Reem Kufi, IBM Plex Sans, IBM Plex Sans Arabic, IBM Plex Mono), created fonts.css with @font-face and font-display: swap, wired into app with 9 typography hierarchy styles verified.
- U1a: Vite + React 19 + TS strict + Zustand web app initialized, design/tokens.json created from design/README.md, web/scripts/make-tokens.mjs generating tokens.css, swatch test page with paper/night theme toggle running.
- T0.1 (Sat 08:3x) pnpm workspace (engine, web placeholder), uv project in pipeline/ (Py 3.12.14, pymsis 0.13.0), engine/src/contracts.ts (AGENTS.md s4), engine/test/fixtures/mock-result.json (hand-made, 6U 500 km SSO, launch 2023-04-15, truth, reenters 2025-11-06, 936 d; NOT engine output, missionCode not decodable). Engine tests 6/6.

## In progress
-

## Next (resume prompt)
- "Read AGENTS.md, HANDOFF.md, and prompts/B-renad-ui-gemini-flash.md. Continue Renad's lane at STEP U1c (i18n and language toggle)."

## Blocked / disclosed limits
- contracts.ts adds `stormPolicy?: 'ride-out' | 'safe-mode'` (needed by T1.4 events.ts; not listed in s4) and an i18n `Msg` {key, params, en} for all plain-language text.
- Local Node is v24; CI targets Node 22 LTS.
