/**
 * STORMPROOF shared contracts (AGENTS.md section 4).
 * FROZEN after T0.1: any change needs Iyad's approval and an ISSUES.md entry.
 *
 * Engine API (implemented in index.ts):
 *   simulate(design: MissionDesign): SimResult
 *   encodeMission(design: MissionDesign): string
 *   decodeMission(code: string): MissionDesign
 * Deterministic: same design (incl. seed) gives an identical SimResult.
 */

/** Calendar date, UTC, 'YYYY-MM-DD'. */
export type ISODate = string;

/** Translatable text: UI looks up `key` in content/i18n and fills `params`; `en` is the English fallback. */
export interface Msg {
  key: string;
  params: Record<string, string | number>;
  en: string;
}

// ---------------------------------------------------------------------------
// MissionDesign (input)
// ---------------------------------------------------------------------------

export type FormFactor = '1U' | '3U' | '6U';

/** 'SSO' = Sun-synchronous (10:30/22:30 local time); 'ISS51.6' = 51.6 deg inclination. */
export type OrbitType = 'SSO' | 'ISS51.6';

/** plan = reconstructed 2019 panel forecast Sun; truth = real NASA OMNI Sun. */
export type SimMode = 'plan' | 'truth';

export type PartSlot = 'camera' | 'panels' | 'battery' | 'radio' | 'computer' | 'pointing' | 'fuel';

/** Part id per slot, ids from content/parts.json. */
export type PartChoices = Record<PartSlot, string>;

/** Team-mode roles (design brief: RoleChip). */
export type RoleId = 'systems-lead' | 'science' | 'power-spacecraft' | 'orbit-comms';

/** Role -> player display name. Omitted in solo mode. */
export type RoleAssignments = Partial<Record<RoleId, string>>;

/**
 * Team's standing response to a storm alert (events.ts resolves the vote with it).
 * 'ride-out' = keep operating; 'safe-mode' = payload off for the storm days.
 */
export type StormPolicy = 'ride-out' | 'safe-mode';

export interface OrbitChoice {
  type: OrbitType;
  /** Circular orbit altitude above mean Earth radius, km. */
  altitudeKm: number;
}

export interface MissionDesign {
  /** e.g. 'angola' (content/scenarios/angola.json). */
  scenarioId: string;
  parts: PartChoices;
  formFactor: FormFactor;
  orbit: OrbitChoice;
  /** Rocket id from content/rockets.json. */
  rocketId: string;
  /** Planned launch date on the real-Sun timeline, 2015-01-01..2026-12-31. */
  launchDate: ISODate;
  mode: SimMode;
  /** uint32 seed for all randomness (launch slip, events). */
  seed: number;
  /** Team mode only. */
  roles?: RoleAssignments;
  /** Team mode storm response; default 'ride-out'. */
  stormPolicy?: StormPolicy;
}

// ---------------------------------------------------------------------------
// SimResult (output)
// ---------------------------------------------------------------------------

export type GaugeId = 'mass' | 'power' | 'budget' | 'data' | 'comms' | 'time';
export type GaugeState = 'ok' | 'warn' | 'fail';

export interface Gauge {
  id: GaugeId;
  value: number;
  limit: number;
  /** Display unit, e.g. 'kg', 'W', 'USD', 'MB/day', 'min/day', 'days'. */
  unit: string;
  /** Margin in percent of value; negative means over the limit (or short of it, for 'time'). */
  marginPct: number;
  /** Required margin in percent (CML 4: 35 for mass and power; 0 where no rule applies). */
  requiredMarginPct: number;
  state: GaugeState;
}

export type Gauges = Record<GaugeId, Gauge>;

export type FitCheckId =
  | 'mass'
  | 'volume'
  | 'power'
  | 'energy'
  | 'budget'
  | 'data'
  | 'comms'
  | 'rocket-capacity'
  | 'rocket-orbit'
  | 'launch-window'
  | 'disposal';

export interface FitVerdict {
  check: FitCheckId;
  pass: boolean;
  /** Plain explanation; always set, and required to say why when pass is false. */
  reason: Msg;
}

export interface TimelineDay {
  date: ISODate;
  altitudeKm: number;
  /** Orbit-averaged neutral density at altitude, kg/m^3. */
  densityKgM3: number;
  /** Battery state of charge at end of day, 0..100. */
  batteryPct: number;
  /** Payload data generated this day, MB. */
  dataGeneratedMB: number;
  /** Data downlinked this day, MB. */
  dataDownlinkedMB: number;
  /** Onboard buffer at end of day, MB. */
  dataStoredMB: number;
  /** Data lost to buffer overflow this day, MB. */
  dataLostMB: number;
  /** Max Kp of a DONKI geomagnetic storm on this day, or null if none. */
  stormKp: number | null;
  /** True when the day is driven by the NASA prediction (after OMNI ends 2026-10-29); UI shades it. */
  forecast: boolean;
}

export type Outcome =
  /** Reentered (120 km) on or before the end of real data. */
  | { kind: 'reentered'; date: ISODate }
  /** Still in orbit when real data ends; reentry predicted on the forecast Sun. */
  | { kind: 'alive'; asOf: ISODate; predictedReentry: ISODate }
  /** Still in orbit at the end of the forecast (Oct 2041): life is ">= minYears". */
  | { kind: 'alive-at-forecast-end'; asOf: ISODate; minYears: number };

export interface PlanVsTruth {
  planLifetimeDays: number;
  truthLifetimeDays: number;
  /** True when that lifetime is a lower bound (alive at forecast end). */
  planIsLowerBound: boolean;
  truthIsLowerBound: boolean;
  /** planLifetimeDays - truthLifetimeDays ("the Sun took N days"); negative if the real Sun was kinder. */
  sunTookDays: number;
}

export interface DisposalRule {
  limitYears: number;
  pass: boolean;
}

export interface DisposalVerdict {
  lifetimeYears: number;
  /** 'lower-bound' when the satellite outlives the forecast. */
  basis: 'computed' | 'lower-bound';
  /** FCC 22-74: <= 5 years. */
  fcc: DisposalRule;
  /** NASA-STD-8719.14C: <= 25 years. */
  nasa: DisposalRule;
  reason: Msg;
}

export type RequirementId = 'revisit' | 'gsd' | 'data-delivered' | 'lifetime' | 'cost';

export interface Requirement {
  id: RequirementId;
  met: boolean;
  value: number;
  target: number;
  unit: string;
  /** 'max' = value must be <= target; 'min' = value must be >= target. */
  sense: 'max' | 'min';
}

export interface Score {
  /** Requirements are judged first, in this order: revisit, gsd, data-delivered, lifetime, cost. */
  requirements: Requirement[];
  requirementsMet: number;
  /** 0..100. */
  total: number;
}

export interface Cause {
  id: string;
  label: Msg;
  /** Numeric effect of this cause. */
  effect: { value: number; unit: string };
  /** True if the cause is the Sun (draw in `sol`). */
  sun: boolean;
}

export interface ClosestDesign {
  /** Real mission name, e.g. 'FACSAT-2'. */
  mission: string;
  formFactor: FormFactor;
  altitudeKm: number;
  launchDate: ISODate;
  reentryDate: ISODate | null;
  /** Id of the row in content/sources.csv. */
  sourceId: string;
  hint: Msg;
}

export interface SimResult {
  /** Echo of the input design. */
  design: MissionDesign;
  gauges: Gauges;
  fit: FitVerdict[];
  /** One row per simulated day, launch to reentry or forecast end. */
  timeline: TimelineDay[];
  outcome: Outcome;
  lifetimeDays: number;
  planVsTruth: PlanVsTruth;
  disposal: DisposalVerdict;
  score: Score;
  /** Ordered 3..5 causes ending in the verdict. */
  causes: Cause[];
  closest: ClosestDesign;
  missionCode: string;
}
