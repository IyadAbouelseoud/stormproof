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
}

const req = (id: Requirement['id'], value: number, target: number, unit: string, sense: 'max' | 'min'): Requirement => ({
  id, value, target, unit, sense, met: sense === 'max' ? value <= target : value >= target,
});

/** Requirements first (revisit, GSD, data delivered, lifetime, cost), then a Sun-resilience bonus. */
export function score(s: Scenario, x: ScoreInputs): Score {
  const requirements = [
    req('revisit', Math.round(x.revisitDays * 10) / 10, s.revisitMaxDays, 'days', 'max'),
    req('gsd', Math.round(x.gsdM * 10) / 10, s.gsdMaxM, 'm', 'max'),
    req('data-delivered', Math.round(x.dataDeliveredGB), s.dataDeliveredMinGB, 'GB', 'min'),
    req('lifetime', Math.round(x.lifetimeDays), s.lifetimeMinDays, 'days', 'min'),
    req('cost', Math.round(x.costUsd), s.budgetUsd, 'USD', 'max'),
  ];
  const met = requirements.filter((r) => r.met).length;
  const total = Math.round(met * SCORE_PER_REQUIREMENT + SCORE_SUN_RESILIENCE * Math.max(0, Math.min(1, x.truthOverPlan)));
  return { requirements, requirementsMet: met, total };
}
