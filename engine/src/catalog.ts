/**
 * Content schema the engine reads (content/parts.json, rockets.json, scenarios/*.json).
 * Not part of the frozen SimResult/MissionDesign contract; proposed to the content lane in ISSUES.md.
 * Every entry carries `src` (a sources.csv id, "AGENTS.md s5" or "game-balanced").
 */
import type { FormFactor, OrbitType, PartSlot, RequirementId } from './contracts';

export interface Part {
  id: string;
  slot: PartSlot;
  name: string;
  massKg: number;
  /** Orbit-average power draw, W. */
  powerW: number;
  costUsd: number;
  /** Volume in CubeSat units (U). */
  units: number;
  src: string;
  /** camera */
  gsdAt500M?: number;
  swathAt500Km?: number;
  dataMBPerDay?: number;
  /** panels: effective sunlit area incl. pointing/cosine losses, m^2 */
  effectiveAreaM2?: number;
  /** battery */
  capacityWh?: number;
  /** radio */
  downlinkMbps?: number;
  /** computer: onboard storage */
  storageMB?: number;
  /** fuel: delta-v available */
  deltaVMs?: number;
  /** camera: 'optical' (default) or 'radar' (sees through cloud; prompt E). */
  cameraType?: 'optical' | 'radar';
  /** Scenario ids this part is offered in (default: all). */
  scenarios?: string[];
  /** pointing: swath multiplier from off-nadir pointing (default 1). game-balanced. */
  offNadirFactor?: number;
}

export interface Rocket {
  id: string;
  name: string;
  /** Payload capacity to 500 km SSO, kg (the slot this game sells). */
  capacityKg: number;
  orbits: OrbitType[];
  minAltKm: number;
  maxAltKm: number;
  /** Price for a CubeSat slot, USD per kg. */
  priceUsdPerKg: number;
  /** Minimum charge, USD (G3: SpaceX estimator showed a flat 350,000 USD for 6 to 50 kg; estimate, not a quote). */
  minPriceUsd?: number;
  /** First flight, ISO date: launches before it are rejected. */
  firstFlight: string;
  src: string;
}

export interface Scenario {
  id: string;
  name: string;
  budgetUsd: number;
  /** Requirement targets (score.ts). */
  revisitMaxDays: number;
  gsdMaxM: number;
  dataDeliveredMinGB: number;
  lifetimeMinDays: number;
  src: string;
  /** Id in content/text/scenarios.json when it differs from `id`. */
  textId?: string;
  /** Target latitude/longitude, deg (approximate). Default: TARGET_LAT_DEG (Angola). */
  targetLatDeg?: number;
  targetLonDeg?: number;
  /** Days after the event in which a useful look counts (event-look requirement). */
  lookWindowDays?: number;
  /** Dated event replayed by event.ts; `label` is a text key, `cloudTagsFile` a key of Content.cloudTags. */
  event?: { id: string; date: string; label: string; cloudTagsFile: string };
  /** Requirements scored, in order. Default: the five Angola requirements. */
  requirementSet?: RequirementId[];
}

export type CloudTag = 'clear' | 'partly' | 'cloudy' | 'no-image';
/** content/evidence/<name>.json (read by eye from NASA Worldview). */
export interface CloudTagFile {
  layer: string;
  days: { date: string; tag: CloudTag }[];
}

export interface Content {
  parts: Part[];
  rockets: Rocket[];
  scenarios: Scenario[];
  /** Cloud tag files by name (Scenario.event.cloudTagsFile). */
  cloudTags?: Record<string, CloudTagFile>;
}

/** CubeSat Design Specification Rev 14.1 (Cal Poly) maximum masses. */
export const FORM_FACTOR_MAX_KG: Record<FormFactor, number> = { '1U': 2, '3U': 6, '6U': 12 };
export const FORM_FACTOR_UNITS: Record<FormFactor, number> = { '1U': 1, '3U': 3, '6U': 6 };
export const FORM_FACTOR_SRC = 'CubeSat Design Specification Rev 14.1 (Cal Poly)';

/** Structure, power electronics and harness that every design carries. game-balanced. */
export const BUS: Record<FormFactor, { massKg: number; costUsd: number; units: number }> = {
  '1U': { massKg: 0.5, costUsd: 60000, units: 0.3 },
  '3U': { massKg: 1.4, costUsd: 140000, units: 0.6 },
  '6U': { massKg: 2.6, costUsd: 250000, units: 1 },
};
export const BUS_SRC = 'game-balanced';
