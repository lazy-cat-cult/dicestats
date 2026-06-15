export type ConditionOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';

export type FaceValueSpecial = 'max_value' | 'min_value';

export type ConditionClause =
  | { field: 'face'; operator: ConditionOperator; value: number | FaceValueSpecial }
  | { field: 'tag'; operator: '=' | '!='; value: string };

export interface DiceTerm {
  id: string;
  count: number;
  sides: number;
  tag: string;
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
  | { fn: ScalarBinaryOp; operand: 'literal'; value: number }
  | { fn: ScalarBinaryOp; operand: 'named'; source2: string }
  | { fn: 'ceil' }
  | { fn: 'floor' }
  | { fn: 'max'; operand: 'named'; source2: string }
  | { fn: 'min'; operand: 'named'; source2: string };

export type ScalarLiteralOp = { fn: ScalarBinaryOp; operand: 'literal'; value: number };
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

export type ScalarCondition = {
  source: string;
  op: ConditionOperator;
  value: number;
};

export type DiceCondition = {
  source: string;
  op: DiceConditionType;
  subCondition: ConditionOperator;
  value: number;
};

export type OutcomeCondition = ScalarCondition | DiceCondition;

export interface Outcome {
  id: string;
  name: string;
  conditions: OutcomeCondition[];
  connector: 'and' | 'or';
  comment: string;
  isDefault: boolean;
}

export type ParameterTarget = 'pool.count' | 'pool.sides' | 'outcome.value' | 'pipeline.literal';

export interface Parameter {
  id: string;
  label: string;
  values: number[];
  target: ParameterTarget;
  targetTermId?: string;
  targetOutcomeId?: string;
  targetPipelineId?: string;
}

export interface OutcomeResult {
  label: string;
  probability: number;
  count: number;
}

export interface SimResult {
  label: string;
  outcomes: OutcomeResult[];
  totalRolls: number;
  distribution: Record<number, number>;
}

export interface SimJob {
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters?: Parameter[];
  iterations: number;
}

export interface PresetConfig {
  id: string;
  name: string;
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters?: Parameter[];
}

export interface SavedConfig {
  version: number;
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
  parameters: Parameter[];
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