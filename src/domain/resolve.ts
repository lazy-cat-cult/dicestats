import type { NamedValue, TaggedDie, PipelineValue, VectorFunction, ScalarFunction, ScalarBinaryOp, ScalarLiteralOp, ScalarNamedOp, ScalarCeilFloorOp, ScalarMaxMinNamedOp, Expr } from '@/types';
import { matchConditions } from '@/domain/matching';
import { evalExpr } from '@/utils/expression';

function applyVectorOp(source: TaggedDie[], op: VectorFunction, termsSides: { sides: number; tag: string }[]): TaggedDie[] {
  if (op.fn === 'filter') {
    return source.filter((die) => matchConditions(die, op.conditions, termsSides));
  }
  if (op.fn === 'remove') {
    return source.filter((die) => !matchConditions(die, op.conditions, termsSides));
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

function isScalarLiteralOp(op: ScalarFunction): op is ScalarLiteralOp {
  return typeof op === 'object' && op !== null && 'operand' in op && op.operand === 'literal';
}

function isScalarNamedOp(op: ScalarFunction): op is ScalarNamedOp {
  return typeof op === 'object' && op !== null && 'operand' in op && op.operand === 'named';
}

function isScalarCeilFloorOp(op: ScalarFunction): op is ScalarCeilFloorOp {
  return typeof op === 'object' && op !== null && (op.fn === 'ceil' || op.fn === 'floor');
}

function isScalarMaxMinNamedOp(op: ScalarFunction): op is ScalarMaxMinNamedOp {
  return typeof op === 'object' && op !== null && 'operand' in op && op.operand === 'named' && (op.fn === 'max' || op.fn === 'min');
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
      env.set(nv.name, applyVectorOp(sourceVal as TaggedDie[], op as VectorFunction, termsSides));
    } else if (op === 'count') {
      if (!Array.isArray(sourceVal)) continue;
      env.set(nv.name, (sourceVal as TaggedDie[]).length);
    } else if (op === 'sum') {
      if (!Array.isArray(sourceVal)) continue;
      env.set(nv.name, (sourceVal as TaggedDie[]).reduce((s, d) => s + d.face, 0));
    } else if (op === 'max') {
      if (!Array.isArray(sourceVal)) continue;
      const arr = sourceVal as TaggedDie[];
      env.set(nv.name, Math.max(...arr.map((d) => d.face)));
    } else if (op === 'min') {
      if (!Array.isArray(sourceVal)) continue;
      const arr = sourceVal as TaggedDie[];
      env.set(nv.name, Math.min(...arr.map((d) => d.face)));
    } else if (typeof op === 'object' && op !== null && 'fn' in op) {
      if (typeof sourceVal !== 'number') continue;
      if (isScalarCeilFloorOp(op)) {
        env.set(nv.name, op.fn === 'ceil' ? Math.ceil(sourceVal) : Math.floor(sourceVal));
      } else if (isScalarMaxMinNamedOp(op)) {
        const rightVal = env.get(op.source2);
        if (typeof rightVal !== 'number') continue;
        env.set(nv.name, op.fn === 'max' ? Math.max(sourceVal, rightVal) : Math.min(sourceVal, rightVal));
      } else if (isScalarLiteralOp(op)) {
        env.set(nv.name, applyScalarBinary(sourceVal, op.fn, evalExpr((op as { value: Expr }).value, vars)));
      } else if (isScalarNamedOp(op)) {
        const rightVal = env.get(op.source2);
        if (typeof rightVal !== 'number') continue;
        env.set(nv.name, applyScalarBinary(sourceVal, op.fn, rightVal));
      }
    }
  }

  return env;
}
