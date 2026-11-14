/**
 * The ONLY data gateway for the UI (prompt B rule 7).
 *
 * Runs the real engine (engine/src, read-only) on the shipped static data in web/public/data.
 * Until the data loads, or if loading fails, it falls back to engine/test/fixtures/mock-result.json.
 * Components never import the fixture, the engine or the data files directly.
 *
 * Content: content/parts.json etc. have not landed yet (Dua's lane), so the catalog is the engine's
 * game-balanced content stub. Swap the import below when content/*.json lands.
 */
import { create } from 'zustand';
import {
  createEngine,
  engineDataFrom,
  type Engine,
  type MissionDesign,
  type SimResult,
  type Content,
  type Part,
  type Rocket,
  type Scenario,
  type DensityMeta,
  type Storm,
  type PartSlot,
  type GaugeId,
  type RequirementId,
} from '@stormproof/engine';
import { inclinationDeg, periodS } from '../../engine/src/orbit';
import {
  FUNDA_LAT_DEG,
  FUNDA_LON_DEG,
  TARGET_LAT_DEG,
  OMEGA_EARTH_RAD_S,
  REENTRY_ALT_KM,
  STORM_ALERT_KP,
  OMNI_END,
  BATTERY_DOD,
  HOURLY_BELOW_KM,
  DENSITY_MIN_ALT_KM,
  DENSITY_MAX_ALT_KM,
  SOURCES,
} from '../../engine/src/constants';
import mockResultJson from '../../engine/test/fixtures/mock-result.json';
import partsJson from '../../content/parts.json';
import rocketsJson from '../../content/rockets.json';
import angolaJson from '../../content/scenarios/angola.json';
import jeddahJson from '../../content/scenarios/jeddah-flood.json';
import jeddahCloudJson from '../../content/evidence/jeddah-cloud-2022-11.json';
import jeddahDemoJson from '../../content/demo/jeddah-demo.json';

export type { MissionDesign, SimResult, Part, Rocket, Scenario, PartSlot, GaugeId, RequirementId };

const MOCK = mockResultJson as unknown as SimResult;
/** Jeddah flood watch is on unless the build sets VITE_JEDDAH=0 (prompt E hard stop). */
export const JEDDAH_ON = import.meta.env.VITE_JEDDAH !== '0';

const CONTENT: Content = {
  parts: (partsJson as unknown as { parts: Part[] }).parts,
  rockets: (rocketsJson as unknown as { rockets: Rocket[] }).rockets,
  scenarios: [angolaJson as unknown as Scenario, ...(JEDDAH_ON ? [jeddahJson as unknown as Scenario] : [])],
  cloudTags: { 'jeddah-cloud-2022-11': jeddahCloudJson as unknown as NonNullable<Content['cloudTags']>[string] },
};

export const SCENARIO_IDS: readonly string[] = CONTENT.scenarios.map((s) => s.id);

/** Starting design per scenario (Jeddah: demo mission 1, the optical 6U that the storm cloud blinds). */
const DEFAULTS: Record<string, MissionDesign> = {
  angola: {
    scenarioId: 'angola',
    parts: { camera: 'camera-standard', panels: 'panels-large', battery: 'battery-medium', radio: 'radio-fast', computer: 'computer-standard', pointing: 'pointing-standard', fuel: 'fuel-small' },
    formFactor: '6U', orbit: { type: 'SSO', altitudeKm: 500 }, rocketId: 'spacex-rideshare', launchDate: '2023-04-15', mode: 'truth', seed: (mockResultJson as unknown as SimResult).design.seed,
  },
  'jeddah-flood': (jeddahDemoJson as unknown as { missions: { design: MissionDesign }[] }).missions[0]!.design,
};

/** Jeddah demo missions (content/demo/jeddah-demo.json). */
export const JEDDAH_DEMO = (jeddahDemoJson as unknown as { missions: { id: string; code: string; expect: string; design: MissionDesign }[] }).missions;

/** Daily cloud tags for an event scenario, or null. */
export function cloudTags(scenarioId: string): { date: string; tag: string; evidence?: string; note?: string }[] | null {
  const ev = scenario(scenarioId)?.event;
  if (!ev) return null;
  return (CONTENT.cloudTags?.[ev.cloudTagsFile]?.days as { date: string; tag: string }[] | undefined) ?? null;
}

export const PART_SLOTS: readonly PartSlot[] = [
  'camera',
  'panels',
  'battery',
  'radio',
  'computer',
  'pointing',
  'fuel',
];
export const GAUGE_ORDER: readonly GaugeId[] = ['mass', 'power', 'budget', 'data', 'comms', 'time'];

/** Engine constants the UI shows (all from engine/src/constants.ts, each with its SOURCES tag). */
export const CONSTANTS = {
  reentryAltKm: REENTRY_ALT_KM,
  stormAlertKp: STORM_ALERT_KP,
  fundaLatDeg: FUNDA_LAT_DEG,
  fundaLonDeg: FUNDA_LON_DEG,
  targetLatDeg: TARGET_LAT_DEG,
  omniEnd: OMNI_END,
  /** G2: integrator switches to hourly steps below this altitude, km. */
  hourlyBelowKm: HOURLY_BELOW_KM,
  /** G2: altitude range of the density table, km. */
  densityMinAltKm: DENSITY_MIN_ALT_KM,
  densityMaxAltKm: DENSITY_MAX_ALT_KM,
  /** Lowest safe state of charge, % (1 - depth of discharge; game-balanced). */
  batteryFloorPct: Math.round((1 - BATTERY_DOD) * 100),
} as const;

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export type EngineStatus = 'loading' | 'ready' | 'mock';

interface AdapterState {
  status: EngineStatus;
  error: string | null;
}

export const useEngineStatus = create<AdapterState>(() => ({ status: 'loading', error: null }));

let engine: Engine | null = null;

interface SunDaily {
  start: string;
  end: string;
  f107_adj: (number | null)[];
}
interface SunForecast {
  months: string[];
  f107_adj: number[];
}
let sunDaily: SunDaily | null = null;
let sunForecast: SunForecast | null = null;

const dataUrl = (name: string): string => `${import.meta.env.BASE_URL}data/${name}`;

async function fetchJson<T>(name: string): Promise<T> {
  const r = await fetch(dataUrl(name));
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return (await r.json()) as T;
}
async function fetchBin(name: string): Promise<ArrayBuffer> {
  const r = await fetch(dataUrl(name));
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return r.arrayBuffer();
}

let loadPromise: Promise<void> | null = null;

/** Load the static data once and build the engine. Safe to call many times. */
export function loadEngine(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const [meta, storms, a, b, c, d, daily, forecast] = await Promise.all([
        fetchJson<DensityMeta>('density_meta.json'),
        fetchJson<{ storms: Storm[] }>('storms.json'),
        fetchBin('density_sso_truth.bin'),
        fetchBin('density_sso_plan.bin'),
        fetchBin('density_iss_truth.bin'),
        fetchBin('density_iss_plan.bin'),
        fetchJson<SunDaily>('sun_daily.json'),
        fetchJson<SunForecast>('sun_forecast.json'),
      ]);
      engine = createEngine(
        engineDataFrom({
          meta,
          storms,
          bins: { sso_truth: a, sso_plan: b, iss_truth: c, iss_plan: d },
          content: CONTENT,
        }),
      );
      sunDaily = daily;
      sunForecast = forecast;
      useEngineStatus.setState({ status: 'ready', error: null });
    } catch (e) {
      engine = null;
      useEngineStatus.setState({ status: 'mock', error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return loadPromise;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export function isLive(): boolean {
  return engine !== null;
}

/** The starting design of a scenario (Angola by default). */
export function defaultDesign(scenarioId = 'angola'): MissionDesign {
  return structuredClone(DEFAULTS[scenarioId] ?? DEFAULTS.angola!);
}

export function mockResult(): SimResult {
  return MOCK;
}

const cache = new Map<string, SimResult>();
const keyOf = (d: MissionDesign): string => JSON.stringify(d);

/** simulate(design); returns the mock result while the engine is not loaded. */
export function simulate(design: MissionDesign): SimResult {
  if (!engine) return MOCK;
  const k = keyOf(design);
  const hit = cache.get(k);
  if (hit) return hit;
  const r = engine.simulate(design);
  if (cache.size > 200) cache.clear();
  cache.set(k, r);
  return r;
}

/** Same design flown on the reconstructed 2019 forecast Sun (for the dashed plan line). */
export function simulatePlan(design: MissionDesign): SimResult {
  return simulate({ ...design, mode: 'plan' });
}

export function encodeMission(design: MissionDesign): string {
  return engine ? engine.encodeMission(design) : MOCK.missionCode;
}

export function decodeMission(code: string): MissionDesign | null {
  if (!engine) return null;
  try {
    return engine.decodeMission(code.trim());
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Catalog (content)
// ---------------------------------------------------------------------------

/** Parts offered in a slot; parts with a `scenarios` list show only there (the radar study is Jeddah only). */
export function partsFor(slot: PartSlot, scenarioId?: string): Part[] {
  return CONTENT.parts.filter((p) => p.slot === slot && (!p.scenarios || !scenarioId || p.scenarios.includes(scenarioId)));
}
export function partById(id: string): Part | undefined {
  return CONTENT.parts.find((p) => p.id === id);
}
export function rockets(): Rocket[] {
  return CONTENT.rockets;
}
export function rocketById(id: string): Rocket | undefined {
  return CONTENT.rockets.find((r) => r.id === id);
}
export function scenario(id: string): Scenario | undefined {
  return CONTENT.scenarios.find((s) => s.id === id);
}

/**
 * CONTRACT REQUEST (HANDOFF): the scenario has no title/story text fields yet.
 * Stub: the i18n keys brief.story.<id> / brief.title.<id> carry placeholder text, marked as such.
 */
export function scenarioText(id: string): { titleKey: string; storyKey: string; stub: true } {
  return { titleKey: `brief.title.${id}`, storyKey: `brief.story.${id}`, stub: true };
}

// ---------------------------------------------------------------------------
// Sun stripe (monthly F10.7, 2015-01..2026-12)
// ---------------------------------------------------------------------------

export interface SunMonth {
  /** 'YYYY-MM' */
  month: string;
  /** Monthly mean adjusted F10.7, sfu. */
  f107: number;
  /** True when the value comes from NASA's prediction (after OMNI ends). */
  forecast: boolean;
}

/** Sun Stripe colour steps (design/README.md, game-balanced). */
export const SUN_STEPS_SFU = [80, 110, 140, 180, 220] as const;

export function sunLevel(f107: number): number {
  let i = 0;
  while (i < SUN_STEPS_SFU.length && f107 >= SUN_STEPS_SFU[i]!) i++;
  return i;
}

let sunMonthsCache: SunMonth[] | null = null;

/** Null until the data loads. Months with partial OMNI coverage and no forecast stay OMNI means. */
export function sunMonths(): SunMonth[] | null {
  if (!sunDaily || !sunForecast) return null;
  if (sunMonthsCache) return sunMonthsCache;
  const sums = new Map<string, { s: number; n: number }>();
  const start = Date.parse(`${sunDaily.start}T00:00:00Z`);
  sunDaily.f107_adj.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) return;
    const m = new Date(start + i * 86400000).toISOString().slice(0, 7);
    const e = sums.get(m) ?? { s: 0, n: 0 };
    e.s += v;
    e.n += 1;
    sums.set(m, e);
  });
  const out: SunMonth[] = [];
  for (let y = 2015; y <= 2026; y++) {
    for (let mo = 1; mo <= 12; mo++) {
      const m = `${y}-${String(mo).padStart(2, '0')}`;
      const fi = sunForecast.months.indexOf(m);
      const obs = sums.get(m);
      const omniEndMonth = OMNI_END.slice(0, 7);
      if (obs && m < omniEndMonth) {
        out.push({ month: m, f107: round1(obs.s / obs.n), forecast: false });
      } else if (fi >= 0) {
        out.push({ month: m, f107: round1(sunForecast.f107_adj[fi]!), forecast: true });
      } else if (obs) {
        out.push({ month: m, f107: round1(obs.s / obs.n), forecast: false });
      }
    }
  }
  sunMonthsCache = out;
  return out;
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------
// Orbit warning band (computed by running the engine across altitudes)
// ---------------------------------------------------------------------------

export interface AltitudeBands {
  /** Below this altitude the truth-Sun lifetime misses the scenario's lifetime requirement (drag). */
  dragBelowKm: number | null;
  /** Above this altitude the satellite breaks the FCC 5-year disposal rule. */
  disposalAboveKm: number | null;
  minKm: number;
  maxKm: number;
  basis: 'computed' | 'placeholder';
}

export const ALT_MIN_KM = 200;
export const ALT_MAX_KM = 800;
const ALT_STEP_KM = 10;

const bandCache = new Map<string, AltitudeBands>();

/**
 * CONTRACT REQUEST (HANDOFF): SimResult has no altitude thresholds. Until it does, the adapter
 * derives them from the engine itself: binary search on altitude (10 km resolution) for
 * (a) the lowest altitude that meets the lifetime requirement, (b) the highest that passes FCC 5 y.
 * Returns placeholder (null) bands while the engine is not loaded.
 */
export function altitudeBands(design: MissionDesign): AltitudeBands {
  const base = { minKm: ALT_MIN_KM, maxKm: ALT_MAX_KM };
  if (!engine) return { ...base, dragBelowKm: null, disposalAboveKm: null, basis: 'placeholder' };
  const k = keyOf({ ...design, orbit: { ...design.orbit, altitudeKm: 0 } });
  const hit = bandCache.get(k);
  if (hit) return hit;
  const at = (alt: number): SimResult =>
    simulate({ ...design, orbit: { ...design.orbit, altitudeKm: alt } });
  const meetsLife = (alt: number): boolean =>
    at(alt).score.requirements.find((r) => r.id === 'lifetime')?.met ?? false;
  const passesFcc = (alt: number): boolean => at(alt).disposal.fcc.pass;

  // lifetime grows with altitude: first altitude where meetsLife is true
  const dragBelowKm = searchFirst(ALT_MIN_KM, ALT_MAX_KM, meetsLife);
  // FCC passes at low altitude: first altitude where it fails
  const firstFccFail = searchFirst(ALT_MIN_KM, ALT_MAX_KM, (a) => !passesFcc(a));
  const out: AltitudeBands = {
    ...base,
    dragBelowKm,
    disposalAboveKm: firstFccFail === null ? null : firstFccFail - ALT_STEP_KM,
    basis: 'computed',
  };
  bandCache.set(k, out);
  return out;
}

/** Smallest altitude in [lo, hi] (10 km grid) where pred holds, assuming monotonic; null if never. */
function searchFirst(lo: number, hi: number, pred: (alt: number) => boolean): number | null {
  if (!pred(hi)) return null;
  if (pred(lo)) return lo;
  let a = lo;
  let b = hi;
  while (b - a > ALT_STEP_KM) {
    const mid = Math.round((a + b) / 2 / ALT_STEP_KM) * ALT_STEP_KM;
    if (mid === a || mid === b) break;
    if (pred(mid)) b = mid;
    else a = mid;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Ground track (computed: circular orbit, engine inclination and period)
// ---------------------------------------------------------------------------

export interface TrackPoint {
  lat: number;
  lon: number;
}

/**
 * CONTRACT REQUEST (HANDOFF): SimResult has no ground track. Stub computed here from the engine's
 * inclination and period (circular orbit, spherical Earth, ascending node at 0 deg lon at t = 0:
 * the node longitude is illustrative). Returns `orbits` revolutions as separate segments split at the
 * antimeridian.
 */
export function groundTrack(design: MissionDesign, orbits = 3, startOrbit = 0): TrackPoint[][] {
  const inc = (inclinationDeg(design.orbit.type, design.orbit.altitudeKm) * Math.PI) / 180;
  const T = periodS(design.orbit.altitudeKm);
  const n = (2 * Math.PI) / T;
  const segs: TrackPoint[][] = [];
  let cur: TrackPoint[] = [];
  let prevLon: number | null = null;
  const steps = orbits * 120;
  for (let i = 0; i <= steps; i++) {
    const t = (startOrbit * T) + (i / steps) * orbits * T;
    const u = n * t;
    const lat = Math.asin(Math.sin(inc) * Math.sin(u));
    let lon = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) - OMEGA_EARTH_RAD_S * t;
    lon = ((((lon * 180) / Math.PI + 180) % 360) + 360) % 360 - 180;
    if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
      segs.push(cur);
      cur = [];
    }
    cur.push({ lat: (lat * 180) / Math.PI, lon });
    prevLon = lon;
  }
  segs.push(cur);
  return segs.filter((s) => s.length > 1);
}

/**
 * Ground track for the Flight map from SimResult.groundTrack (the engine's one-day track, [lat, lon] pairs):
 * a window of `orbits` revolutions starting `startOrbit` revolutions in (wrapping within the day), split at the
 * antimeridian. Falls back to the adapter's own track when the result carries none (mock data).
 */
export function trackFromResult(result: SimResult, design: MissionDesign, orbits = 3, startOrbit = 0): TrackPoint[][] {
  const pts = result.groundTrack;
  if (!pts || pts.length < 2) return groundTrack(design, orbits, startOrbit);
  const perOrbit = (pts.length - 1) / (86400 / periodS(design.orbit.altitudeKm));
  const count = Math.min(pts.length - 1, Math.max(2, Math.round(orbits * perOrbit)));
  const span = pts.length - count;
  const first = span > 0 ? Math.round(startOrbit * perOrbit) % span : 0;
  const segs: TrackPoint[][] = [];
  let cur: TrackPoint[] = [];
  for (let i = first; i <= first + count; i++) {
    const [lat, lon] = pts[i]!;
    const prev = cur[cur.length - 1];
    if (prev && Math.abs(lon - prev.lon) > 180) {
      segs.push(cur);
      cur = [];
    }
    cur.push({ lat, lon });
  }
  segs.push(cur);
  return segs.filter((s) => s.length > 1);
}

// ---------------------------------------------------------------------------
// Knock-on trail (built only from numbers in two results)
// ---------------------------------------------------------------------------

export interface TrailStep {
  gauge: GaugeId;
  delta: number;
  unit: string;
}

/** Gauge deltas between two results, in gauge order, skipping unchanged ones. */
export function knockOnTrail(prev: SimResult, next: SimResult): TrailStep[] {
  const out: TrailStep[] = [];
  for (const id of GAUGE_ORDER) {
    const d = next.gauges[id].value - prev.gauges[id].value;
    if (Math.abs(d) > 1e-9) out.push({ gauge: id, delta: d, unit: next.gauges[id].unit });
  }
  return out;
}

// ---------------------------------------------------------------------------
// GIBS imagery
// ---------------------------------------------------------------------------

export interface GibsImage {
  file: string;
  url: string;
  date: string;
  resolutionM: number;
  credit: string;
  layer: string;
}

let gibsCache: GibsImage[] | null = null;

export async function gibsImages(): Promise<GibsImage[]> {
  if (gibsCache) return gibsCache;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}img/gibs/credits.json`);
    if (!r.ok) return [];
    const raw = (await r.json()) as {
      file: string;
      date: string;
      resolution_m: number;
      credit: string;
      layer: string;
    }[];
    gibsCache = raw.map((g) => ({
      file: g.file,
      url: `${import.meta.env.BASE_URL}img/gibs/${g.file}`,
      date: g.date,
      resolutionM: g.resolution_m,
      credit: g.credit,
      layer: g.layer,
    }));
    return gibsCache;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Sources (for the Report drawer)
// ---------------------------------------------------------------------------

export type SourceTag = 'sourced' | 'computed' | 'game-balanced';

export interface SourceRow {
  /** i18n key of the label. */
  labelKey: string;
  value: string;
  tag: SourceTag;
  /** Free-text source (English, from engine SOURCES / content src / data files). */
  source: string;
}

const tagOf = (src: string): SourceTag => (src.startsWith('game-balanced') ? 'game-balanced' : 'sourced');

/** Every number the Report screen shows, with its tag. */
export function reportSources(r: SimResult, gibs: GibsImage | null): SourceRow[] {
  const sc = scenario(r.design.scenarioId);
  const rows: SourceRow[] = [
    { labelKey: 'src.lifetime', value: `${r.lifetimeDays} d`, tag: 'computed', source: 'engine simulate(), truth mode (NASA OMNIWeb data drives the NRLMSIS 2.1 model)' },
    { labelKey: 'src.plan_lifetime', value: `${r.planVsTruth.planLifetimeDays} d`, tag: 'computed', source: 'engine simulate(), plan mode (reconstructed 2019 panel forecast Sun)' },
    { labelKey: 'src.sun_took', value: `${r.planVsTruth.sunTookDays} d`, tag: 'computed', source: 'plan lifetime minus truth lifetime' },
    { labelKey: 'src.reentry_alt', value: `${REENTRY_ALT_KM} km`, tag: 'sourced', source: SOURCES.REENTRY_ALT_KM ?? '' },
    { labelKey: 'src.fcc', value: `${r.disposal.fcc.limitYears} y`, tag: 'sourced', source: SOURCES.FCC_DISPOSAL_YEARS ?? '' },
    { labelKey: 'src.nasa', value: `${r.disposal.nasa.limitYears} y`, tag: 'sourced', source: SOURCES.NASA_DISPOSAL_YEARS ?? '' },
    { labelKey: 'src.cml', value: `${r.gauges.mass.requiredMarginPct}%`, tag: 'sourced', source: SOURCES.CML_MARGIN_PCT ?? '' },
  ];
  for (const req of r.score.requirements) {
    rows.push({ labelKey: `req.${req.id}`, value: `${req.value} ${req.unit}`, tag: 'computed', source: 'engine score.requirements' });
    rows.push({ labelKey: `src.target.${req.id}`, value: `${req.target} ${req.unit}`, tag: sc ? tagOf(sc.src) : 'game-balanced', source: sc?.src ?? 'content stub' });
  }
  rows.push({ labelKey: 'src.score', value: `${r.score.total}`, tag: 'game-balanced', source: 'engine score.ts (16 points per requirement + 20 Sun resilience)' });
  for (const c of r.causes) {
    rows.push({ labelKey: 'src.cause', value: `${c.effect.value} ${c.effect.unit}`, tag: 'computed', source: `engine causes.ts (${c.id})` });
  }
  rows.push({ labelKey: 'src.closest', value: `${r.closest.mission} ${r.closest.altitudeKm} km`, tag: 'sourced', source: `content/sources.csv row ${r.closest.sourceId}` });
  for (const slot of PART_SLOTS) {
    const p = partById(r.design.parts[slot]);
    if (p) rows.push({ labelKey: `slot.${slot}`, value: p.name, tag: tagOf(p.src), source: p.src });
  }
  rows.push({ labelKey: 'src.sun_steps', value: SUN_STEPS_SFU.join(' / ') + ' sfu', tag: 'game-balanced', source: 'design/README.md Sun Stripe steps' });
  if (gibs) {
    rows.push({ labelKey: 'src.gibs', value: `${gibs.resolutionM} m, ${gibs.date}`, tag: 'sourced', source: gibs.credit });
  }
  return rows;
}
