import type { FitVerdict, MissionDesign } from './contracts';
import type { Content, Part, Rocket, Scenario } from './catalog';
import { BUS, FORM_FACTOR_MAX_KG, FORM_FACTOR_UNITS } from './catalog';
import { CML_MARGIN_PCT } from './constants';
import { msg, r1 } from './msg';
import type { PowerBudget } from './power';

export interface Resolved {
  parts: Part[];
  byslot: Record<string, Part>;
  rocket: Rocket;
  scenario: Scenario;
  massKg: number;
  units: number;
  partsCostUsd: number;
  launchCostUsd: number;
  costUsd: number;
}

/** Look up the design's parts, rocket and scenario; throws on an unknown id. */
export function resolveDesign(design: MissionDesign, content: Content): Resolved {
  const byslot: Record<string, Part> = {};
  const parts: Part[] = [];
  for (const [slot, id] of Object.entries(design.parts)) {
    const p = content.parts.find((x) => x.id === id && x.slot === slot);
    if (!p) throw new Error(`unknown part ${slot}:${id}`);
    byslot[slot] = p;
    parts.push(p);
  }
  const rocket = content.rockets.find((r) => r.id === design.rocketId);
  if (!rocket) throw new Error(`unknown rocket ${design.rocketId}`);
  const scenario = content.scenarios.find((s) => s.id === design.scenarioId);
  if (!scenario) throw new Error(`unknown scenario ${design.scenarioId}`);
  const bus = BUS[design.formFactor];
  const massKg = bus.massKg + parts.reduce((s, p) => s + p.massKg, 0);
  const units = bus.units + parts.reduce((s, p) => s + p.units, 0);
  const partsCostUsd = bus.costUsd + parts.reduce((s, p) => s + p.costUsd, 0);
  const launchCostUsd = massKg * rocket.priceUsdPerKg;
  return { parts, byslot, rocket, scenario, massKg, units, partsCostUsd, launchCostUsd, costUsd: partsCostUsd + launchCostUsd };
}

export interface FitInputs {
  design: MissionDesign;
  res: Resolved;
  power: PowerBudget;
  dataGenMBPerDay: number;
  downlinkMBPerDay: number;
  passesPerDay: number;
}

/** Fit check: one verdict per check (disposal is added by rules.ts after the flight). */
export function fitCheck(x: FitInputs): FitVerdict[] {
  const { design, res, power } = x;
  const ff = design.formFactor;
  const maxKg = FORM_FACTOR_MAX_KG[ff];
  const maxU = FORM_FACTOR_UNITS[ff];
  const alt = design.orbit.altitudeKm;
  const v: FitVerdict[] = [];

  v.push(res.massKg <= maxKg
    ? { check: 'mass', pass: true, reason: msg('fit.mass.ok', `${r1(res.massKg)} kg fits the ${maxKg} kg ${ff} limit.`, { value: r1(res.massKg), limit: maxKg }) }
    : { check: 'mass', pass: false, reason: msg('fit.mass.over', `${r1(res.massKg)} kg is over the ${maxKg} kg limit for a ${ff}. Remove ${r1(res.massKg - maxKg)} kg or pick a bigger satellite.`, { value: r1(res.massKg), limit: maxKg }) });

  v.push(res.units <= maxU
    ? { check: 'volume', pass: true, reason: msg('fit.volume.ok', `Parts take ${r1(res.units)} of ${maxU} U.`, { value: r1(res.units), limit: maxU }) }
    : { check: 'volume', pass: false, reason: msg('fit.volume.over', `Parts need ${r1(res.units)} U but a ${ff} has ${maxU} U.`, { value: r1(res.units), limit: maxU }) });

  v.push(power.marginPct >= CML_MARGIN_PCT
    ? { check: 'power', pass: true, reason: msg('fit.power.ok', `Panels make ${r1(power.genW)} W for a ${r1(power.loadW)} W load (${r1(power.marginPct)}% margin).`, { gen: r1(power.genW), load: r1(power.loadW) }) }
    : { check: 'power', pass: false, reason: msg('fit.power.low', `Panels make ${r1(power.genW)} W for a ${r1(power.loadW)} W load: ${r1(power.marginPct)}% margin, ${CML_MARGIN_PCT}% needed. Add panel area or cut load.`, { gen: r1(power.genW), load: r1(power.loadW), margin: r1(power.marginPct), need: CML_MARGIN_PCT }) });

  v.push(power.energyMarginPct >= CML_MARGIN_PCT
    ? { check: 'energy', pass: true, reason: msg('fit.energy.ok', `The battery covers each ${r1(power.eclipseMin)} min eclipse with ${r1(power.energyMarginPct)}% margin.`, { min: r1(power.eclipseMin) }) }
    : { check: 'energy', pass: false, reason: msg('fit.energy.low', `Each ${r1(power.eclipseMin)} min eclipse needs ${r1(power.eclipseNeedWh)} Wh; the battery safely gives ${r1(power.usableWh)} Wh (${CML_MARGIN_PCT}% margin needed).`, { need: r1(power.eclipseNeedWh), usable: r1(power.usableWh) }) });

  const budget = res.scenario.budgetUsd;
  v.push(res.costUsd <= budget
    ? { check: 'budget', pass: true, reason: msg('fit.budget.ok', `USD ${Math.round(res.costUsd).toLocaleString('en-US')} of USD ${budget.toLocaleString('en-US')}.`, { value: Math.round(res.costUsd), limit: budget }) }
    : { check: 'budget', pass: false, reason: msg('fit.budget.over', `Costs USD ${Math.round(res.costUsd).toLocaleString('en-US')}, over the USD ${budget.toLocaleString('en-US')} budget.`, { value: Math.round(res.costUsd), limit: budget }) });

  v.push(x.dataGenMBPerDay <= x.downlinkMBPerDay
    ? { check: 'data', pass: true, reason: msg('fit.data.ok', `${Math.round(x.dataGenMBPerDay)} MB/day made, ${Math.round(x.downlinkMBPerDay)} MB/day can come down.`, { gen: Math.round(x.dataGenMBPerDay), cap: Math.round(x.downlinkMBPerDay) }) }
    : { check: 'data', pass: false, reason: msg('fit.data.over', `The camera makes ${Math.round(x.dataGenMBPerDay)} MB/day but only ${Math.round(x.downlinkMBPerDay)} MB/day can come down: images will be lost.`, { gen: Math.round(x.dataGenMBPerDay), cap: Math.round(x.downlinkMBPerDay) }) });

  v.push(x.passesPerDay >= 1
    ? { check: 'comms', pass: true, reason: msg('fit.comms.ok', `About ${x.passesPerDay} passes a day over Funda (approximate site).`, { passes: x.passesPerDay }) }
    : { check: 'comms', pass: false, reason: msg('fit.comms.none', 'This orbit never passes over the Funda ground station.', {}) });

  const r = res.rocket;
  v.push(res.massKg <= r.capacityKg
    ? { check: 'rocket-capacity', pass: true, reason: msg('fit.rocket.capacity.ok', `${r.name} can carry ${r.capacityKg} kg.`, { rocket: r.name, cap: r.capacityKg }) }
    : { check: 'rocket-capacity', pass: false, reason: msg('fit.rocket.capacity.over', `${r.name} carries only ${r.capacityKg} kg.`, { rocket: r.name, cap: r.capacityKg }) });

  const orbitOk = r.orbits.includes(design.orbit.type) && alt >= r.minAltKm && alt <= r.maxAltKm;
  const orbitName = design.orbit.type === 'SSO' ? 'sun-synchronous' : '51.6 deg';
  v.push(orbitOk
    ? { check: 'rocket-orbit', pass: true, reason: msg('fit.rocket.orbit.ok', `${r.name} reaches ${alt} km ${orbitName}.`, { rocket: r.name, alt }) }
    : { check: 'rocket-orbit', pass: false, reason: msg('fit.rocket.orbit.no', `${r.name} flies ${r.orbits.join('/')} at ${r.minAltKm}-${r.maxAltKm} km, not ${alt} km ${orbitName}.`, { rocket: r.name, alt, min: r.minAltKm, max: r.maxAltKm }) });

  const d = design.launchDate;
  const inTimeline = d >= '2015-01-01' && d <= '2026-12-31';
  const afterFirst = d >= r.firstFlight;
  v.push(inTimeline && afterFirst
    ? { check: 'launch-window', pass: true, reason: msg('fit.launch.window.ok', `Launch on ${d} is possible.`, { date: d }) }
    : { check: 'launch-window', pass: false, reason: !inTimeline
        ? msg('fit.launch.window.range', 'Pick a launch date between 2015 and 2026.', {})
        : msg('fit.launch.window.first', `${r.name} first flew on ${r.firstFlight}.`, { rocket: r.name, first: r.firstFlight }) });
  return v;
}
