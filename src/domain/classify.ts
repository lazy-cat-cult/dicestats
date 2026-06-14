import type { Outcome, OutcomeCondition, TaggedDie, PipelineValue, ConditionChain, ConditionClause } from '@/types';
import { compare } from '@/types';

function matchClause(die: TaggedDie, clause: ConditionClause): boolean {
  if (clause.field === 'face') {
    return compare(die.face, clause.operator, clause.value);
  }
  if (clause.field === 'tag') {
    if (clause.operator === '=') return die.tag === clause.value;
    if (clause.operator === '!=') return die.tag !== clause.value;
  }
  return false;
}

function matchConditions(die: TaggedDie, chain: ConditionChain): boolean {
  if (chain.clauses.length === 0) return false;
  if (chain.connector === 'and') {
    return chain.clauses.every((c) => matchClause(die, c));
  }
  return chain.clauses.some((c) => matchClause(die, c));
}

function evaluateCondition(sourceValue: PipelineValue, cond: OutcomeCondition): boolean {
  if (cond === 'none?') {
    return Array.isArray(sourceValue) && sourceValue.length === 0;
  }
  if (cond === 'any?') {
    return Array.isArray(sourceValue) && sourceValue.length > 0;
  }
  if (typeof cond === 'object' && 'op' in cond) {
    if (cond.op === 'all?') {
      if (!Array.isArray(sourceValue)) return false;
      return (sourceValue as TaggedDie[]).every((die) => compare(die.face, cond.subCondition, cond.value));
    }
    if (typeof sourceValue === 'number') {
      return compare(sourceValue, cond.op as import('@/types').ConditionOperator, cond.value);
    }
  }
  return false;
}

export function evaluateOutcome(
  outcome: Outcome,
  env: Map<string, PipelineValue>
): boolean {
  const sourceValue = env.get(outcome.source);
  if (sourceValue === undefined) return false;

  if (outcome.conditions.length === 0) return outcome.isDefault;

  const results = outcome.conditions.map((cond) => evaluateCondition(sourceValue, cond));

  if (outcome.connector === 'and') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

export function evaluateOutcomes(
  outcomes: Outcome[],
  env: Map<string, PipelineValue>
): string | null {
  for (const outcome of outcomes) {
    if (evaluateOutcome(outcome, env)) {
      return outcome.name;
    }
  }
  const defaultOutcome = outcomes.find((o) => o.isDefault);
  return defaultOutcome?.name ?? null;
}