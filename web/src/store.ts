import { create } from 'zustand';
import type { FormFactor, OrbitType, PartSlot, RoleId, StormPolicy } from '@stormproof/engine';
import {
  defaultDesign,
  simulate,
  simulatePlan,
  type MissionDesign,
  type SimResult,
} from './engineAdapter';

export const ROLES: readonly RoleId[] = ['systems-lead', 'science', 'power-spacecraft', 'orbit-comms'];

/** One flown mission: truth result plus the same design on the plan Sun. */
export interface Flight {
  design: MissionDesign;
  truth: SimResult;
  plan: SimResult;
}

export type Votes = Partial<Record<RoleId, StormPolicy>>;

export interface MissionState {
  design: MissionDesign;
  /** Live result of the current design (truth mode). */
  result: SimResult;
  /** Result before the last change (for the knock-on trail and gauge animation). */
  prevResult: SimResult | null;
  /** Which part slot / control caused the last change (for the trail). */
  lastChange: PartSlot | 'formFactor' | null;
  flight: Flight | null;
  /** Re-fly baseline (first flight kept when "change one thing" is pressed). */
  baseline: Flight | null;
  /** Storm vote has been taken for the current flight. */
  stormVoted: boolean;

  teamMode: boolean;
  names: Partial<Record<RoleId, string>>;
  votes: Votes;

  refresh: () => void;
  setPart: (slot: PartSlot, id: string) => void;
  setFormFactor: (ff: FormFactor) => void;
  setOrbitType: (t: OrbitType) => void;
  setAltitude: (km: number) => void;
  setRocket: (id: string) => void;
  setLaunchDate: (iso: string) => void;
  launch: () => void;
  setStormPolicy: (p: StormPolicy) => void;
  castVote: (role: RoleId, p: StormPolicy) => void;
  keepBaseline: () => void;
  clearBaseline: () => void;
  setTeamMode: (on: boolean) => void;
  setName: (role: RoleId, name: string) => void;
  loadDesign: (d: MissionDesign) => void;
  /** Switch scenario: loads that scenario's starting design (F1). */
  setScenario: (id: string) => void;
}

const truthOf = (d: MissionDesign): MissionDesign => ({ ...d, mode: 'truth' });

function withRoles(d: MissionDesign, team: boolean, names: Partial<Record<RoleId, string>>): MissionDesign {
  if (!team) {
    const { roles: _roles, ...rest } = d;
    return rest;
  }
  return { ...d, roles: { ...names } };
}

/** Majority of the cast votes; a tie is broken by the systems lead (ride-out if they did not vote). */
export function majority(votes: Votes): StormPolicy {
  let safe = 0;
  let ride = 0;
  for (const r of ROLES) {
    if (votes[r] === 'safe-mode') safe++;
    else if (votes[r] === 'ride-out') ride++;
  }
  if (safe > ride) return 'safe-mode';
  if (ride > safe) return 'ride-out';
  return votes['systems-lead'] ?? 'ride-out';
}

export const useMission = create<MissionState>((set, get) => {
  const d0 = defaultDesign();
  const change = (next: MissionDesign, lastChange: MissionState['lastChange']) => {
    const prev = get().result;
    set({ design: next, result: simulate(truthOf(next)), prevResult: prev, lastChange });
  };
  return {
    design: d0,
    result: simulate(truthOf(d0)),
    prevResult: null,
    lastChange: null,
    flight: null,
    baseline: null,
    stormVoted: false,
    teamMode: false,
    names: {},
    votes: {},

    refresh: () => {
      const { design } = get();
      set({ result: simulate(truthOf(design)), prevResult: null, lastChange: null });
    },
    setPart: (slot, id) => {
      const d = get().design;
      if (d.parts[slot] === id) return;
      change({ ...d, parts: { ...d.parts, [slot]: id } }, slot);
    },
    setFormFactor: (ff) => {
      const d = get().design;
      if (d.formFactor === ff) return;
      change({ ...d, formFactor: ff }, 'formFactor');
    },
    setOrbitType: (t) => {
      const d = get().design;
      if (d.orbit.type === t) return;
      change({ ...d, orbit: { ...d.orbit, type: t } }, null);
    },
    setAltitude: (km) => {
      const d = get().design;
      if (d.orbit.altitudeKm === km) return;
      change({ ...d, orbit: { ...d.orbit, altitudeKm: km } }, null);
    },
    setRocket: (id) => {
      const d = get().design;
      if (d.rocketId === id) return;
      change({ ...d, rocketId: id }, null);
    },
    setLaunchDate: (iso) => {
      const d = get().design;
      if (d.launchDate === iso) return;
      change({ ...d, launchDate: iso }, null);
    },
    launch: () => {
      const { design, teamMode, names } = get();
      const d = truthOf(withRoles(design, teamMode, names));
      set({
        flight: { design: d, truth: simulate(d), plan: simulatePlan(d) },
        stormVoted: false,
        votes: {},
      });
    },
    setStormPolicy: (p) => {
      const { design, flight } = get();
      const d = { ...design, stormPolicy: p };
      const patch: Partial<MissionState> = { design: d, result: simulate(truthOf(d)), stormVoted: true };
      if (flight) {
        const fd = { ...flight.design, stormPolicy: p };
        patch.flight = { design: fd, truth: simulate(fd), plan: simulatePlan(fd) };
      }
      set(patch);
    },
    castVote: (role, p) => {
      const votes = { ...get().votes, [role]: p };
      set({ votes });
      if (ROLES.every((r) => votes[r])) get().setStormPolicy(majority(votes));
    },
    keepBaseline: () => {
      const f = get().flight;
      if (f) set({ baseline: f });
    },
    clearBaseline: () => set({ baseline: null }),
    setTeamMode: (on) => set({ teamMode: on }),
    setName: (role, name) => set({ names: { ...get().names, [role]: name } }),
    setScenario: (id) => {
      if (get().design.scenarioId === id) return;
      const d = defaultDesign(id);
      set({ design: d, result: simulate(truthOf(d)), prevResult: null, lastChange: null, flight: null, baseline: null });
    },
    loadDesign: (d) => {
      set({ design: d, result: simulate(truthOf(d)), prevResult: null, lastChange: null, flight: null });
    },
  };
});
