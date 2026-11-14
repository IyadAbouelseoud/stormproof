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
