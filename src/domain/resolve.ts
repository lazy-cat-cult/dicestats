import type { NamedValue, TaggedDie, PipelineValue, VectorFunction, ScalarFunction, ScalarBinaryOp, ScalarBinaryTerm, ScalarCeilFloorOp, ScalarMaxMinNamedOp, SwitchBranch } from '@/types';
import { compare } from '@/types';
import { matchConditions } from '@/domain/matching';
import { evalExpr } from '@/utils/expression';

function applyVectorOp(source: TaggedDie[], op: VectorFunction, termsSides: { sides: number; tag: string }[], vars: { x: number; y: number }): TaggedDie[] {
  if (op.fn === 'filter') {
    return source.filter((die) => matchConditions(die, op.conditions, termsSides, vars));
  }
  if (op.fn === 'remove') {
    return source.filter((die) => !matchConditions(die, op.conditions, termsSides, vars));
  }
  return source;
}

function applyScalarBinary(left: number, op: ScalarBinaryOp, right: number): number {
  switch (op) {
    case 'add': return left + right;
    case 'subtract': return left - right;
    case 'multiply': return left * right;
    case 'divide': return right === 0 ? 0 : left / right;
  }
}

function applyScalarBinaryMultiTerm(sourceVal: number, fn: ScalarBinaryOp, terms: ScalarBinaryTerm[], env: Map<string, PipelineValue>, vars: { x: number; y: number }): number {
  if (terms.length === 0) return sourceVal;
  const firstTerm = terms[0]!;
  let result: number;
  if (firstTerm.operand === 'literal') {
    result = applyScalarBinary(sourceVal, fn, evalExpr(firstTerm.value, vars));
  } else {
    const rightVal = env.get(firstTerm.source2);
    if (typeof rightVal !== 'number') return sourceVal;
    result = applyScalarBinary(sourceVal, fn, rightVal);
  }
  for (let i = 1; i < terms.length; i++) {
    const term = terms[i]!;
    if (term.operand === 'literal') {
      result = applyScalarBinary(result, fn, evalExpr(term.value, vars));
    } else {
      const rightVal = env.get(term.source2);
      if (typeof rightVal !== 'number') return result;
      result = applyScalarBinary(result, fn, rightVal);
    }
  }
  return result;
}

function applySwitch(
  sourceVal: number,
  branches: SwitchBranch[],
  env: Map<string, PipelineValue>,
  vars: { x: number; y: number }
): number {
  for (const branch of branches) {
    const condValue = env.get(branch.condition.source);
    if (typeof condValue !== 'number') continue;

    let matched = false;
    const op = branch.condition.op;

    if (op === 'is_even') {
      matched = condValue % 2 === 0;
    } else if (op === 'is_odd') {
      matched = condValue % 2 !== 0;
    } else if (branch.condition.value) {
      const exprVal = evalExpr(branch.condition.value, vars);
      matched = compare(condValue, op, exprVal);
    }

    if (!matched) continue;

    if (branch.value.operand === 'literal') {
      return evalExpr(branch.value.value, vars);
    }
    const namedVal = env.get(branch.value.source2);
    if (typeof namedVal !== 'number') continue;
    return namedVal;
  }

  return sourceVal;
}

function isScalarCeilFloorOp(op: ScalarFunction): op is ScalarCeilFloorOp {
  return typeof op === 'object' && op !== null && (op.fn === 'ceil' || op.fn === 'floor');
}

function isScalarMaxMinNamedOp(op: ScalarFunction): op is ScalarMaxMinNamedOp {
  return typeof op === 'object' && op !== null && 'operand' in op && op.operand === 'named' && (op.fn === 'max' || op.fn === 'min');
}

function isScalarSwitchOp(op: ScalarFunction): op is { fn: 'switch'; branches: SwitchBranch[] } {
  return typeof op === 'object' && op !== null && 'fn' in op && op.fn === 'switch' && 'branches' in op;
}

function isScalarBinaryTermsOp(op: ScalarFunction): op is { fn: ScalarBinaryOp; terms: ScalarBinaryTerm[] } {
  return typeof op === 'object' && op !== null && 'terms' in op && Array.isArray(op.terms);
}

export function evaluatePipeline(
  rolled: TaggedDie[],
  pipeline: NamedValue[],
  vars: { x: number; y: number } = { x: 0, y: 0 },
  termsSides: { sides: number; tag: string }[] = []
): Map<string, PipelineValue> {
  const env = new Map<string, PipelineValue>();
  env.set('rolled', rolled);

  for (const nv of pipeline) {
    const sourceVal = env.get(nv.source);
    if (sourceVal === undefined) continue;

    const op = nv.op;
    if (typeof op === 'object' && op !== null && 'fn' in op && (op.fn === 'filter' || op.fn === 'remove')) {
      if (!Array.isArray(sourceVal)) continue;
      env.set(nv.name, applyVectorOp(sourceVal as TaggedDie[], op as VectorFunction, termsSides, vars));
    } else if (op === 'count') {
      if (!Array.isArray(sourceVal)) continue;
      env.set(nv.name, (sourceVal as TaggedDie[]).length);
    } else if (op === 'sum') {
      if (!Array.isArray(sourceVal)) continue;
      env.set(nv.name, (sourceVal as TaggedDie[]).reduce((s, d) => s + d.face, 0));
    } else if (op === 'max') {
      if (!Array.isArray(sourceVal)) continue;
      const arr = sourceVal as TaggedDie[];
      env.set(nv.name, arr.length === 0 ? 0 : Math.max(...arr.map((d) => d.face)));
    } else if (op === 'min') {
      if (!Array.isArray(sourceVal)) continue;
      const arr = sourceVal as TaggedDie[];
      env.set(nv.name, arr.length === 0 ? 0 : Math.min(...arr.map((d) => d.face)));
    } else if (op === 'sub') {
      if (!Array.isArray(sourceVal)) continue;
      const arr = sourceVal as TaggedDie[];
      if (arr.length === 0) { env.set(nv.name, 0); continue; }
      env.set(nv.name, arr.slice(1).reduce((s, d) => s - d.face, arr[0]!.face));
    } else if (typeof op === 'object' && op !== null && 'fn' in op) {
      if (typeof sourceVal !== 'number') continue;
      if (isScalarCeilFloorOp(op)) {
        env.set(nv.name, op.fn === 'ceil' ? Math.ceil(sourceVal) : Math.floor(sourceVal));
      } else if (isScalarMaxMinNamedOp(op)) {
        const rightVal = env.get(op.source2);
        if (typeof rightVal !== 'number') continue;
        env.set(nv.name, op.fn === 'max' ? Math.max(sourceVal, rightVal) : Math.min(sourceVal, rightVal));
      } else if (isScalarSwitchOp(op)) {
        env.set(nv.name, applySwitch(sourceVal, op.branches, env, vars));
      } else if (isScalarBinaryTermsOp(op)) {
        env.set(nv.name, applyScalarBinaryMultiTerm(sourceVal, op.fn, op.terms, env, vars));
      }
    }
  }

  return env;
}
