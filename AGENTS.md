# STORMPROOF: agent rules

NASA Space Apps Challenge 2026, Jeddah. Challenge: Space Mission Design Game.
Pitch: "The Sun you launch into decides how long your satellite lives. FACSAT-2 was designed for five years, flew into a stronger Sun than forecast, and lasted 926 days. Plan with the forecast, fly with the truth."

Read this file fully before any task. Update HANDOFF.md at every checkpoint.

## 1. Hard rules
1. Honesty: every number is sourced (cite in content/sources.csv), computed, or labelled "game-balanced". Never invent data. Disclose failing checks; never hide or loosen golden tests.
2. AI (SI) disclosure: AI-generated images carry a visible "SI-generated" tag. SI code and data are acknowledged in README.
   - Untagged art is in web/public/img/art (the app overlays `.sp-si-tag`); tagged copies for slides/video are in content/pitch-art/*-si.webp.
   - The art is illustration only: never present it as real places, data or satellite imagery. Real imagery comes from the GIBS slot on the Report screen. See web/public/img/art/README.md.
3. No people in images, no likeness of anyone under 18.
4. Credit NASA data everywhere it is used. No NASA logos, flags or insignia. Never modify or place the Space Apps logo.
5. NRLMSIS 2.x is non-commercial: ship only pre-computed tables, state it in README.
6. Offline-first: no runtime external calls, no live APIs, self-hosted fonts. The demo must work with no Wi-Fi.
7. Cut list (do not build): 3D globe (2D map instead), phone sync, accounts, AI chatbot, live API calls. Jeddah floods scenario only after tag v1.0-rc.
8. Secrets only in `pipeline/.env` (git-ignored, denied to agents). Never print, log or commit the NASA key. If it ever leaks: stop, revoke at api.nasa.gov, do not rewrite history.
9. Never edit shared contracts (section 4) unless the task says so. If a contract must change, stop and record it in ISSUES.md.

## 2. Lanes and ownership
| Lane | Owner | Tools | Branch |
|---|---|---|---|
| Engine, data pipeline, deploy | Iyad (Team Owner, integrator) | Claude Code Opus 5.5 + Sonnet `worker` subagents | lane/iyad |
| UI (web/) | Renad | Antigravity Hydrogen 4 (fallback Claude Code Opus 5.5, tell Iyad first) | lane/renad |
| Content, art, pitch | Dua | Gemini (Nano Banana Pro/2) | lane/dua |
| Final release pass | Iyad | Claude Code Fable 5.2, Sat about 21:00, only once | main |

Iyad merges to main at least hourly; main auto-deploys to GitHub Pages (Netlify drag-and-drop as backup).

## 3. Stack
- Pipeline: Python 3.12, uv, pymsis, numpy, requests, pytest (`pipeline/`).
- Engine: TypeScript strict, pure functions, Vitest (`engine/`).
- Web: Vite, React 19, TypeScript, Zustand, plain CSS from tokens, SVG/Canvas. No UI kit, no Tailwind. Own i18n (en/ar) with CSS logical properties; RTL support.
- pnpm workspace, Node 22 LTS.
- Pre-approved dependencies only: react, react-dom, zustand, vite, @vitejs/plugin-react, typescript, vitest, @playwright/test, pymsis, numpy, requests, pytest. Ask before adding any other (the final pass may add @axe-core/playwright).
- Fonts (OFL, self-hosted woff2): Big Shoulders Display 800, IBM Plex Sans, IBM Plex Sans Arabic (also Arabic display, weight 700), IBM Plex Mono. Reem Kufi dropped 2026-11-14 (Iyad: hard to read).

File layout:
```
AGENTS.md CLAUDE.md HANDOFF.md ISSUES.md README.md
pipeline/            fetch + build scripts, .env.example, raw/ (ignored)
engine/src engine/test (fixtures: golden.json, mock-result.json)
web/src/{screens/{Brief,Build,Orbit,Launch,Flight,Report,Refly},ui,styles}
web/public/{data,img/gibs,img/art,fonts}
content/             parts.json, rockets.json, scenarios/angola.json, i18n/, sources.csv, evidence/
design/              brief + generated tokens
qa/  prompts/  .github/workflows/
```
Data files (built by pipeline): sun_daily.json, sun_forecast.json, sun_plan2019.json, density_{sso,iss}_{truth,plan}.bin, density_meta.json, storms.json, GIBS JPEGs + credits.json.

## 4. Shared contracts (plain-language spec; implement in engine/src/contracts)
Agree these first; `engine/test/fixtures/mock-result.json` is committed in the first 30 minutes of Day 1 so the UI can start on mock data.

MissionDesign (input): scenario id; part choices (camera, panels, battery, radio, computer, pointing, fuel); form factor (1U/3U/6U); orbit (type SSO or 51.6 deg, altitude km); rocket id; launch date (2015-2026 real-Sun timeline); mode (plan = 2019 forecast Sun, truth = real Sun); seed; role assignments for team mode.

SimResult (output): the six gauges (mass, power, budget, data, comms, time) with limits and margins; fit-check verdicts with plain explanations for each rejection; daily timeline (altitude, density, battery state, data volume, storm flags); outcome (alive, reentered on date, or alive at end of forecast as ">= N years"); lifetime days; plan-vs-truth lifetime; disposal verdict (FCC 5 y, NASA 25 y); score; cause chain (ordered list of causes, each with a numeric effect); closest-design hint; missionCode.

Engine API: `simulate(design) -> SimResult`, `encodeMission(design) -> string`, `decodeMission(string) -> design`. Deterministic: same design and seed give an identical result.

## 5. Physics and data
- Decay: da/dt = -(Cd*A/m) * rho * sqrt(mu*a), Cd = 2.2. Daily steps, hourly below 250 km, reentry at 120 km.
- Area-to-mass medians (NASA LSP): 1U 0.014, 3U 0.010, 6U 0.007 m2/kg.
- Density: pre-computed NRLMSIS 2.1 (pymsis), orbit-averaged per day x altitude 150-800 km in 10 km steps, log10 Float32; SSO (10:30/22:30) and 51.6 deg tables.
- NASA OMNI daily F10.7 is adjusted to 1 AU. NRLMSIS expects observed flux: observed = adjusted * (1 AU / r)^2 (about +3.4% on 4 Jan, -3.3% on 4 Jul; unit-test this) plus the 81-day average of observed.
- OMNI ends 29 Oct 2026. Beyond that use NASA's Oct 2026 prediction file (SSN and Ap, monthly to Oct 2041, no F10.7); convert SSN to F10.7 with a least-squares fit on 2015-2026 OMNI. Flights alive in Oct 2041 end as ">= N years" plus a debris check. Shade these days "forecast" in the UI.
- Plan mode = reconstructed 2019 panel forecast (peak SSN 115, Jul 2025). Truth mode = real OMNI.
- Storm truth correction only for Feb 2022 (Fang et al. 2022): factor 1.875 on 3-5 Feb 2022. Empirical models under-respond to storms; disclose.
- Rules: CML margins 35% on mass, power, energy; FCC disposal <= 5 y; NASA <= 25 y (NASA-STD-8719.14C, FCC 22-74).
- Constants: solar constant 1,361 W/m2; cell efficiency about 30%; GSD(h) = GSD(500 km) * h / 500; Funda ground station about 8.9 S, 13.2 E (approximate, label it); Electron 200 kg to 500 km SSO.
- Golden tests (never loosen):
  1. FACSAT-2 (6U, 497 km SSO, ballistic coefficient 72.3 kg/m2 +/-20%, launched 15 Apr 2023): reentry within +/-60 days of 27 Oct 2025; about 450 km near 29 Aug 2024, 400 km near 3 Mar 2025, 300 km near 2 Oct 2025, each +/-30 km. One Cd*A/m fit allowed, then disclose. Dry run: forecast/real ratio 1.58 vs paper 1.52; absolute life 13% long before the fit.
  2. NASA DAS 6U curves at 430 and 550 km, launch years 2021-2044 (the deck spans 2021-2044; 2027+ are the fair pass/fail points), within +/-30%.
  3. Starlink trap: a circular 210 km orbit on 3 Feb 2022 reenters within days in truth mode, sooner than plan mode; at 500 km the storm costs under 1% of life.
- 2-hour rule: if the density table is not built by 10:00 Sat, ship analytic max/min curves labelled game-balanced.
- NASA data used: OMNIWeb (drives NRLMSIS), DONKI storms, GIBS/Worldview images (30 m floor), NASA solar-cycle prediction, NASA LSP deck, JPL CML, Goddard MDL, CubeSat 101. NRLMSIS itself is NRL, not NASA; say "NASA OMNIWeb data drives the NRLMSIS model".

## 6. Limit protocol
After each task: tests green, commit, add a HANDOFF line. At about 85% of the usage window or on a usage warning: finish the current task, commit "checkpoint: <task>", write HANDOFF.md with a resume prompt, stop. If the Claude pool is empty, continue in Antigravity from HANDOFF.md.

## 7. HANDOFF format
Done / In progress / Next (resume prompt) / Blocked and disclosed limits. See HANDOFF.md.

## 8. Release checklist
- [x] All golden tests pass or limits disclosed in README (golden 1 and 3 pass; golden 2 is 18 of 21 with 3 known fails in README "Disclosed limits"; qa/TRACK1.md)
- [x] README fields: project name, challenge, one-paragraph summary, how to run, NASA datasets used, team members, AI use, NRLMSIS licence note (all present; qa/TRACK3.md s7)
- [x] content/sources.csv complete; every number sourced, computed or "game-balanced" (85 rows, unique ids, all 21 part sources resolve; open hygiene items: GIBS pictures are credited in credits.json, not the csv; two `src` fields are sentences; qa/FUNCTIONAL.md)
- [x] No keys in repo or git history; no runtime external calls; fonts self-hosted (qa/TRACK3.md s4-s5; smoke walk: no external requests)
- [x] SI tags on AI images; no NASA logos; credits.json for GIBS (27 art files viewed, no NASA marks, no people; qa/TRACK3.md s3)
- [x] axe: zero serious/critical at 390x844 and 1440x900, EN and AR, Paper and Night (16 combinations, both scenarios; qa/TRACK2.md s2)
- [x] Deployed URL opens in a private window with no login (fresh browser context, HTTP 200, serves the v1.0-rc2 build index-Cz58yarf.js, demo gate passes on the live URL; repo page also public)
- [x] Tag v1.0-rc, then v1.0 by Sun 12:30; code freeze Sun 13:00 (v1.0 tagged on 66884d5 after prompt H, deployed and checked on the live URL; v1.0-rc2 stays on 9b425f3, v1.0-rc on 68bfb27)
