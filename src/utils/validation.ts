import type { DicePool, RerollCondition, NamedValue, Outcome, OutcomeCondition, DiceConditionType, ScalarCondition, SweepParameters, Expr, ScalarBinaryTerm, SwitchBranch } from '@/types';
import { DICE_CONDITION_TYPES, SWITCH_CONDITION_OPERATORS } from '@/types';
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

function asScalarObjectOp(op: unknown): { fn: string; terms?: ScalarBinaryTerm[]; operand?: string; source2?: string } | null {
  if (typeof op !== 'object' || op === null) return null;
  if (!('fn' in op)) return null;
  return op as { fn: string; terms?: ScalarBinaryTerm[]; operand?: string; source2?: string };
}

export function isBinaryMathLiteral(nv: NamedValue): boolean {
  const op = asScalarObjectOp(nv.op);
  if (!op) return false;
  const fn = op.fn;
  if (fn !== 'add' && fn !== 'subtract' && fn !== 'multiply' && fn !== 'divide') return false;
  if (op.terms && op.terms.length > 0) {
    return op.terms[0]!.operand === 'val';
  }
  return false;
}

export function asScalarLiteral(nv: NamedValue): ScalarBinaryTerm | null {
  const op = asScalarObjectOp(nv.op);
  if (!op) return null;
  if (op.fn !== 'add' && op.fn !== 'subtract' && op.fn !== 'multiply' && op.fn !== 'divide') return null;
  if (op.terms && op.terms.length > 0 && op.terms[0]!.operand === 'val') {
    return op.terms[0]!;
  }
  return null;
}

function validateExprInContext(expr: Expr, prefix: string, errors: ValidationError[], nextId: () => string, sweep: SweepParameters): void {
  const testVars: Record<string, number> = {};
  testVars[sweep.xName] = 1;
  if (sweep.y) testVars[sweep.yName] = 1;
  const value = evalExpr(expr, testVars);
  if (!Number.isFinite(value)) {
    errors.push({ id: nextId(), message: `${prefix}: expression evaluates to non-finite value`, blocking: true });
  }
}

function validateDiceTermExpr(expr: Expr, field: 'count' | 'sides', prefix: string, errors: ValidationError[], nextId: () => string, sweep: SweepParameters): void {
  validateExprInContext(expr, prefix, errors, nextId, sweep);
  const testVars: Record<string, number> = {};
  testVars[sweep.xName] = 1;
  if (sweep.y) testVars[sweep.yName] = 1;
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
    validateDiceTermExpr(term.count, 'count', `Term "${term.tag || 'unnamed'}" count`, errors, nextId, sweep);
    validateDiceTermExpr(term.sides, 'sides', `Term "${term.tag || 'unnamed'}" sides`, errors, nextId, sweep);
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
          const terms = obj.terms;
          if (terms) {
            for (const term of terms) {
              if (term.operand === 'ref' && term.source2 === nv.name) {
                errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" cannot reference itself`, blocking: true });
              }
              if (fn === 'divide' && term.operand === 'val') {
                const litVal = term.value.kind === 'literal' ? term.value.value : null;
                if (litVal === 0) {
                  errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" divides by zero`, blocking: false });
                }
              }
              if (term.operand === 'val') {
                const testVars: Record<string, number> = {};
                testVars[sweep.xName] = 1;
                if (sweep.y) testVars[sweep.yName] = 1;
                const v = evalExpr(term.value, testVars);
                if (!Number.isFinite(v)) {
                  errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" literal evaluates to non-finite value`, blocking: true });
                }
              }
            }
          }
        }

        if (fn === 'switch') {
          const branches = (op as { fn: 'switch'; branches: SwitchBranch[] }).branches;
          if (!branches || branches.length === 0) {
            errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" switch requires at least 1 branch`, blocking: true });
          } else if (branches.length > 10) {
            errors.push({ id: nextId(), message: `Pipeline row "${nv.name}" switch supports at most 10 branches`, blocking: true });
          } else {
            const switchRowIndex = pipeline.findIndex((p) => p.name === nv.name);
            for (let bi = 0; bi < branches.length; bi++) {
              const branch = branches[bi]!;
              const cond = branch.condition;
              const condSourceIndex = pipeline.findIndex((p) => p.name === cond.source);
              if (!SWITCH_CONDITION_OPERATORS.includes(cond.op)) {
                errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: "${cond.op}" is not valid for switch conditions`, blocking: true });
              }
              if (cond.source === 'rolled') {
                errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: condition source "rolled" is a vector, not a scalar`, blocking: true });
              } else if (cond.source && condSourceIndex === -1) {
                errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: condition source "${cond.source}" is not defined`, blocking: true });
              } else if (cond.source && condSourceIndex >= switchRowIndex) {
                errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: condition source "${cond.source}" appears after switch row`, blocking: true });
              }
              if (cond.source && cond.source !== 'rolled' && condSourceIndex >= 0 && condSourceIndex < switchRowIndex) {
                const condSource = pipeline[condSourceIndex];
                if (condSource) {
                  const condSourceType = inferType(condSource, pipeline);
                  if (condSourceType === 'vector') {
                    errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: condition source "${cond.source}" must be a scalar value`, blocking: true });
                  }
                }
              }
              if (cond.op !== 'is_even' && cond.op !== 'is_odd' && !cond.value) {
                errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: condition requires a value for "${cond.op}" operator`, blocking: true });
              }
              if (cond.value) {
                const testVars: Record<string, number> = {};
                testVars[sweep.xName] = 1;
                if (sweep.y) testVars[sweep.yName] = 1;
                const v = evalExpr(cond.value, testVars);
                if (!Number.isFinite(v)) {
                  errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: condition value evaluates to non-finite value`, blocking: false });
                }
              }
              if (branch.value.operand === 'ref') {
                const branchVal = branch.value;
                if (branchVal.source2 === nv.name) {
                  errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: cannot reference itself`, blocking: true });
                }
                const valSourceIndex = pipeline.findIndex((p) => p.name === branchVal.source2);
                if (valSourceIndex === -1) {
                  errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: branch value source "${branchVal.source2}" is not defined`, blocking: true });
                } else if (valSourceIndex >= switchRowIndex) {
                  errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: branch value source "${branchVal.source2}" appears after switch row`, blocking: true });
                }
              }
              if (branch.value.operand === 'val') {
                const testVars: Record<string, number> = {};
                testVars[sweep.xName] = 1;
                if (sweep.y) testVars[sweep.yName] = 1;
                const v = evalExpr(branch.value.value, testVars);
                if (!Number.isFinite(v)) {
                  errors.push({ id: nextId(), message: `Switch branch ${bi + 1}: branch value evaluates to non-finite value`, blocking: true });
                }
              }
            }
          }
        }
      }
    }

    if ((nv.op === 'count' || nv.op === 'sum' || nv.op === 'max' || nv.op === 'min' || nv.op === 'sub') && nv.source !== 'rolled') {
      const sourceVal = pipeline.find((p) => p.name === nv.source);
      if (sourceVal) {
        const sourceType = inferType(sourceVal, pipeline);
        if (sourceType === 'scalar') {
          errors.push({ id: nextId(), message: `Cannot apply ${nv.op} to scalar source "${nv.source}"`, blocking: true });
        }
      }
    }

    if (typeof nv.op === 'object' && nv.op !== null && 'fn' in nv.op && nv.op.fn === 'switch') {
      if (nv.source !== 'rolled') {
        const srcVal = pipeline.find((p) => p.name === nv.source);
        if (srcVal) {
          const srcType = inferType(srcVal, pipeline);
          if (srcType === 'vector') {
            errors.push({ id: nextId(), message: `Cannot apply switch to vector source "${nv.source}"`, blocking: true });
          }
        }
      } else {
        errors.push({ id: nextId(), message: `Cannot apply switch to rolled (vector)`, blocking: true });
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
      if ('value' in cond && cond.value) {
        const testVars: Record<string, number> = {};
        testVars[sweep.xName] = 1;
        if (sweep.y) testVars[sweep.yName] = 1;
        const v = evalExpr(cond.value, testVars);
        if (!Number.isFinite(v)) {
          errors.push({ id: nextId(), message: `Outcome "${outcome.name}" condition value evaluates to non-finite value`, blocking: true });
        }
      }
    }
  }

  if (sweep.xName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sweep.xName)) {
    errors.push({ id: nextId(), message: `Sweep X name "${sweep.xName}" is not a valid identifier`, blocking: true });
  }
  if (sweep.yName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sweep.yName)) {
    errors.push({ id: nextId(), message: `Sweep Y name "${sweep.yName}" is not a valid identifier`, blocking: true });
  }
  if (sweep.xName && sweep.x.length === 0) {
    errors.push({ id: nextId(), message: `Sweep "${sweep.xName}" has a name but no values`, blocking: true });
  }
  if (sweep.x.length > 0 && !sweep.xName) {
    errors.push({ id: nextId(), message: `Sweep X has values but no name`, blocking: true });
  }
  if (sweep.yName && (!sweep.y || sweep.y.length === 0)) {
    errors.push({ id: nextId(), message: `Sweep "${sweep.yName}" has a name but no values`, blocking: true });
  }
  if (sweep.y && sweep.y.length > 0 && !sweep.yName) {
    errors.push({ id: nextId(), message: `Sweep Y has values but no name`, blocking: true });
  }
  if (sweep.x.length > 10) {
    errors.push({ id: nextId(), message: `Sweep ${sweep.xName || 'X'} has ${sweep.x.length} values (max 10)`, blocking: true });
  }
  if (sweep.y && sweep.y.length > 10) {
    errors.push({ id: nextId(), message: `Sweep ${sweep.yName || 'Y'} has ${sweep.y.length} values (max 10)`, blocking: true });
  }
  for (const v of sweep.x) {
    if (!Number.isFinite(v)) {
      errors.push({ id: nextId(), message: `Sweep ${sweep.xName} contains non-finite value`, blocking: true });
      break;
    }
  }
  if (sweep.y) {
    for (const v of sweep.y) {
      if (!Number.isFinite(v)) {
        errors.push({ id: nextId(), message: `Sweep ${sweep.yName} contains non-finite value`, blocking: true });
        break;
      }
    }
  }

  const activeSweepNames = new Set<string>();
  if (sweep.x.length > 0 && sweep.xName) activeSweepNames.add(sweep.xName);
  if (sweep.y && sweep.y.length > 0 && sweep.yName) activeSweepNames.add(sweep.yName);
  const knownNames = new Set([...pipelineNames, 'rolled', ...activeSweepNames]);

  const allRefs: { ref: string; label: string }[] = [];
  function collectRefs(expr: Expr, label: string): void {
    if (expr.kind === 'ref') {
      allRefs.push({ ref: expr.name, label });
    } else if (expr.kind === 'binop') {
      collectRefs(expr.left, label);
      collectRefs(expr.right, label);
    }
  }

  for (const term of pool.terms) {
    collectRefs(term.count, `Term "${term.tag || 'unnamed'}" count`);
    collectRefs(term.sides, `Term "${term.tag || 'unnamed'}" sides`);
  }

  for (const rc of rerollConditions) {
    for (const clause of rc.conditions.clauses) {
      if (clause.field === 'face' && clause.value) {
        collectRefs(clause.value, `Reroll "${rc.action}" condition`);
      }
    }
  }

  for (const nv of pipeline) {
    const op = nv.op;
    if (typeof op === 'object' && op !== null) {
      const obj = asScalarObjectOp(op);
      if (obj) {
        if (obj.fn === 'add' || obj.fn === 'subtract' || obj.fn === 'multiply' || obj.fn === 'divide') {
          if (obj.terms) {
            for (const term of obj.terms) {
              if (term.operand === 'val') {
                collectRefs(term.value, `Pipeline "${nv.name}"`);
              }
            }
          }
        }
        if (obj.fn === 'switch') {
          const branches = (op as { fn: 'switch'; branches: SwitchBranch[] }).branches;
          if (branches) {
            for (let bi = 0; bi < branches.length; bi++) {
              const branch = branches[bi]!;
              if (branch.condition.value) {
                collectRefs(branch.condition.value, `Pipeline "${nv.name}" switch branch ${bi + 1} condition`);
              }
              if (branch.value.operand === 'val') {
                collectRefs(branch.value.value, `Pipeline "${nv.name}" switch branch ${bi + 1} value`);
              }
            }
          }
        }
      }
    }
  }

  for (const outcome of outcomes) {
    for (const cond of outcome.conditions) {
      if ('value' in cond && cond.value) {
        collectRefs(cond.value, `Outcome "${outcome.name}"`);
      }
    }
  }

  for (const ref of allRefs) {
    if (!knownNames.has(ref.ref)) {
      errors.push({ id: nextId(), message: `"${ref.label}" references unknown "${ref.ref}"`, blocking: true });
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

export function inferTypeFromOp(nv: NamedValue): 'vector' | 'scalar' {
  const op = nv.op;
  if (op === 'count' || op === 'sum' || op === 'max' || op === 'min' || op === 'sub') return 'scalar';
  if (typeof op === 'object' && op !== null && 'fn' in op) {
    if (op.fn === 'filter' || op.fn === 'remove') return 'vector';
    return 'scalar';
  }
  return 'vector';
}

export function canRunSimulation(errors: ValidationError[]): boolean {
  return !errors.some((e) => e.blocking);
}
