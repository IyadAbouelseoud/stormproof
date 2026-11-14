/**
 * Engine API (AGENTS.md s4): simulate(design) -> SimResult, encodeMission(design), decodeMission(code).
 *
 * The engine is pure; it reads no files and makes no network calls. The caller loads the static data once
 * (web/public/data + content/) and passes it in, either:
 *   const engine = createEngine(engineDataFrom(raw)); engine.simulate(design)
 * or with the contract-shaped module function:
 *   setEngineData(engineDataFrom(raw)); simulate(design)
 */
import type { MissionDesign, SimResult } from './contracts';
import { simulate as simulateWith, type EngineData } from './flight';
import { decodeMission, encodeMission } from './mission-code';

export type * from './contracts';
export type { Content, Part, Rocket, Scenario } from './catalog';
export type { DensityMeta } from './drag';
export type { Storm } from './events';
export { engineDataFrom, type EngineData, type RawEngineData, type TableName } from './flight';
export { decodeMission, encodeMission };

export interface Engine {
  simulate(design: MissionDesign): SimResult;
  encodeMission(design: MissionDesign): string;
  decodeMission(code: string): MissionDesign;
}

export function createEngine(data: EngineData): Engine {
  return { simulate: (d) => simulateWith(d, data), encodeMission, decodeMission };
}

let current: EngineData | null = null;

/** Install the data used by the module-level simulate(). */
export function setEngineData(data: EngineData): void {
  current = data;
}

export function simulate(design: MissionDesign): SimResult {
  if (!current) throw new Error('engine data not loaded: call setEngineData(engineDataFrom(raw)) first');
  return simulateWith(design, current);
}
