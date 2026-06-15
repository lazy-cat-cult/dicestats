import type { DicePool, RerollCondition, NamedValue, Outcome, Parameter, PipelineValue, ConditionClause, ConditionChain, ScalarFunction, VectorFunction, OutcomeCondition, ConditionOperator, DiceConditionType } from '@/types';
import { DICE_CONDITION_TYPES } from '@/types';

export interface ValidationError {
  id: string;
  message: string;
  blocking: boolean;
}

export function isScalarCondition(cond: OutcomeCondition): cond is { op: ConditionOperator; value: number } {
  if (typeof cond !== 'object' || cond === null) return false;
  if (!('op' in cond)) return false;
  return !DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
}

export function isBinaryMathLiteral(nv: NamedValue): boolean {
  const op = nv.op;
  if (typeof op !== 'object' || op === null) return false;
  if (!('fn' in op)) return false;
  const fn = (op as { fn: string }).fn;
  if (fn !== 'add' && fn !== 'subtract' && fn !== 'multiply' && fn !== 'divide') return false;
  return (op as { operand?: string }).operand === 'literal';
}

export function validateConfig(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  parameters: Parameter[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  let id = 0;
  const nextId = () => `v${++id}`;

  if (pool.terms.length === 0) {
    errors.push({ id: nextId(), message: 'At least one dice term is required', blocking: true });
  }

  for (const term of pool.terms) {
    if (term.count < 1 || term.count > 99) {
      errors.push({ id: nextId(), message: `Term "${term.tag || `d${term.sides}`}" count must be 1-99`, blocking: true });
    }
    if (term.sides < 1 || term.sides > 999) {
      errors.push({ id: nextId(), message: `Term "${term.tag || `d${term.sides}`}" sides must be 1-999`, blocking: true });
    }
  }

  if (outcomes.length === 0) {
    errors.push({ id: nextId(), message: 'At least one outcome is required', blocking: true });
  }

  const defaultCount = outcomes.filter((o) => o.isDefault).length;
  if (defaultCount > 1) {
    errors.push({ id: nextId(), message: 'Only one outcome can be default', blocking: true });
  }

  const pipelineNames = new Set<string>();
  for (const nv of pipeline) {
    if (pipelineNames.has(nv.name)) {
      errors.push({ id: nextId(), message: `Duplicate pipeline name "${nv.name}"`, blocking: true });
    }
    pipelineNames.add(nv.name);

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nv.name)) {
      errors.push({ id: nextId(), message: `Pipeline name "${nv.name}" must match /^[a-zA-Z_][a-zA-Z0-9_]*$/`, blocking: true });
    }

    if (nv.source !== 'rolled' && !pipelineNames.has(nv.source)) {
      const sourceIndex = pipeline.findIndex((p) => p.name === nv.source);
      if (sourceIndex === -1) {
        errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" references undefined source "${nv.source}"`, blocking: true });
      }
    }

    if (nv.source !== 'rolled') {
      const sourceIndex = pipeline.findIndex((p) => p.name === nv.source);
      if (sourceIndex >= 0) {
        let found = false;
        for (let i = 0; i < sourceIndex; i++) {
          if (pipeline[i].name === nv.source) { found = true; break; }
        }
        if (!found && sourceIndex >= pipeline.findIndex((p) => p.name === nv.name)) {
          errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" references source "${nv.source}" that appears later in pipeline`, blocking: true });
        }
      }
    }

    const op = nv.op;
    if (typeof op === 'object' && op !== null) {
      const fn = (op as any).fn;
      if (fn === 'add' || fn === 'subtract' || fn === 'multiply' || fn === 'divide') {
        if ((op as any).operand === 'named' && (op as any).source2 === nv.name) {
          errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" cannot reference itself`, blocking: true });
        }
        if (fn === 'divide' && (op as any).operand === 'literal' && (op as any).value === 0) {
          errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" divides by zero`, blocking: false });
        }
      }
    }

    if ((nv.op === 'count' || nv.op === 'sum' || nv.op === 'max' || nv.op === 'min') && nv.source !== 'rolled') {
      const sourceVal = pipeline.find((p) => p.name === nv.source);
      if (sourceVal) {
        const sourceType = inferType(sourceVal, pipeline);
        if (sourceType === 'scalar') {
          errors.push({ id: nextId(), message: `Cannot apply ${nv.op} to scalar source "${nv.source}"`, blocking: true });
        }
      }
    }
  }

  if (pipeline.length > 20) {
    errors.push({ id: nextId(), message: 'Maximum 20 pipeline rows allowed', blocking: true });
  }

  if (rerollConditions.length > 10) {
    errors.push({ id: nextId(), message: 'Maximum 10 reroll conditions allowed', blocking: true });
  }

  for (const rc of rerollConditions) {
    if (rc.repeat < 1) {
      errors.push({ id: nextId(), message: 'Reroll repeat must be >= 1', blocking: true });
    }
  }

  if (outcomes.length > 10) {
    errors.push({ id: nextId(), message: 'Maximum 10 outcomes allowed', blocking: true });
  }

  for (const outcome of outcomes) {
    if (outcome.conditions.length === 0 && !outcome.isDefault) {
      errors.push({ id: nextId(), message: `Outcome "${outcome.name}" has no conditions`, blocking: false });
    }
    if (outcome.conditions.length > 5) {
      errors.push({ id: nextId(), message: `Outcome "${outcome.name}" has more than 5 conditions`, blocking: true });
    }

    if (outcome.source !== 'rolled') {
      const pipeNv = pipeline.find((p) => p.name === outcome.source);
      if (!pipeNv) {
        errors.push({ id: nextId(), message: `Outcome "${outcome.name}" references undefined source "${outcome.source}"`, blocking: true });
      }
    }

    const isScalar = outcome.source === 'rolled' ? false : (() => {
      const nv = pipeline.find((p) => p.name === outcome.source);
      return nv ? inferType(nv, pipeline) === 'scalar' : false;
    })();

    for (const cond of outcome.conditions) {
      if (typeof cond === 'object' && 'op' in cond) {
        const op = cond.op;
        if (DICE_CONDITION_TYPES.includes(op as any)) {
          if (isScalar) {
            errors.push({ id: nextId(), message: `Dice condition "${op}" cannot be used on scalar source`, blocking: true });
          }
        } else {
          if (!isScalar) {
            errors.push({ id: nextId(), message: `Scalar comparison on vector source requires aggregation first`, blocking: true });
          }
        }
      }
    }
  }

  if (parameters.length > 3) {
    errors.push({ id: nextId(), message: 'Maximum 3 parameters allowed', blocking: true });
  }

  for (const param of parameters) {
    if (param.target === 'pool.count' || param.target === 'pool.sides') {
      if (param.targetTermId && !pool.terms.find((t) => t.id === param.targetTermId)) {
        errors.push({ id: nextId(), message: `Parameter "${param.label}" references invalid dice term`, blocking: true });
      }
    }
    if (param.target === 'outcome.value') {
      if (param.targetOutcomeId) {
        const o = outcomes.find((x) => x.id === param.targetOutcomeId);
        if (!o) {
          errors.push({ id: nextId(), message: `Parameter "${param.label}" references invalid outcome`, blocking: true });
        } else {
          if (o.conditions.length === 0) {
            errors.push({ id: nextId(), message: `Parameter "${param.label}": target outcome has no conditions. Add a condition first.`, blocking: true });
          } else if (!isScalarCondition(o.conditions[0])) {
            errors.push({ id: nextId(), message: `Parameter "${param.label}": cannot sweep vector condition. Add a numeric condition first.`, blocking: true });
          }
        }
      }
    }
    if (param.target === 'pipeline.literal') {
      if (param.targetPipelineId) {
        const pNv = pipeline.find((p) => p.id === param.targetPipelineId);
        if (!pNv) {
          errors.push({ id: nextId(), message: `Parameter "${param.label}" references invalid pipeline step`, blocking: true });
        } else if (!isBinaryMathLiteral(pNv)) {
          errors.push({ id: nextId(), message: `Parameter "${param.label}": target is not a binary-math-literal row. Change the function or pick a different target.`, blocking: true });
        }
      }
    }
  }

  const totalIterations = parameters.reduce((acc, p) => acc * p.values.length, 1_000_000);
  if (totalIterations > 10_000_000) {
    errors.push({ id: nextId(), message: `Total iterations (${(totalIterations / 1_000_000).toFixed(1)}M) is high`, blocking: false });
  }

  return errors;
}

function inferType(nv: NamedValue, pipeline: NamedValue[]): 'vector' | 'scalar' | null {
  let sourceType: 'vector' | 'scalar' | null = 'vector';
  if (nv.source === 'rolled') {
    sourceType = 'vector';
  } else {
    const src = pipeline.find((p) => p.name === nv.source);
    if (!src) return null;
    const srcType = inferType(src, pipeline);
    if (!srcType) return null;
    sourceType = srcType;
  }

  const op = nv.op;
  if (op === 'count' || op === 'sum' || op === 'max' || op === 'min') return 'scalar';
  if (typeof op === 'object' && op !== null && 'fn' in op) {
    if (op.fn === 'filter' || op.fn === 'remove') return 'vector';
    return 'scalar';
  }

  return sourceType;
}

export function canRunSimulation(errors: ValidationError[]): boolean {
  return !errors.some((e) => e.blocking);
}