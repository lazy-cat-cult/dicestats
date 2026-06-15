import type { NamedValue, TaggedDie, PipelineValue, VectorFunction, ScalarFunction, ScalarBinaryOp } from '@/types';
import { matchConditions } from '@/domain/matching';

function applyVectorOp(source: TaggedDie[], op: VectorFunction): TaggedDie[] {
  if (op.fn === 'filter') {
    return source.filter((die) => matchConditions(die, op.conditions));
  }
  if (op.fn === 'remove') {
    return source.filter((die) => !matchConditions(die, op.conditions));
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

export function evaluatePipeline(
  rolled: TaggedDie[],
  pipeline: NamedValue[]
): Map<string, PipelineValue> {
  const env = new Map<string, PipelineValue>();
  env.set('rolled', rolled);

  for (const nv of pipeline) {
    const sourceVal = env.get(nv.source);
    if (sourceVal === undefined) continue;

    const op = nv.op;
    if (typeof op === 'object' && op !== null && 'fn' in op && (op.fn === 'filter' || op.fn === 'remove')) {
      if (!Array.isArray(sourceVal)) continue;
      env.set(nv.name, applyVectorOp(sourceVal as TaggedDie[], op as VectorFunction));
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
      if (op.fn === 'ceil') {
        env.set(nv.name, Math.ceil(sourceVal));
      } else if (op.fn === 'floor') {
        env.set(nv.name, Math.floor(sourceVal));
      } else if ((op as any).operand === 'literal') {
        env.set(nv.name, applyScalarBinary(sourceVal, op.fn as ScalarBinaryOp, (op as any).value as number));
      } else if ((op as any).operand === 'named') {
        const rightVal = env.get((op as any).source2 as string);
        if (typeof rightVal !== 'number') continue;
        env.set(nv.name, applyScalarBinary(sourceVal, op.fn as ScalarBinaryOp, rightVal));
      }
    }
  }

  return env;
}

export function getPipelineType(nv: NamedValue, pipeline: NamedValue[]): 'vector' | 'scalar' | null {
  let sourceType: 'vector' | 'scalar' | null = null;
  if (nv.source === 'rolled') {
    sourceType = 'vector';
  } else {
    const source = pipeline.find((p) => p.name === nv.source);
    if (!source) return null;
    sourceType = getPipelineType(source, pipeline);
    if (sourceType === 'vector') {
      if (source.op === 'count' || source.op === 'sum') sourceType = 'scalar';
    }
  }

  const op = nv.op;
  if (op === 'count' || op === 'sum' || op === 'max' || op === 'min') return 'scalar';
  if (typeof op === 'object' && op !== null) {
    if (op.fn === 'filter' || op.fn === 'remove') return 'vector';
    return 'scalar';
  }

  return sourceType;
}