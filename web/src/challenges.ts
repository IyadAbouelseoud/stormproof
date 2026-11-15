/** Prompt H7: challenge cards (content/demo/challenges.json) and their pure check against a SimResult. */
import { create } from 'zustand';
import type { SimResult } from '@stormproof/engine';
import challengesJson from '../../content/demo/challenges.json';

export type ChallengeRule =
  | { kind: 'reentryAfter'; date: string; maxCostUsd: number }
  | { kind: 'allGoals'; launchYear?: number; launchMonth?: string };

export interface Challenge {
  id: string;
  rule: ChallengeRule;
  title: { en: string; ar: string };
  text: { en: string; ar: string };
  start: string;
  solution: string;
}

export const CHALLENGES = (challengesJson as unknown as { challenges: Challenge[] }).challenges;

/** Reentry date, or the predicted one when still flying (forecast end counts as later than any date). */
const endDate = (r: SimResult): string =>
  r.outcome.kind === 'reentered' ? r.outcome.date : r.outcome.kind === 'alive' ? r.outcome.predictedReentry : '9999-12-31';

export function challengeMet(c: Challenge, r: SimResult): boolean {
  const rule = c.rule;
  if (rule.kind === 'reentryAfter') return endDate(r) > rule.date && r.gauges.budget.value <= rule.maxCostUsd;
  const plannedYear = Number(r.design.launchDate.slice(0, 4));
  if (rule.launchYear !== undefined && plannedYear !== rule.launchYear) return false;
  if (rule.launchMonth !== undefined && !r.design.launchDate.startsWith(rule.launchMonth)) return false;
  return r.score.requirements.every((q) => q.met);
}

export const useChallenge = create<{ active: string | null; setActive: (id: string | null) => void }>((set) => ({
  active: null,
  setActive: (active) => set({ active }),
}));
