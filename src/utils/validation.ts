import type { DicePool, RerollCondition, NamedValue, Outcome, OutcomeCondition, DiceConditionType, ScalarLiteralOp, ScalarCondition, SweepParameters, Expr } from '@/types';
import { DICE_CONDITION_TYPES } from '@/types';
import { evalExpr } from '@/utils/expression';

export interface ValidationError {
  id: string;
  message: string;
  blocking: boolean;
}

export function isScalarCondition(cond: OutcomeCondition): cond is ScalarCondition {
  if (typeof cond !== 'object' || cond === null) return false;
  if (!('op' in cond)) return false;
  return !DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
}

function asScalarObjectOp(op: unknown): { fn: string; operand?: string; value?: number | Expr; source2?: string } | null {
  if (typeof op !== 'object' || op === null) return null;
  if (!('fn' in op)) return null;
  return op as { fn: string; operand?: string; value?: number | Expr; source2?: string };
}

export function isBinaryMathLiteral(nv: NamedValue): boolean {
  const op = asScalarObjectOp(nv.op);
  if (!op) return false;
  const fn = op.fn;
  if (fn !== 'add' && fn !== 'subtract' && fn !== 'multiply' && fn !== 'divide') return false;
  return op.operand === 'literal';
}

export function asScalarLiteral(nv: NamedValue): ScalarLiteralOp | null {
  const op = asScalarObjectOp(nv.op);
  if (!op) return null;
  if (op.operand !== 'literal') return null;
  if (op.fn !== 'add' && op.fn !== 'subtract' && op.fn !== 'multiply' && op.fn !== 'divide') return null;
  if (typeof op.value !== 'object') return null;
  return { fn: op.fn, operand: 'literal', value: op.value };
}

function validateExprInContext(expr: Expr, prefix: string, errors: ValidationError[], nextId: () => string): void {
  const testVars = { x: 1, y: 1 };
  const value = evalExpr(expr, testVars);
  if (!Number.isFinite(value)) {
    errors.push({ id: nextId(), message: `${prefix}: expression evaluates to non-finite value`, blocking: true });
  }
}

function validateDiceTermExpr(expr: Expr, field: 'count' | 'sides', prefix: string, errors: ValidationError[], nextId: () => string): void {
  validateExprInContext(expr, prefix, errors, nextId);
  const testVars = { x: 1, y: 1 };
  const value = evalExpr(expr, testVars);
  if (Number.isFinite(value)) {
    if (field === 'count' && (value < 1 || value > 99)) {
      errors.push({ id: nextId(), message: `${prefix} must be 1-99`, blocking: true });
    }
    if (field === 'sides' && (value < 1 || value > 999)) {
      errors.push({ id: nextId(), message: `${prefix} must be 1-999`, blocking: true });
    }
  }
}

export function validateConfig(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  sweep: SweepParameters
): ValidationError[] {
  const errors: ValidationError[] = [];
  let id = 0;
  const nextId = () => `v${++id}`;

  if (pool.terms.length === 0) {
    errors.push({ id: nextId(), message: 'At least one dice term is required', blocking: true });
  }

  for (const term of pool.terms) {
    validateDiceTermExpr(term.count, 'count', `Term "${term.tag || 'unnamed'}" count`, errors, nextId);
    validateDiceTermExpr(term.sides, 'sides', `Term "${term.tag || 'unnamed'}" sides`, errors, nextId);
  }

  if (outcomes.length === 0) {
    errors.push({ id: nextId(), message: 'At least one outcome is required', blocking: true });
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
      const obj = asScalarObjectOp(op);
      if (obj) {
        const fn = obj.fn;
        if (fn === 'add' || fn === 'subtract' || fn === 'multiply' || fn === 'divide') {
          if (obj.operand === 'named' && obj.source2 === nv.name) {
            errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" cannot reference itself`, blocking: true });
          }
          if (fn === 'divide' && obj.operand === 'literal' && typeof obj.value === 'object') {
            const litVal = (obj.value as Expr).kind === 'literal' ? (obj.value as { value: number }).value : null;
            if (litVal === 0) {
              errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" divides by zero`, blocking: false });
            }
          }
          if (obj.operand === 'literal' && typeof obj.value === 'object') {
            const expr = obj.value as Expr;
            const testVars = { x: 1, y: 1 };
            const v = evalExpr(expr, testVars);
            if (!Number.isFinite(v)) {
              errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" literal evaluates to non-finite value`, blocking: true });
            }
          }
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

  const sweepActive = sweep.x.length > 0 || (sweep.y !== null && sweep.y.length > 0);
  for (const outcome of outcomes) {
    if (outcome.conditions.length === 0) {
      errors.push({ id: nextId(), message: `Outcome "${outcome.name}" has no conditions`, blocking: sweepActive });
    }
    if (outcome.conditions.length > 5) {
      errors.push({ id: nextId(), message: `Outcome "${outcome.name}" has more than 5 conditions`, blocking: true });
    }

    for (const cond of outcome.conditions) {
      const isDice = DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
      if (cond.source !== 'rolled') {
        const pipeNv = pipeline.find((p) => p.name === cond.source);
        if (!pipeNv) {
          errors.push({ id: nextId(), message: `Outcome "${outcome.name}" condition references undefined source "${cond.source}"`, blocking: true });
          continue;
        }
        const sourceType = inferType(pipeNv, pipeline);
        if (isDice) {
          if (sourceType === 'scalar') {
            errors.push({ id: nextId(), message: `Outcome "${outcome.name}" dice condition cannot be used on scalar source "${cond.source}"`, blocking: true });
          }
        } else {
          if (sourceType !== 'scalar') {
            errors.push({ id: nextId(), message: `Outcome "${outcome.name}" scalar condition cannot be used on vector source "${cond.source}"`, blocking: true });
          }
        }
      } else if (!isDice) {
        errors.push({ id: nextId(), message: `Outcome "${outcome.name}" scalar comparison on vector source requires aggregation first`, blocking: true });
      }
      if ('value' in cond) {
        const testVars = { x: 1, y: 1 };
        const v = evalExpr(cond.value, testVars);
        if (!Number.isFinite(v)) {
          errors.push({ id: nextId(), message: `Outcome "${outcome.name}" condition value evaluates to non-finite value`, blocking: true });
        }
      }
    }
  }

  if (sweep.x.length > 10) {
    errors.push({ id: nextId(), message: `Sweep X has ${sweep.x.length} values (max 10)`, blocking: true });
  }
  if (sweep.y && sweep.y.length > 10) {
    errors.push({ id: nextId(), message: `Sweep Y has ${sweep.y.length} values (max 10)`, blocking: true });
  }
  if (sweep.y && sweep.y.length > 0 && sweep.x.length === 0) {
    errors.push({ id: nextId(), message: 'Sweep Y is set but Sweep X is empty', blocking: true });
  }
  for (const v of sweep.x) {
    if (!Number.isFinite(v)) {
      errors.push({ id: nextId(), message: `Sweep X contains non-finite value`, blocking: true });
      break;
    }
  }
  if (sweep.y) {
    for (const v of sweep.y) {
      if (!Number.isFinite(v)) {
        errors.push({ id: nextId(), message: `Sweep Y contains non-finite value`, blocking: true });
        break;
      }
    }
  }

  const xCount = Math.max(1, sweep.x.length);
  const yCount = sweep.y ? Math.max(1, sweep.y.length) : 1;
  const totalIterations = xCount * yCount * 1_000_000;
  if (totalIterations > 10_000_000) {
    errors.push({ id: nextId(), message: `Total iterations (${(totalIterations / 1_000_000).toFixed(1)}M) is high`, blocking: false });
  }

  return errors;
}

export function inferType(nv: NamedValue, pipeline: NamedValue[]): 'vector' | 'scalar' | null {
  if (nv.source === 'rolled') {
    return inferTypeFromOp(nv);
  }

  const src = pipeline.find((p) => p.name === nv.source);
  if (!src) return null;
  const srcType = inferType(src, pipeline);
  if (!srcType) return null;
  if (srcType === 'vector' && (src.op === 'count' || src.op === 'sum')) {
    return inferTypeFromOp(nv);
  }
  return inferTypeFromOp(nv);
}

function inferTypeFromOp(nv: NamedValue): 'vector' | 'scalar' {
  const op = nv.op;
  if (op === 'count' || op === 'sum' || op === 'max' || op === 'min') return 'scalar';
  if (typeof op === 'object' && op !== null && 'fn' in op) {
    if (op.fn === 'filter' || op.fn === 'remove') return 'vector';
    return 'scalar';
  }
  return 'vector';
}

export function canRunSimulation(errors: ValidationError[]): boolean {
  return !errors.some((e) => e.blocking);
}
