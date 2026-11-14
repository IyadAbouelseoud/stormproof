# STORMPROOF

**NASA Space Apps Challenge 2026, Jeddah. Challenge: Space Mission Design Game.**

*The Sun you launch into decides how long your satellite lives. Plan with the forecast, fly with the truth.*

## Summary
Stormproof is a satellite-design game where the real Sun decides how long your satellite lives. Your team designs a 1U, 3U or 6U CubeSat to map drought in Angola's Cunene and Namibe provinces: you pick the camera, panels, battery, radio, computer, pointing and fuel, the orbit, the rocket and a launch date between 2015 and 2026. The game then flies it twice: once through the Sun the 2019 forecast promised (plan) and once through the Sun that really happened, from NASA OMNIWeb data and NASA DONKI storms (truth). Atmospheric drag comes from pre-computed NRLMSIS 2.1 density tables driven by NASA OMNIWeb solar and geomagnetic indices, so a stronger Sun means thicker air and an earlier reentry. FACSAT-2 was planned for the forecast Sun, met the real one, and fell about 2.5 years early; the report shows how many days the Sun took from your mission, step by step, and whether you met the FCC 5-year and NASA 25-year disposal rules.

## How to run
Requirements: Node 22 LTS, pnpm 10, and (only to rebuild the data) Python 3.12 with uv.

```sh
pnpm install
pnpm test                      # engine: unit, determinism, mission-code and golden tests
pnpm --filter @stormproof/web dev    # the game (web/), http://localhost:3000
pnpm --filter @stormproof/web build  # static site in web/dist (relative paths, works offline)
```

The app makes no network calls at runtime: all data ships as static files in `web/public/data`.
Rebuilding the data (optional, needs internet; a NASA API key in `pipeline/.env` for DONKI only):

```sh
cd pipeline
uv run pytest -q                          # checks the committed data files
uv run --env-file .env python build_all.py   # fetch + rebuild everything (idempotent)
```

Deploy: every push to `main` runs `.github/workflows/pages.yml` (engine and pipeline tests, web build) and publishes `web/dist` to GitHub Pages. One-time setup: repo Settings > Pages > Source: **GitHub Actions**.

## NASA data used
- **NASA GSFC SPDF OMNIWeb** (OMNI2 low-res): daily F10.7 solar flux and Ap index, 2015 to 29 Oct 2026. NASA OMNIWeb data drives the NRLMSIS model.
- **NASA solar-cycle prediction** (MSFC, Oct 2026 release): monthly sunspot number and Ap to Oct 2041, used after OMNI ends; sunspot number converted to F10.7 with a least-squares fit on 2015-2026 OMNI data.
- **NASA CCMC DONKI** geomagnetic storms (GST), 2015-2026: storm flags and storm alerts.
- **NASA GIBS / Worldview** imagery (MODIS, HLS L30/S30) of the Cunene/Namibe area; credits in `web/public/img/gibs/credits.json`.
- **NASA Launch Services Program** CubeSat area-to-mass medians (1U 0.014, 3U 0.010, 6U 0.007 m2/kg), **JPL** Concept Maturity Level design margins (35%), **NASA-STD-8719.14C** (25-year disposal), Goddard MDL and **NASA CubeSat 101** for design context.

Every number in the game is sourced, computed or labelled "game-balanced" in `content/sources.csv`.

## Team
- **Iyad**: team owner; engine, data pipeline, deploy
- **Renad**: user interface (web/)
- **Dua**: content, art and pitch

## AI use
We used AI (SI) tools for research, brainstorming and coding: Claude Code (Anthropic) wrote most of the engine, pipeline and tests under our review, Antigravity built parts of the UI, and Gemini helped with content and art. AI-generated images carry a visible "SI-generated" tag. Every physics number was checked against its source, and the golden tests below compare the engine with real missions.

## Licences
- **NRLMSIS 2.1** (U.S. Naval Research Laboratory, run via pymsis) is licensed for non-commercial use only. We ship only pre-computed density tables, never the model.
- NRLMSIS is NRL, not NASA. NASA data is credited wherever it is used. No NASA logos or insignia are used.
- Fonts are OFL and self-hosted.

## Validation (golden tests, `engine/test/golden.test.ts`)
1. **FACSAT-2** (6U, 497 km SSO, launched 15 Apr 2023): truth-mode reentry 26 Oct 2025 vs real 27 Oct 2025 (tolerance +/-60 days); 450 / 400 / 300 km waypoints within +/-30 km. Plan/truth lifetime ratio 1.44 (paper: 1.52).
2. **NASA DAS 6U curves** at 430 and 550 km, 51.6 deg (NASA LSP, "Variation in Predicted Orbital Lifetime Due to Launch Year", NTRS 20240003618; values read from the charts by eye): **18 of 21 checkable points within +/-30%, 3 fail** (see Limits). No parameter was fitted. All three shape checks pass: the 430 km life peaks near 2029 and is lowest in 2035; the 550 km life rises from 2033 to 2034; 550 km always outlives 430 km.
3. **Starlink trap** (210 km, 3 Feb 2022): reenters in 1.3 days on the real Sun vs 2.8 days on the forecast; at 500 km the same storm costs 0.066% of life (under 1%).

## Disclosed limits
- **One drag fit (golden 1):** the FACSAT-2 ballistic coefficient was fitted once from 72.3 to 68.43 kg/m2 (-5.3%, inside the allowed +/-20%). Unfitted, the satellite reentered 26 Dec 2025 (60 days late) and missed the 2 Oct 2025 waypoint (350 vs 300 km).
- **Storm under-response:** empirical atmosphere models under-respond to geomagnetic storms. Only the Feb 2022 storm is corrected (density x1.875 on 3-5 Feb 2022, Fang et al. 2022).
- **Golden test 2 (NASA DAS) fails at 3 points**, kept as marked known failures in `engine/test/golden.test.ts` (tolerance not loosened): 430 km launched 2039, 2.57 vs 3.87 years (ratio 0.67); 550 km launched 2033, 4.76 vs 6.85 years (0.69); 550 km launched 2034, 5.25 vs 9.58 years (0.55). Our 550 km lives run 12-31% short of DAS for every launch year 2027-2032 as well, and our 2033-to-2034 rise is much smaller (+10% vs +40%). Likely reasons, none tested: DAS used a Sept 2023 solar-flux prediction, while we use NASA's Oct 2026 prediction and NRLMSIS 2.1; the deck does not say on which day of the launch year it starts (we use 1 Jan) or whether the orbit is circular; the reference values are read off chart images (about +/-0.1 to 0.15 years).
- **Golden test 2 coverage:** our tables end in Oct 2041, so 10 later points only give a lower bound ("still in orbit"; each is checked to be no more than 30% above DAS), and 6 points launch after the tables end and are not checked. Launch years 2021-2026 are reported but not judged (DAS used a 2023 prediction, we fly the real Sun).
- **Forecast after 29 Oct 2026:** the Sun after that date is NASA's prediction (monthly), shaded "forecast" in the game. Satellites still in orbit in Oct 2041 are reported as ">= N years".
- **Plan mode Sun:** a reconstruction of the 2019 panel forecast (peak sunspot number 115 in Jul 2025); before Dec 2019 it uses real OMNI data; cycle 26 in plan mode repeats the cycle-25 shape (game-balanced).
- **Orbit averaging:** densities are averaged over 12 points per orbit (SSO: 2 UT times; 51.6 deg: 4 node local times). The Funda ground station position is approximate.
- **Game balance:** part masses, costs, launch slips (0-12 months), storm reset chance and score weights are game-balanced and labelled as such.
