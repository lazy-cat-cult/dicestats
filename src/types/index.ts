import type { Expr } from '@/utils/expression';

export type { Expr, ExprOp } from '@/utils/expression';
export {
  parseExpr,
  evalExpr,
  exprToString,
  exprToInteger,
  literalExpr,
  parseValues,
  normalizeSweepValues,
} from '@/utils/expression';

export type ConditionOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';

export type FaceValueSpecial = 'max_value' | 'min_value';

export type ConditionClause =
  | { field: 'face'; operator: ConditionOperator; value: number | FaceValueSpecial }
  | { field: 'tag'; operator: '=' | '!='; value: string };

export interface DiceTerm {
  id: string;
  count: Expr;
  sides: Expr;
  tag: string;
  comment: string;
}

export interface DicePool {
  terms: DiceTerm[];
}

export type RerollAction = 'reroll' | 'explode';

export interface ConditionChain {
  clauses: ConditionClause[];
  connector: 'and' | 'or';
}

export interface RerollCondition {
  id: string;
  action: RerollAction;
  conditions: ConditionChain;
  repeat: number;
  comment: string;
}

export type VectorFunction =
  | { fn: 'filter'; conditions: ConditionChain }
  | { fn: 'remove'; conditions: ConditionChain };

export type ScalarBinaryOp = 'add' | 'subtract' | 'multiply' | 'divide';

export type ScalarFunction =
  | 'count'
  | 'sum'
  | 'max'
  | 'min'
  | { fn: ScalarBinaryOp; operand: 'literal'; value: Expr }
  | { fn: ScalarBinaryOp; operand: 'named'; source2: string }
  | { fn: 'ceil' }
  | { fn: 'floor' }
  | { fn: 'max'; operand: 'named'; source2: string }
  | { fn: 'min'; operand: 'named'; source2: string };

export type ScalarLiteralOp = { fn: ScalarBinaryOp; operand: 'literal'; value: Expr };
export type ScalarNamedOp = { fn: ScalarBinaryOp; operand: 'named'; source2: string };
export type ScalarCeilFloorOp = { fn: 'ceil' | 'floor' };
export type ScalarMaxMinNamedOp = { fn: 'max' | 'min'; operand: 'named'; source2: string };
export type ScalarObjectFunction =
  | ScalarLiteralOp
  | ScalarNamedOp
  | ScalarCeilFloorOp
  | ScalarMaxMinNamedOp;

export type NamedValue =
  | { id: string; name: string; source: string; op: VectorFunction; comment: string }
  | { id: string; name: string; source: string; op: ScalarFunction; comment: string };

export type DiceConditionType = 'any' | 'all' | 'none';

export const DICE_CONDITION_TYPES: DiceConditionType[] = ['any', 'all', 'none'];

export const NOT_MATCHED_LABEL = 'Not matched';

export type ScalarCondition = {
  source: string;
  op: ConditionOperator;
  value: Expr;
};

export type DiceCondition = {
  source: string;
  op: DiceConditionType;
  subCondition: ConditionOperator;
  value: Expr;
};

export type OutcomeCondition = ScalarCondition | DiceCondition;

export interface Outcome {
  id: string;
  name: string;
  conditions: OutcomeCondition[];
  connector: 'and' | 'or';
  comment: string;
}

export interface SweepParameters {
  x: number[];
  y: number[] | null;
}

export interface OutcomeResult {
  label: string;
  probability: number;
  count: number;
}

export interface OutcomeOverlap {
  outcomes: [string, string];
  count: number;
  probability: number;
}

export interface MatchSetCount {
  outcomes: string[];
  count: number;
  probability: number;
}

export interface SimResult {
  label: string;
  outcomes: OutcomeResult[];
  overlaps: OutcomeOverlap[];
  matchSets: MatchSetCount[];
  totalRolls: number;
  distribution: Record<number, number>;
  sweepX?: number | null;
  sweepY?: number | null;
}

export interface SimJob {
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  sweep: SweepParameters;
  iterations: number;
  taskName?: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  sweep: SweepParameters;
}

export interface SavedConfig {
  version: 8;
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  sweep: SweepParameters;
}

export interface TaggedDie {
  face: number;
  tag: string;
}

export type PipelineValue = TaggedDie[] | number;

export function compare(a: number, op: ConditionOperator, b: number): boolean {
  switch (op) {
    case '>=': return a >= b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '<': return a < b;
    case '=': return a === b;
    case '!=': return a !== b;
  }
}
