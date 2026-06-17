import type { Outcome, OutcomeCondition, TaggedDie, PipelineValue, DiceConditionType, ConditionOperator, Expr } from '@/types';
import { compare, DICE_CONDITION_TYPES, NOT_MATCHED_LABEL } from '@/types';
import { evalExpr } from '@/utils/expression';

function evaluateCondition(cond: OutcomeCondition, env: Map<string, PipelineValue>, vars: { x: number; y: number }): boolean {
  const sourceValue = env.get(cond.source);
  if (sourceValue === undefined) return false;

  if (DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType)) {
    const diceCond = cond as { op: DiceConditionType; subCondition: ConditionOperator; value: Expr };
    if (!Array.isArray(sourceValue)) return false;
    const dice = sourceValue as TaggedDie[];
    const threshold = evalExpr(diceCond.value, vars);
    const results = dice.map((die) => compare(die.face, diceCond.subCondition, threshold));
    if (diceCond.op === 'any') return results.some(Boolean);
    if (diceCond.op === 'all') return results.every(Boolean);
    return !results.some(Boolean);
  }
  if (typeof sourceValue === 'number') {
    const sc = cond as { op: ConditionOperator; value: Expr };
    return compare(sourceValue, sc.op, evalExpr(sc.value, vars));
  }
  return false;
}

export function evaluateOutcome(
  outcome: Outcome,
  env: Map<string, PipelineValue>,
  vars: { x: number; y: number } = { x: 0, y: 0 }
): boolean {
  if (outcome.conditions.length === 0) return false;

  const results = outcome.conditions.map((cond) => evaluateCondition(cond, env, vars));

  if (outcome.connector === 'and') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

export function evaluateOutcomes(
  outcomes: Outcome[],
  env: Map<string, PipelineValue>,
  vars: { x: number; y: number } = { x: 0, y: 0 }
): string[] {
  const matched: string[] = [];
  for (const outcome of outcomes) {
    if (evaluateOutcome(outcome, env, vars)) {
      matched.push(outcome.name);
    }
  }
  if (matched.length === 0) {
    matched.push(NOT_MATCHED_LABEL);
  }
  return matched;
}
