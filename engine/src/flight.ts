/**
 * simulate(): design -> SimResult. Pure and deterministic given (design, data):
 * all randomness comes from createRng(design.seed), drawn in a fixed order (slip, then storm votes).
 *
 * Mode semantics:
 *  - plan: 2019 panel forecast Sun, planned launch date, no events.
 *  - truth: real NASA OMNI Sun (NASA prediction after 2026-10-29), seeded launch slip, DONKI storm alerts.
 * Plan-vs-truth is always computed both ways; timeline[0].date is the actual launch date of the
 * selected mode (truth may be later than design.launchDate by the launch slip).
 */
import type { Content, Part } from './catalog';
import { FORM_FACTOR_MAX_KG } from './catalog';
import { causeChain } from './causes';
import { closestDesign } from './closest';
import { downlinkMBPerDay, commsDay } from './comms';
import {
  AREA_TO_MASS_M2_KG,
  CD,
  CML_MARGIN_PCT,
  FORECAST_END,
  OMNI_END,
  REBOOST_DROP_KM,
  TARGET_LAT_DEG,
} from './constants';
import type { MissionDesign, OrbitType, Outcome, SimResult, TimelineDay } from './contracts';
import { addMonths, dayNum, isoOf } from './dates';
import { climbKmFromDeltaV, decay, type DecayResult, type Reboost } from './decay';
import type { DensityMeta, DensityTable } from './drag';
import { densityAt, makeTable } from './drag';
import { launchSlipMonths, resolveStorms, stormAlerts, type Storm } from './events';
import { fitCheck, resolveDesign } from './launch';
import { encodeMission } from './mission-code';
import { r1 } from './msg';
import { fundaPasses, gsdM, revisitDays, type PassStats } from './orbit';
import { powerBudget } from './power';
import { createRng } from './rng';
import { disposalFit, disposalVerdict, gauge } from './rules';
import { score } from './score';
import { cameraKind, eventReplay, lookSwathKm } from './event';

export type TableName = 'sso_truth' | 'sso_plan' | 'iss_truth' | 'iss_plan';

export interface EngineData {
  content: Content;
  tables: Record<TableName, DensityTable>;
  storms: Storm[];
}

/** Raw files as the web app or tests load them (density_meta.json, the four .bin files, storms.json, content). */
export interface RawEngineData {
  meta: DensityMeta;
  bins: Record<TableName, ArrayBuffer>;
  storms: { storms: Storm[] };
  content: Content;
}

export function engineDataFrom(raw: RawEngineData): EngineData {
  const tables = {} as Record<TableName, DensityTable>;
  for (const name of ['sso_truth', 'sso_plan', 'iss_truth', 'iss_plan'] as const) {
    tables[name] = makeTable(raw.meta, name, new Float32Array(raw.bins[name]));
  }
  return { content: raw.content, tables, storms: raw.storms.storms };
}

const END_DAY = dayNum(FORECAST_END);
const OMNI_END_DAY = dayNum(OMNI_END);
const r2 = (v: number): number => Math.round(v * 100) / 100;
const sig4 = (v: number): number => Number(v.toPrecision(4));

/** Funda passes depend only on orbit type and altitude; cache per 10 km bucket. */
const passCache = new Map<string, PassStats>();
function passesAt(type: OrbitType, altKm: number): PassStats {
  const bucket = Math.round(altKm / 10) * 10;
  const k = `${type}:${bucket}`;
  let p = passCache.get(k);
  if (!p) {
    p = fundaPasses(type, bucket);
    passCache.set(k, p);
  }
  return p;
}

interface Flight {
  startDay: number;
  run: DecayResult;
  /** Whole days from launch to reentry (or to the forecast end). */
  days: number;
  lowerBound: boolean;
}

export function simulate(design: MissionDesign, data: EngineData): SimResult {
  const res = resolveDesign(design, data.content);
  const alt = design.orbit.altitudeKm;
  const ff = design.formFactor;
  const part = (slot: string): Part => res.byslot[slot]!;
  const camera = part('camera');
  const radio = part('radio');
  const computer = part('computer');
  const fuel = part('fuel');
  const pointing = part('pointing');
  const targetLatDeg = res.scenario.targetLatDeg ?? TARGET_LAT_DEG;

  // ---- design-time budgets (at the design altitude) ----
  const power = powerBudget(res.parts, alt);
  const passes = passesAt(design.orbit.type, alt);
  const rateMbps = radio.downlinkMbps ?? 0;
  const dlCap = downlinkMBPerDay(rateMbps, passes.contactMinPerDay);
  const camRate = camera.dataMBPerDay ?? 0;
  const dataGen = camRate * power.payloadDuty;
  const fit = fitCheck({ design, res, power, dataGenMBPerDay: dataGen, downlinkMBPerDay: dlCap, passesPerDay: passes.passesPerDay });

  // ---- flights: plan, truth, and truth without the slip (for the cause chain) ----
  const rng = createRng(design.seed);
  const slip = launchSlipMonths(rng); // always drawn so the stream does not depend on mode
  const key = design.orbit.type === 'SSO' ? 'sso' : 'iss';
  const cdAm = CD * AREA_TO_MASS_M2_KG[ff];
  const dv = fuel.deltaVMs ?? 0;
  const reboost: Reboost | undefined = dv > 0 ? { triggerKm: alt - REBOOST_DROP_KM, targetKm: alt, budgetKm: climbKmFromDeltaV(alt, dv) } : undefined;
  const fly = (tab: DensityTable, launch: string): Flight => {
    const startDay = dayNum(launch);
    const run = decay(tab, startDay, alt, cdAm, END_DAY, reboost);
    return { startDay, run, days: run.daily.length - 1, lowerBound: run.reentryDay === null };
  };
  const planTab = data.tables[`${key}_plan`];
  const truthTab = data.tables[`${key}_truth`];
  const truthLaunch = slip > 0 ? addMonths(design.launchDate, slip) : design.launchDate;
  const plan = fly(planTab, design.launchDate);
  const truthNoSlip = fly(truthTab, design.launchDate);
  const truth = slip > 0 ? fly(truthTab, truthLaunch) : truthNoSlip;
  const isTruth = design.mode === 'truth';
  const f = isTruth ? truth : plan;

  // ---- events (truth only) ----
  const lastDay = f.startDay + f.days;
  const alerts = isTruth ? stormAlerts(data.storms, f.startDay, lastDay) : [];
  const stormOutcome = new Map(resolveStorms(alerts, design.stormPolicy, rng).map((o) => [o.day, o]));
  const kpByDay = new Map<number, number>();
  if (isTruth) for (const s of data.storms) {
    const d = dayNum(s.date);
    if (d >= f.startDay && d <= lastDay) kpByDay.set(d, Math.max(kpByDay.get(d) ?? 0, s.kpMax));
  }

  // ---- daily timeline ----
  const offParts = res.parts.filter((p) => p !== camera);
  const storageMB = computer.storageMB ?? 0;
  let stored = 0;
  let deliveredMB = 0;
  const timeline: TimelineDay[] = f.run.daily.map((s) => {
    const ev = stormOutcome.get(s.day);
    const off = ev?.payloadOff ?? false;
    const pb = powerBudget(off ? offParts : res.parts, s.altKm);
    const gen = off ? 0 : camRate * pb.payloadDuty;
    const cap = downlinkMBPerDay(rateMbps, passesAt(design.orbit.type, s.altKm).contactMinPerDay);
    // Computer reset while riding out a storm: the onboard buffer is wiped and counted as lost.
    const wiped = ev?.bufferLost ? stored : 0;
    if (ev?.bufferLost) stored = 0;
    const c = commsDay(stored, gen, cap, storageMB);
    stored = c.storedMB;
    deliveredMB += c.downlinkedMB;
    return {
      date: isoOf(s.day),
      altitudeKm: r2(s.altKm),
      densityKgM3: sig4(s.rhoKgM3),
      batteryPct: r1(pb.minSocPct),
      dataGeneratedMB: r1(gen),
      dataDownlinkedMB: r1(c.downlinkedMB),
      dataStoredMB: r1(c.storedMB),
      dataLostMB: r1(c.lostMB + wiped),
      stormKp: kpByDay.get(s.day) ?? null,
      forecast: isTruth && s.day > OMNI_END_DAY,
    };
  });

  // ---- outcome ----
  const lifetimeDays = f.days;
  let outcome: Outcome;
  if (f.lowerBound) outcome = { kind: 'alive-at-forecast-end', asOf: FORECAST_END, minYears: r1(lifetimeDays / 365.25) };
  else {
    const reentry = isoOf(f.run.reentryDay!);
    outcome = isTruth && f.run.reentryDay! > OMNI_END_DAY + 1 ? { kind: 'alive', asOf: OMNI_END, predictedReentry: reentry } : { kind: 'reentered', date: reentry };
  }

  // ---- rules, gauges, score ----
  const disposal = disposalVerdict(lifetimeDays, f.lowerBound);
  fit.push(disposalFit(disposal));
  const needMin = dataGen <= 0 ? 0 : rateMbps > 0 ? (dataGen * 8) / (rateMbps * 60) : 1440;
  const gauges = {
    mass: gauge('mass', r2(res.massKg), FORM_FACTOR_MAX_KG[ff], 'kg', CML_MARGIN_PCT),
    power: gauge('power', r2(power.loadW), r2(power.genW), 'W', CML_MARGIN_PCT),
    budget: gauge('budget', Math.round(res.costUsd), res.scenario.budgetUsd, 'USD', 0),
    data: gauge('data', r1(dataGen), r1(dlCap), 'MB/day', 0),
    comms: gauge('comms', r1(needMin), r1(passes.contactMinPerDay), 'min/day', 0),
    time: gauge('time', lifetimeDays, res.scenario.lifetimeMinDays, 'days', 0, 'min'),
  };
  const ev = eventReplay({
    scenario: res.scenario,
    camera,
    pointing,
    timeline,
    fit,
    cloud: res.scenario.event ? data.content.cloudTags?.[res.scenario.event.cloudTagsFile] : undefined,
    seed: design.seed,
  });
  const sc = score(res.scenario, {
    revisitDays: revisitDays(lookSwathKm(camera, pointing, alt), alt, targetLatDeg),
    gsdM: gsdM(camera.gsdAt500M ?? Infinity, alt),
    dataDeliveredGB: deliveredMB / 1000,
    lifetimeDays,
    costUsd: res.costUsd,
    truthOverPlan: plan.days > 0 ? truth.days / plan.days : 0,
    eventLookDays: ev?.firstUsefulLookDays ?? null,
  });

  // ---- causes ----
  let rhoT = 0;
  let rhoP = 0;
  const n = Math.max(1, truth.days);
  for (let i = 0; i < n; i++) {
    rhoT += densityAt(truthTab, truth.startDay + i, alt);
    rhoP += densityAt(planTab, truth.startDay + i, alt);
  }
  let storm: { km: number; date: string; kp: number } | null = null;
  if (isTruth) {
    // Storm cost = the two-day altitude loss times the share of it due to extra density:
    // density on the storm day and the next vs the two days before, at the same altitude.
    const tab = truthTab;
    for (let i = 3; i + 1 < timeline.length; i++) {
      const kp = timeline[i]!.stormKp;
      if (kp === null) continue;
      const hi = timeline[i]!.altitudeKm;
      const day = f.startDay + i;
      const rs = densityAt(tab, day, hi) + densityAt(tab, day + 1, hi);
      const rb = densityAt(tab, day - 3, hi) + densityAt(tab, day - 2, hi);
      const drop = timeline[i - 1]!.altitudeKm - timeline[i + 1]!.altitudeKm;
      const km = drop * Math.max(0, 1 - rb / rs);
      if (!storm || km > storm.km) storm = { km, date: timeline[i]!.date, kp: r1(kp) };
    }
  }
  const causes = causeChain({
    mode: design.mode,
    altKm: alt,
    planDays: plan.days,
    truthDays: truth.days,
    truthNoSlipDays: truthNoSlip.days,
    slipMonths: isTruth ? slip : 0,
    densityRatio: rhoT / rhoP,
    storm,
    deltaVMs: dv,
    climbKm: f.run.climbedKm,
    outcome,
    lifetimeDays,
    event: ev ? { camera: cameraKind(camera), replay: ev } : null,
  });

  return {
    design,
    gauges,
    fit,
    timeline,
    outcome,
    lifetimeDays,
    planVsTruth: {
      planLifetimeDays: plan.days,
      truthLifetimeDays: truth.days,
      planIsLowerBound: plan.lowerBound,
      truthIsLowerBound: truth.lowerBound,
      sunTookDays: plan.days - truth.days,
    },
    disposal,
    score: sc,
    causes,
    closest: closestDesign(design),
    missionCode: encodeMission(design),
    ...(ev ? { eventReplay: ev } : {}),
  };
}
