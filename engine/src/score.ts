import type { Requirement, Score } from './contracts';
import type { Scenario } from './catalog';

/** Score weights. game-balanced. */
export const SCORE_PER_REQUIREMENT = 16;
export const SCORE_SUN_RESILIENCE = 20;

export interface ScoreInputs {
  revisitDays: number;
  gsdM: number;
  dataDeliveredGB: number;
  lifetimeDays: number;
  costUsd: number;
  /** truth lifetime / plan lifetime (1 = the real Sun cost nothing). */
  truthOverPlan: number;
  /** Event look (prompt E2): days to the first useful look, or null; only scored if the scenario asks for it. */
  eventLookDays?: number | null;
}

export const DEFAULT_REQUIREMENTS: Requirement['id'][] = ['revisit', 'gsd', 'data-delivered', 'lifetime', 'cost'];

const req = (id: Requirement['id'], value: number, target: number, unit: string, sense: 'max' | 'min'): Requirement => ({
  id, value, target, unit, sense, met: sense === 'max' ? value <= target : value >= target,
});

/** Requirements first (revisit, GSD, data delivered, lifetime, cost), then a Sun-resilience bonus. */
export function score(s: Scenario, x: ScoreInputs): Score {
  const all: Record<Requirement['id'], () => Requirement> = {
    revisit: () => req('revisit', Math.round(x.revisitDays * 10) / 10, s.revisitMaxDays, 'days', 'max'),
    gsd: () => req('gsd', Math.round(x.gsdM * 10) / 10, s.gsdMaxM, 'm', 'max'),
    'data-delivered': () => req('data-delivered', Math.round(x.dataDeliveredGB), s.dataDeliveredMinGB, 'GB', 'min'),
    lifetime: () => req('lifetime', Math.round(x.lifetimeDays), s.lifetimeMinDays, 'days', 'min'),
    cost: () => req('cost', Math.round(x.costUsd), s.budgetUsd, 'USD', 'max'),
    // No useful look: value -1 (shown as "none"), never met.
    'event-look': () => {
      const d = x.eventLookDays ?? null;
      const r = req('event-look', d ?? -1, s.lookWindowDays ?? 0, 'days', 'max');
      return d === null ? { ...r, met: false } : r;
    },
  };
  const requirements = (s.requirementSet ?? DEFAULT_REQUIREMENTS).map((id) => all[id]());
  const met = requirements.filter((r) => r.met).length;
  // Weight rescaled so a perfect score stays 100: 5 x 16 = 80 requirement points for any count (Angola: 16 each, unchanged).
  const per = (SCORE_PER_REQUIREMENT * DEFAULT_REQUIREMENTS.length) / requirements.length;
  const total = Math.round(met * per + SCORE_SUN_RESILIENCE * Math.max(0, Math.min(1, x.truthOverPlan)));
  return { requirements, requirementsMet: met, total };
}
