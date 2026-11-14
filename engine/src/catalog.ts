/**
 * Content schema the engine reads (content/parts.json, rockets.json, scenarios/*.json).
 * Not part of the frozen SimResult/MissionDesign contract; proposed to the content lane in ISSUES.md.
 * Every entry carries `src` (a sources.csv id, "AGENTS.md s5" or "game-balanced").
 */
import type { FormFactor, OrbitType, PartSlot } from './contracts';

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
}

export interface Content {
  parts: Part[];
  rockets: Rocket[];
  scenarios: Scenario[];
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
