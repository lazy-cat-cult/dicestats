import type { Outcome, OutcomeCondition, TaggedDie, PipelineValue, DiceConditionType, ConditionOperator } from '@/types';
import { compare, DICE_CONDITION_TYPES } from '@/types';

function evaluateCondition(cond: OutcomeCondition, env: Map<string, PipelineValue>): boolean {
  const sourceValue = env.get(cond.source);
  if (sourceValue === undefined) return false;

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
    const sc = cond as { op: ConditionOperator; value: number };
    return compare(sourceValue, sc.op, sc.value);
  }
  return false;
}

export function evaluateOutcome(
  outcome: Outcome,
  env: Map<string, PipelineValue>
): boolean {
  if (outcome.conditions.length === 0) return outcome.isDefault;

  const results = outcome.conditions.map((cond) => evaluateCondition(cond, env));

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
