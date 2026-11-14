# ISSUES

## 2026-11-14 Content schema needed by the engine (for Dua, content lane)
The engine reads `content/parts.json`, `content/rockets.json`, `content/scenarios/angola.json` with the types in `engine/src/catalog.ts` (`Part`, `Rocket`, `Scenario`).
Until those files land, engine tests use `engine/test/fixtures/content-stub.json` (all values game-balanced except Electron 200 kg from AGENTS.md s5).
Every entry needs `src` = a `content/sources.csv` id, or "game-balanced". Part ids in the stub match `mock-result.json`.
Open: the per-form-factor bus (structure + EPS + harness) mass/cost in `catalog.ts` `BUS` is game-balanced; replace with sourced values if available.

## 2026-11-14 Engine wiring for web/ (for Renad)
The real engine is ready behind the frozen SimResult shape (`engine/src/index.ts`):
```ts
import { createEngine, engineDataFrom } from '@stormproof/engine';
const engine = createEngine(engineDataFrom({ meta, bins: { sso_truth, sso_plan, iss_truth, iss_plan }, storms, content }));
const result = engine.simulate(design); // also engine.encodeMission / engine.decodeMission
```
`meta` = data/density_meta.json, `bins` = ArrayBuffers of data/density_*.bin, `storms` = data/storms.json, `content` = { parts, rockets, scenarios } (until content/ lands, engine/test/fixtures/content-stub.json).
Behaviour notes (no contract change):
- truth mode applies a seeded launch slip (0-12 months): `timeline[0].date` is the ACTUAL launch date and may be later than `design.launchDate`; the slip is the cause with id `launch-slip` (months). The mock's `timeline[0].date === design.launchDate` holds only in plan mode.
- `missionCode` is `SP1-...` and round-trips through `decodeMission`.
- Timeline rows are daily for the whole flight (up to about 9,800 rows when alive to 2041); sample for charts in the UI.

## 2026-11-14 Prompt E1/E2 contract change (APPROVED by Iyad 2026-11-14 11:32)
Additive only; Angola results byte-identical (engine/test/angola-regression.test.ts, stored hashes in fixtures/angola-hashes.json).
- `RequirementId` gains `'event-look'` (value = days to the first useful look, -1 when none; sense max; met never true at -1).
- `SimResult.eventReplay?` (`EventReplay`, `EventLook` in contracts.ts): adds `reentryDate` and `revisitDays` beyond the prompt's list (both needed by the UI). Absent for Angola.
- catalog.ts (not frozen): `Scenario.targetLatDeg/targetLonDeg/lookWindowDays/event/requirementSet/textId`, `Part.cameraType/offNadirFactor/scenarios`, `Rocket.minPriceUsd` (G3), `Content.cloudTags`.
- flight.ts reads `scenario.targetLatDeg` (fallback TARGET_LAT_DEG = Angola). Revisit requirement now multiplies the swath by the pointing part's `offNadirFactor` (default 1; the stub has none, so Angola unchanged).
- Score weight: with N requirements each is worth 80/N (Angola N=5: 16, unchanged; Jeddah N=6: 13.33).
- Cause chain: new cause id `cloud` (optical: looks blocked; radar: looks through cloud). Trimming order to keep <= 5: propulsion, storm, launch-slip.
- Radar event revisit is halved (it also images on night crossings). game-balanced, in sources.csv cam-radar-study.

## 2026-11-14 Prompt E4: IMERG layer id
`IMERG_Rain_Rate` (named in prompt E) is NOT in the GIBS WMS capabilities. pipeline/fetch_gibs.py --jeddah falls back to `IMERG_Precipitation_Rate_30min` (30-minute IMERG, about 10 km) and records the layer actually used in credits.json. Frames: 24 Nov 2022 03/05/07/09/12 UTC and 25 Nov 03 UTC (chosen around the reported 6-hour storm on the morning of 24 Nov, local time UTC+3). Black = no rain (JPEG, no transparency). MODIS Terra true colour 23-27 Nov 2022 also fetched (26 Nov shows the swath gap, matching the "no-image" tag). Nothing faked.

## 2026-11-14 Prompt E Part 2 (G1-G5) status, additive only
- G1: web reads content/text/*.json through web/src/content.ts (pure; English fallback; dev warning once). Engine catalog = content/parts.json + rockets.json + scenarios/*.json with the text ids (no mapping needed except scenario 'jeddah-flood' -> text 'jeddah'). Engine tests keep the stub for the golden/Angola regression tests and use the real catalog for Jeddah tests.
- G2.1 message params: NOT moved into the engine. Changing engine Msg keys/params would change every Angola SimResult (Msg objects are part of it) and break the byte-identical rule. Kept engine keys; Arabic comes from web/src/i18n/engine-ar.json (all engine keys incl. the new event/cloud keys have Arabic templates using only engine params; tested in web/test/content.test.ts). content/text/messages.json advice texts are available via content.ts messageTemplate() but not yet shown. Decision for Iyad: accept, or schedule a v2 Msg migration that re-baselines the Angola hashes.
- G2.2 done: DENSITY_MIN_ALT_KM 150 / DENSITY_MAX_ALT_KM 800 in constants.ts (SOURCES), exposed with HOURLY_BELOW_KM and REENTRY_ALT_KM in web CONSTANTS. The Orbit band still uses the adapter's engine search (unchanged).
- G2.3 done: SimResult.groundTrack (one day, 30 s steps, <= 720 points, deterministic). The Flight map still uses the adapter's own track (switch pending); Angola regression hash excludes this new field only.
- G2.4 NOT done: no coastline source file was supplied offline; nothing shipped, map unchanged (graticule only). Needs a Natural Earth file + licence check.
- G3 done: Rocket.minPriceUsd; spacex-rideshare 350,000 USD flat ("estimate, not a quote" on the Orbit card); Electron price labelled game-balanced on screen. Test: 6 kg and 3U/6U same launch cost.
- G5 partial: P1 Brief hero, P2 Angola card, P7 Jeddah card with SI tag + bilingual alt (content/text/art-alt.json). P3, P5, P6 placements not done.
- F8 axe: @axe-core/playwright is not installed (final-pass dependency, AGENTS.md s3); no axe run was made. Jeddah Playwright smoke (web/scripts/smoke-jeddah.mjs) passes at 390x844 and 1440x900, EN and AR: no console errors, no external requests, no overflow.
