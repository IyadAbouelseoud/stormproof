# ISSUES

## 2026-11-14 Content schema needed by the engine (for Dua, content lane)
The engine reads `content/parts.json`, `content/rockets.json`, `content/scenarios/angola.json` with the types in `engine/src/catalog.ts` (`Part`, `Rocket`, `Scenario`).
Until those files land, engine tests use `engine/test/fixtures/content-stub.json` (all values game-balanced except Electron 200 kg from AGENTS.md s5).
Every entry needs `src` = a `content/sources.csv` id, or "game-balanced". Part ids in the stub match `mock-result.json`.
Open: the per-form-factor bus (structure + EPS + harness) mass/cost in `catalog.ts` `BUS` is game-balanced; replace with sourced values if available.
