# Prompt A: Iyad's lane (engine, data pipeline, deploy)

**Tool:** Claude Code, `/model` = Opus 5.5. Use the `worker` subagent (Sonnet) for bounded mechanical tasks (fixtures, test scaffolding, boilerplate, README fields).
Start: `git pull`, `git checkout -b lane/iyad` (merge to main at least hourly). Paste everything below the line.

---

<context>
You are a senior simulation engineer building the engine and data pipeline for Stormproof, our NASA Space Apps 2026 entry (a satellite-design game where the real Sun decides how long the satellite lives).
Read first, in order: AGENTS.md (binding: rules, contracts spec, physics, golden tests, limit protocol), design/README.md (skim), HANDOFF.md, ISSUES.md.
I am Iyad (integrator). I own engine/, pipeline/, content/ data files and deploy. Renad builds web/ in parallel against your mock result, so the contracts and `mock-result.json` are the first deliverable and block her.
The NASA API key is in pipeline/.env. NEVER read, print, log or commit it. Only `pipeline/fetch_donki.py` uses it, run as `uv run --env-file .env python fetch_donki.py`; read it with os.environ, log only HTTP status and X-RateLimit-Remaining.
</context>

<task>
Work in this order. After each task: tests green, commit on lane/iyad, add one line to HANDOFF.md.

PHASE 0 (target: T0.1 pushed within 30 minutes)
T0.1 Workspace and contracts. Set up the pnpm workspace (engine/, web/ left to Renad; do not scaffold web/). Implement the shared contracts from AGENTS.md section 4 in `engine/src/contracts.ts` (TypeScript strict, types only plus the three function signatures). Write `engine/test/fixtures/mock-result.json`: one realistic, internally consistent SimResult for a 6U at 497 km SSO launched 15 Apr 2023 (FACSAT-2-like; lifetime 926 days in truth, about 1,390 in plan), with a daily timeline sampled weekly, six gauges, cause chain, verdicts, a storm flag. Every number in the fixture must be marked as a placeholder via a `"_mock": true` top-level field. Write `.gitignore` check: `git check-ignore pipeline/.env` must print the path. Commit and push to main (not just the lane branch) so Renad can start; then tell me "contracts pushed".
T0.2 Pipeline scripts in pipeline/ (Python 3.12, uv, pytest): 
  - fetch_omni.py: download NASA SPDF OMNI2 low-res daily data (read the 00readme.txt first for column positions and fill values) into pipeline/raw/ (git-ignored).
  - build_sun.py: build web/public/data/sun_daily.json (date, F10.7 adjusted, F10.7 observed = adjusted x (1 AU / r)^2, 81-day observed mean, ap) for 2015-2026, and sun_forecast.json from NASA's Oct 2026 prediction file (SSN/Ap 50%, monthly to 2041; convert SSN to F10.7 with a least-squares fit on 2015-2026 OMNI data), and sun_plan2019.json (reconstructed 2019 panel forecast: peak SSN 115 in Jul 2025).
  - fetch_donki.py (key via env, about 12 calls) -> storms.json (geomagnetic storms 2015-2026).
  - build_density.py: orbit-averaged NRLMSIS 2.1 density with pymsis, per day x altitude 150-800 km in 10 km steps, for SSO (10:30/22:30 local time) and 51.6 deg (latitude x local-time grid), truth and plan variants, stored as log10 Float32 .bin plus density_meta.json. Pass f107s, f107as and aps arrays directly to pymsis.calculate.
  Tests (pytest): the 1 AU correction (4 Jan about x1.034, 4 Jul about x0.967), fill values handled, shapes and ranges of the outputs, monotonic density vs altitude.
  2-HOUR RULE: if build_density.py is not producing tables by 10:00, stop and ship analytic max/min curves labelled game-balanced instead; tell me.

PHASE 1 (engine, TypeScript strict, pure functions, Vitest)
T1.1 Orbit, power, comms, launch modules: orbital period, eclipse fraction, solar power vs panel area and 30% cell efficiency (1,361 W/m2), battery through eclipse, downlink volume per pass for Funda (about 8.9 S, 13.2 E, labelled approximate), launch fit check (mass and orbit vs rocket; Electron 200 kg to 500 km SSO; ISS deploy about 420 km at 51.6 deg) with plain-language rejection reasons. Unit tests on each equation.
T1.2 Drag/decay: da/dt = -(Cd*A/m)*rho*sqrt(mu*a), Cd 2.2, daily steps, hourly below 250 km, reentry at 120 km, density read from the .bin tables, area-to-mass medians 1U 0.014, 3U 0.010, 6U 0.007 m2/kg. Golden tests per AGENTS.md section 5: (1) FACSAT-2, (2) NASA DAS 6U curves at 430 and 550 km, (3) Starlink trap. One Cd*A/m fit is allowed for golden 1 (inside +/-20% of 72.3 kg/m2); disclose it in README. Never loosen tolerances.
T1.3 Rules, events, score, causes: CML margins (35% on mass, power, energy), FCC 5-year and NASA 25-year disposal checks, launch-slip random event (seeded), 1U/3U/6U density choice, score, cause chain (each cause with a numeric effect, e.g. "the Sun took N days"), closest-design hint.
T1.4 simulate(), encodeMission(), decodeMission(): deterministic; same design + seed gives an identical result (hash test); mission-code round-trip for 100 random designs; flights alive past Oct 2041 end as ">= N years".
T1.5 Swap the contract-compatible real `simulate()` in behind the same shape as mock-result.json, and tell me when Renad can switch her adapter.
T1.6 Deploy: GitHub Actions workflow in .github/workflows/ that builds web/ with pnpm and publishes to GitHub Pages on push to main; relative asset paths; tell me what to switch on in repo Settings.
T1.7 README with the fields the Saudi guide requires: project name, challenge, one-paragraph summary, how to run, NASA datasets used, team members (Iyad, Renad, Dua), AI-use note, NRLMSIS non-commercial note, disclosed limits (empirical-model storm under-response; the Cd*A/m fit).
</task>

<constraints>
- Do not touch web/ (Renad's lane) or web/public/img.
- Only the pre-approved dependencies in AGENTS.md section 3. Ask before adding any other.
- Every number is sourced, computed or "game-balanced"; add each to content/sources.csv (columns: id, value, unit, tag, source, note).
- Never invent data. If NASA hosts are slow, retry with backoff; if a file format differs from what is described, report it, do not guess.
- No runtime external calls in the shipped app: Python runs offline only; the web app reads static files.
- No destructive commands (rm -rf, git push --force, git reset --hard); ask first. Never read .env files.
- Limit protocol (AGENTS.md section 6): checkpoint after each task; at about 85% of the window or on a usage warning, finish the current task, commit "checkpoint: <task>", write the HANDOFF.md resume prompt, stop.
</constraints>

<done_when>
Contracts and mock result are on main; pipeline tests pass and data files exist in web/public/data; engine tests pass including the three golden tests (or limits disclosed); determinism and round-trip tests pass; the Pages workflow is in place; README is complete.
</done_when>

<output_format>
After each task: `OK <task id>: <what changed> | tests: <passed/total> | commit <short sha>`. Anything unfinished or uncertain goes under `NOT DONE:` or `UNSURE:`; never claim a check you did not run.
</output_format>
