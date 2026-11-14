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
