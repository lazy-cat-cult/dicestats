import type { Outcome, OutcomeCondition, TaggedDie, PipelineValue, DiceConditionType, ConditionOperator } from '@/types';
import { compare, DICE_CONDITION_TYPES } from '@/types';

function evaluateCondition(sourceValue: PipelineValue, cond: OutcomeCondition): boolean {
  if (typeof cond === 'object' && 'op' in cond) {
    if (DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType)) {
      const diceCond = cond as { op: DiceConditionType; subCondition: ConditionOperator; value: number };
      if (!Array.isArray(sourceValue)) return false;
      const dice = sourceValue as TaggedDie[];
      const results = dice.map((die) => compare(die.face, diceCond.subCondition, diceCond.value));
      if (diceCond.op === 'any') return results.some(Boolean);
      if (diceCond.op === 'all') return results.every(Boolean);
      return !results.some(Boolean);
    }
    if (typeof sourceValue === 'number') {
      return compare(sourceValue, cond.op as ConditionOperator, cond.value);
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