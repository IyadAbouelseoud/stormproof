# Prompt E: Jeddah flood watch scenario (core + content + frontend + tests)

**Tool:** Claude Code, `/model` = Opus 5.5, with Sonnet `worker` subagents for fixtures, JSON content, i18n strings and boilerplate.
**When to start:** ONLY after tag `v1.0-rc` exists, all tests are green and the Pages URL passed the Saturday playtest. Branch: `git checkout -b feature/jeddah`. Merge to main only when every gate below is green.
**Hard stop:** if the scenario is not playable end to end by **Sun 10:00**, hide it behind a flag (`VITE_JEDDAH=0`), ship Angola only, and write the reason in HANDOFF.md. Nothing in the pitch may depend on it unless it passed a full run.
Paste everything below the line.

---

<context>
You are a senior engineer adding a second scenario, "Jeddah flood watch", to Stormproof (NASA Space Apps 2026, Jeddah local judging). The game is finished and deployed with one scenario (Angola drought). You add content, one additive engine feature (event replay) and the screens that show it. You do not change the physics, the golden tests or the design system.
Read first, in order: AGENTS.md (binding), HANDOFF.md, ISSUES.md, design/README.md, engine/src/contracts.ts, engine/src/catalog.ts, engine/src/score.ts, engine/src/flight.ts, engine/src/orbit.ts, content/sources.csv, web/src (screens, ui, i18n).
I am Iyad (integrator). Never read, print or commit pipeline/.env or any key. No new dependencies (AGENTS.md section 3). No runtime external calls. All fonts self-hosted.
</context>

<what_the_scenario_is>
The player designs a 6U (or 3U) satellite to watch Jeddah's flash floods. The real storm of 24 Nov 2022 is replayed. The lesson: NASA GPM IMERG rain data warns that a flood may come; a satellite only shows what happened afterwards, and the camera type decides whether it can see through storm cloud. The Sun still decides how long the satellite lives, so launch date and altitude still matter: a low orbit that gives sharper pictures may have reentered before the storm.
Honest limits that MUST appear in the UI and README:
1. One small satellite revisits a place every few days. It cannot warn of a flood that lasts hours.
2. The flood was caused by rain, never by the Sun. The Sun affects only satellite lifetime.
3. No 6U radar imager has flown. The radar camera is a game-balanced design study. Real anchors: ICEYE SAR satellites about 85 kg (ESA); NASA JPL RainCube, a 6U Ka-band rain profiler, about 12 kg, 22 W while transmitting, nadir-looking, makes profiles, not pictures.
4. Rain estimates over Saudi Arabia are imperfect. Event facts are reported figures from secondary sources.
5. 2009 and 2011 floods are outside the 2015 to 2026 timeline: background text only, no tolls printed.
</what_the_scenario_is>

<engine_work>
All changes ADDITIVE and logged in ISSUES.md. Golden tests 1 to 3 and every existing test must stay green after each task. Do not tune any physics constant.

E1 Contract (additive, Iyad approves this prompt's changes only):
- `RequirementId` gains `'event-look'`. `Requirement` unchanged.
- `Scenario` (catalog.ts, not frozen) gains optional: `targetLatDeg`, `targetLonDeg`, `lookWindowDays`, `event?: { id: string; date: ISODate; label: Msg-like key; cloudTagsFile: string }`, `requirementSet?: RequirementId[]` (default: the existing five).
- Remove the hard-coded `TARGET_LAT_DEG` in flight.ts: read `scenario.targetLatDeg` and fall back to the current Angola value so Angola results are byte-identical (add a regression test comparing a stored Angola SimResult hash before and after).
- `SimResult` gains optional `eventReplay?: { date: ISODate; alive: boolean; reentryBeforeEvent: boolean; firstUsefulLookDays: number | null; looks: { date: ISODate; camera: 'optical' | 'radar'; usable: boolean; why: Msg }[] }`. Absent for Angola.

E2 Event replay (new file engine/src/event.ts, pure, deterministic from `design.seed`):
- alive on `event.date`? Use the existing truth timeline. If the satellite reentered before the date, `reentryBeforeEvent = true`, no looks, and the requirement fails with a plain reason that names the date it reentered.
- Pass days: mean revisit from `revisitDays(swath, alt, targetLatDeg)` (swath includes the pointing part's off-nadir factor if the catalogue defines one; if `pointing` has no effect today, add `offNadirFactor` to the pointing parts, game-balanced, tagged in sources.csv). Seeded phase offset in [0, revisit). First pass on or after the event date, then every revisit days within `lookWindowDays`.
- Usability per pass: radar always usable (needs enough battery and data margin, reuse existing power and data checks); optical usable only if the daily cloud tag in `content/evidence/jeddah-cloud-2022-11.json` is `clear`, `partly` counts as usable with a "partly cloudy" reason, `cloudy` is not usable ("storm cloud blocks the camera").
- `firstUsefulLookDays` = days from the event date to the first usable pass, or null.
- Requirement `event-look`: met when `firstUsefulLookDays !== null && <= lookWindowDays`. Value in days, sense `max`.
- Score: add the sixth requirement with the same SCORE_PER_REQUIREMENT weight only when the scenario's `requirementSet` includes it; rescale so a perfect score stays 100 (document the weight change; Angola unchanged).
- Cause chain: add one cause "cloud blocked N optical looks" or "radar saw through cloud" with a numeric effect; keep 3 to 5 causes ending in the verdict.
- Unit tests: determinism (same seed, same result); reentered-before-event; optical blind on cloudy days; radar usable; no passes in window gives null; Angola unaffected.

E3 Content (Sonnet worker; all numbers tagged `src` per AGENTS.md rule 1):
- `content/scenarios/jeddah-flood.json`: id `jeddah-flood`, name, targetLatDeg 21.5, targetLonDeg 39.2 (approximate, labelled), event `{ date: "2022-11-24" }`, lookWindowDays and the other targets calibrated so that: a fixed optical design FAILS the event look (cloud days), a radar design PASSES the event look but busts the budget or mass margin, and at least three balanced designs reach a high score. Document the calibration in content/evidence/jeddah-balance.md. Every target is game-balanced unless sourced.
- `content/parts.json`: add camera entry `cam-radar-study` (game-balanced, name "Radar imager (design study)", tagged), nothing else removed. Keep the existing optical cameras.
- `content/evidence/jeddah-cloud-2022-11.json`: schema `{ "_status": "READ BY EYE", "layer": "MODIS_Terra_CorrectedReflectance_TrueColor", "taggedBy": "", "days": [{ "date": "2022-11-23", "tag": "clear|partly|cloudy" }] }` for 2022-11-23 to 2022-11-27. Dua fills the tags from Worldview; until then ship a clearly labelled placeholder with `"_placeholder": true`, and the UI must show "cloud tags not yet verified" while that flag is true.
- `content/i18n/en.json` and `ar.json`: all new strings; keys symmetrical; Arabic reviewed for RTL layout (no hard-coded left/right).
- `content/sources.csv`: rows for every new number and fact. Event rows cite GDACS quoting the National Center of Meteorology (179 mm in 6 h, 24 Nov 2022, 2 deaths reported) as "secondary source". IMERG latencies: Early about 4 h, Late about 12 to 14 h, Final about 3.5 months (NASA GPM FAQ). RainCube and ICEYE as anchors. Target coordinates "approximate".

E4 Pipeline (extend pipeline/fetch_gibs.py, idempotent, key not needed for GIBS):
- Fetch IMERG 30-minute rain (layer `IMERG_Rain_Rate`) frames over Jeddah for 2022-11-24 and 2022-11-25 (about 6 frames spread over the storm; choose by time stamps and log which) and MODIS true colour for 2022-11-23 to 2022-11-27, to `web/public/img/gibs/` as JPEG, plus credits in `credits.json` and rows in sources.csv. If a layer or date is unavailable, record it in ISSUES.md and continue; never fake an image.
- pytest: files exist, sizes bounded, credits present.
</engine_work>

<frontend_work>
Follow design/README.md exactly (tokens, themes Paper/Night, `sol` #FF5A1F reserved for the Sun only, en/ar with RTL, 390x844 and 1440x900). No new colours, no new fonts.
F1 Scenario picker on the Brief screen: two scenario cards (Angola drought, Jeddah flood watch) with a one-line honest summary each; selection stored in the Zustand store and in the mission code (`scenarioId` already exists). The Jeddah card shows a "design study" tag next to radar.
F2 Brief screen for Jeddah: event card (reported figures, source tag "secondary source"), the six requirements including event look, plain-language limits 1 to 3 from <what_the_scenario_is>.
F3 Build screen: camera choice shows optical vs radar trade in plain words (cloud, mass, power, data). The radar part carries "design study, not a real 6U".
F4 Launch/Orbit: show "alive on 24 Nov 2022?" as a live indicator when the chosen launch date and altitude would reenter before the storm, with the reason, before the player simulates.
F5 Flight screen: mark the event date on the altitude timeline (vertical line, label), and show each pass as a tick, usable or blocked.
F6 Report screen: before/after panel (dry HLS baseline already in the repo labelled "dry baseline, 2024", never as the flood), IMERG rain frames with a time scrubber and the plain note "Rain estimate, about 10 km resolution, imperfect over Saudi Arabia", MODIS cloud strip with the per-day tags, the event-look verdict in plain language, the cause chain with the new cloud cause, and the honest limit 1 in one sentence.
F7 Refly screen: "same orbit, other camera" and "launch earlier" one-tap variants so the failure-and-recovery demo is two taps.
F8 Accessibility: axe zero serious/critical at 390x844 and 1440x900, EN and AR, Paper and Night. Reduced-motion respected. All images have alt text; AI art keeps its SI tag.
</frontend_work>

<demo_script_support>
Create `content/demo/jeddah-demo.json` with a scripted mission pair for the 3-minute demo: (1) optical 6U, launched 2021, 500 km: event look FAILS (storm cloud) with a clear reason; (2) same design with the radar study camera, fails the budget margin; (3) a balanced recovery that passes. All three must be reproducible from a mission code; put the three codes in HANDOFF.md.
</demo_script_support>

<tests_and_gates>
Run before every commit: `pnpm -r test`, `uv run pytest` in pipeline/, web build, axe script if present. Gates to merge:
- All previous tests and golden tests 1 to 3 unchanged (3 disclosed known fails in golden 2 stay as they are).
- Angola SimResult hash unchanged.
- New engine tests green (E2 list), content schema test green, i18n key symmetry test green.
- `jeddah-demo.json` codes decode and give the three stated outcomes.
- Playwright smoke: pick Jeddah, build, simulate, open Report, see the event verdict, in EN and AR.
Never loosen a tolerance and never hide a failing check; disclose it in README and HANDOFF.md.
</tests_and_gates>

<limit_protocol>
After each task: tests green, commit "E<n>: ...", one HANDOFF.md line. At about 85% of the usage window or on a usage warning, finish the task, commit "checkpoint: E<n>", write a resume prompt in HANDOFF.md, stop. Order of work: E1, E2, E3, E4, F1, F2, F3, F4, F5, F6, F7, demo file, F8, README lines. Reply format after each task: five lines maximum.
</limit_protocol>

**Update 2026-11-14 (cloud tags are in, no longer placeholder):** `content/evidence/jeddah-cloud-2022-11.json` now holds Dua's read-by-eye tags; set no `_placeholder` flag. Tag values are `clear|partly|cloudy|no-image`. `no-image` (26 Nov) is NOT usable for optical (unknown, conservative) and the UI says 'no image'. Evidence screenshots: `content/evidence/jeddah-cloud-2022-11-DD.jpg`. Contract change `event-look` is APPROVED by Iyad (2026-11-14 11:32); log it in ISSUES.md.

---

# PART 2 (added 2026-11-14 12:40): integration, open issues and Fable-pass readiness

Do this AFTER E1-E4 and F1-F8 above, unless a task says "before". Branch feature/jeddah. Same rules as AGENTS.md. Every contract change is additive, logged in ISSUES.md, and Angola results stay byte-identical. Iyad approved the `event-look` change (11:32) and the three exposures in G2 (to confirm in chat before merge).

## G1. Content text is in (content/text/*.json): wire it in
Files: `content/text/scenarios.json`, `parts.json`, `messages.json`, `ui.json`. Written with ChatGPT and fixed by Claude; validated with `python3 qa/validate_content.py <file>` (must print ERRORS: none; the warning about "11" in the solar-cycle glossary line is intended). Every text field is `{en, ar}`; placeholders are `{name}` and identical in both languages.
- Replace every English-only part, rocket, scenario and screen string in web/ with these. Keep the adapter pure: `t(field)` returns the active language; unknown ids fall back to English and log once in dev.
- Part ids to match in content/parts.json (the engine catalog must use these ids exactly): camera-budget, camera-standard, camera-sharp, camera-radar (Jeddah only), panels-small/medium/large, battery-small/medium/large, radio-slow/standard/fast, computer-basic/standard/large, pointing-basic/standard/precise, fuel-small, fuel-large. Rockets: electron, spacex-rideshare. If the catalog uses other ids, add a mapping in the adapter, never rename text ids.
- Numbers stay game-balanced or sourced in the catalog; the text files contain no part numbers by design. Do not add any.
- Test: a vitest that loads all four files, checks both languages exist for every id used by the catalog and the UI, and that every `{placeholder}` in a message has a param supplied by the engine (see G2).
- README, AI-use section: add "Interface and story text drafted with ChatGPT and edited with Claude; all facts come from content/sources.csv and AGENTS.md; numbers come from the engine." Required by the AI-disclosure rule.

## G2. Close Renad's open contract requests (additive, log in ISSUES.md)
Renad's adapter works around these and labels each on screen. Replace the workarounds with real fields, then remove the on-screen labels:
1. **Message params.** Today some engine messages stay English in Arabic mode because their numbers are not passed separately. Make every plain-language `Msg` carry `{key, params, en}` with `key` from `content/text/messages.json` and `params` exactly the placeholder names listed there: cause.sun_days{days}, cause.density{factor}, cause.slip{months}, cause.storm{km}, cause.propulsion{days}, cause.verdict{verdict}, fit.mass_over{over_kg,max_kg}, fit.power_short{short_w}, fit.volume_over{over_u}, fit.rocket_capacity{mass_kg,cap_kg}, fit.orbit_unsupported{rocket,altitude_km}, fit.before_first_flight{rocket,date}, fit.budget_over{over_usd}, outcome.reentered{date,days}, outcome.alive{years}, outcome.alive_forecast_end{years}, outcome.reentered_before_event{date}, disposal.fcc_pass/fail{years}, disposal.nasa_pass/fail{years}, event.look_met/missed{days}, event.optical_cloud{date}, storm.vote_prompt/safe_mode/ride_out{}. Pass plain numbers and ISO dates; the UI formats currency and dates per language. `cause.verdict`'s `{verdict}` is a short noun phrase supplied by the engine in both languages (add it to the Msg as `params.verdict` plus an Arabic variant via the content file, not hard-coded in the engine). The English `en` field stays as the fallback and for tests.
2. **Altitude thresholds.** Export read-only constants (reentry 120 km, hourly stepping below 250 km, plus the lowest and highest altitude the density table covers: 150 and 800 km) for the Orbit screen, with `src` in constants.ts. No new physics.
3. **Ground track.** Expose the existing 30-second ground track from orbit.ts as an optional `SimResult.groundTrack` (array of [lat,lon] for one day, decimated to at most 720 points). Deterministic, no change to existing fields.
4. **Map coastline.** Add one simplified, public-domain coastline file under web/public/data (Natural Earth style, simplified to under 150 kB, GeoJSON or TopoJSON). Pipeline script builds it from a source file the person supplies; if no source file is available offline, ship a clearly labelled coarse hand-simplified outline instead and log it in ISSUES.md. Add the source and licence to sources.csv (verify the licence yourself; do not assume). No runtime network call (rule 6).
5. **Story text** is G1.
6. **Arabic gaps** (part, rocket and scenario names English-only) are closed by G1.

## G3. SpaceX price (evidence in content/evidence/spacex-rideshare-2026-11-14*.jpg)
The SpaceX estimator showed a flat $0.35 million for SSO, no earlier than March 2027, at 6, 12 and 50 kg (a minimum charge). Source id `spacex-rideshare-min-price` in sources.csv. Do not state a price per kg; none was shown.
- Add optional `Rocket.minPriceUsd` (additive). For `spacex-rideshare`: price = 350000 USD flat for any CubeSat up to 12 kg; mark it "estimate, not a quote" in the UI and report; label the catalog entry `src: spacex-rideshare-min-price`.
- Do not touch Electron's price unless its `src` is missing: if it is "game-balanced" or unsourced, say so on screen.
- Test: 6 kg and 12 kg give the same launch cost; golden tests unchanged.

## G4. Jeddah weather evidence
Cloud tags are final for now (read by eye from NASA Worldview, MODIS Terra true colour): 23 Nov partly, 24 Nov cloudy, 25 Nov clear, 26 Nov no-image, 27 Nov clear. See `content/evidence/jeddah-cloud-2022-11.json` and the five screenshots. Rules: `no-image` is not usable for optical (conservative); the UI says "cloud at the Terra overpass" and shows the screenshot of the event day on the Report screen as real NASA imagery with credit "NASA Worldview, MODIS Terra" (these are Dua's screenshots, not generated). Do not show the Dry-baseline HLS image as the flood. Re-check the calibration target (optical design fails the event look on cloud days, radar passes but busts budget or mass margin, at least three balanced designs score high) and rebalance game numbers only, never the sourced ones.
- IMERG layer id `IMERG_Rain_Rate` is untested against live GIBS: if the fetch fails, log it in ISSUES.md and show no rain image. Never fake one.

## G5. Gemini art (AI-generated, illustration only)
Files: web/public/img/art/*.webp (untagged; the app overlays `.sp-si-tag`), tagged copies in content/pitch-art/*-si.webp. Placement: P1 title/Brief hero, P2 Angola scenario card, P3 ground-station panel, P5 Build screen exploded view, P6 pitch/Report backdrop, P7 Jeddah scenario card ONLY (stretch, and only while VITE_JEDDAH is on). Every use shows the visible "SI-generated" tag and the note from web/public/img/art/README.md ("illustration, not real imagery"). Add bilingual alt text (en and ar, one plain sentence each, describing the picture, never claiming it is real) to a new `content/text/art-alt.json`. No NASA logos, no people.

## G6. Housekeeping before the Fable pass
- AGENTS.md golden-2 line: replace "launch years 2021-2025" with "launch years 2021-2044 (the deck spans 2021-2044; 2027+ are the fair pass/fail points)". README golden-2 line: "33 of 36 checkable points within +/-30%" only after the final run; the 3 known fails stay disclosed.
- GitHub Settings > Pages > Source must be "GitHub Actions" (Iyad does this; the build agent only checks the Pages run is green).
- Add `python3 qa/validate_content.py` for the four content files to the Pages workflow test step (fail the build on errors).
- HANDOFF.md: add the Part 2 status line per task.

## G7. Read-me list for the Fable final pass (Sat ~21:00, once)
The reviewer should open: AGENTS.md section 8 checklist; the four content files and qa/validate_content.py; sources.csv (every number sourced, computed or "game-balanced"); content/evidence/ (SpaceX x3, Jeddah cloud x5 + JSON); the Jeddah demo script; the cause-chain wording against the engine's real params; the Arabic copy (native-speaker read still pending: flag, do not silently rewrite); axe results at 390x844 and 1440x900, EN and AR, Paper and Night; offline run (no Wi-Fi). Known open items to confirm, not hide: golden-2 three fails; Jeddah event figures are secondary sources; no 6U radar imager has flown; SpaceX figure is an estimate; cloud tags are one morning pass; IMERG layer id untested.
