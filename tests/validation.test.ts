import { describe, it, expect } from 'vitest';
import { validateConfig, canRunSimulation } from '@/utils/validation';
import type { DicePool, RerollCondition, NamedValue, Outcome, SweepParameters } from '@/types';
import { literalExpr } from '@/utils/expression';

function makePool(terms?: Partial<{ id: string; count: number; sides: number; tag: string; comment: string }>[]): DicePool {
  return {
    terms: (terms ?? [{ count: 1, sides: 20, tag: '', comment: '' }]).map((t, i) => ({
      id: t.id ?? `t${i}`,
      count: literalExpr(t.count ?? 1),
      sides: literalExpr(t.sides ?? 20),
      tag: t.tag ?? '',
      comment: t.comment ?? '',
    })),
  };
}

function makeOutcome(overrides?: Partial<Outcome>): Outcome {
  return {
    id: 'o1',
    name: 'Hit',
    conditions: [{ source: 'total', op: '>=', value: literalExpr(10) }],
    connectors: [],
    comment: '',
    ...overrides,
  };
}

const validPool = makePool();
const validOutcome = makeOutcome();
const validPipeline: NamedValue[] = [
  { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
];
const validRerollConditions: RerollCondition[] = [];
const validSweep: SweepParameters = { x: [], y: null };

describe('validateConfig', () => {
  describe('pool validation', () => {
    it('reports error when pool has no terms', () => {
      const errors = validateConfig({ terms: [] }, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('At least one dice term'))).toBe(true);
    });

    it('reports error for count < 1', () => {
      const pool = makePool([{ count: 0, sides: 6 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('count must be 1-99'))).toBe(true);
    });

    it('reports error for count > 99', () => {
      const pool = makePool([{ count: 100, sides: 6 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('count must be 1-99'))).toBe(true);
    });

    it('reports error for sides < 1', () => {
      const pool = makePool([{ sides: 0 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('sides must be 1-999'))).toBe(true);
    });

    it('reports error for sides > 999', () => {
      const pool = makePool([{ sides: 1000 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('sides must be 1-999'))).toBe(true);
    });
  });

  describe('outcome validation', () => {
    it('reports error when no outcomes', () => {
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('At least one outcome'))).toBe(true);
    });

    it('reports warning for outcome with no conditions', () => {
      const outcome = makeOutcome({ conditions: [] });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validSweep);
      expect(errors.some((e) => !e.blocking && e.message.includes('has no conditions'))).toBe(true);
    });

    it('reports error for outcome referencing undefined pipeline source', () => {
      const outcome = makeOutcome({ conditions: [{ source: 'nonexistent', op: '>=', value: literalExpr(10) }] });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('references undefined source'))).toBe(true);
    });

    it('reports blocking error for dice condition on scalar source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
      ];
      const outcome = makeOutcome({ conditions: [{ source: 'total', op: 'none', subCondition: '>=', value: literalExpr(1) }] });
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('cannot be used on scalar'))).toBe(true);
    });

    it('reports blocking error for scalar condition on vector source', () => {
      const outcome = makeOutcome({ conditions: [{ source: 'rolled', op: '>=', value: literalExpr(10) }] });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.toLowerCase().includes('scalar') && e.message.includes('vector'))).toBe(true);
    });

    it('reports error for more than 10 outcomes', () => {
      const outcomes = Array.from({ length: 11 }, (_, i) => makeOutcome({ id: `o${i}`, name: `O${i}`, conditions: [{ source: 'total', op: '>=', value: literalExpr(i) }] }));
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, outcomes, validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 10 outcomes'))).toBe(true);
    });

    it('reports error for outcome with more than 5 conditions', () => {
      const outcome = makeOutcome({
        conditions: [
          { source: 'total', op: '>=', value: literalExpr(1) },
          { source: 'total', op: '<=', value: literalExpr(2) },
          { source: 'total', op: '=', value: literalExpr(3) },
          { source: 'total', op: '!=', value: literalExpr(4) },
          { source: 'total', op: '>', value: literalExpr(5) },
          { source: 'total', op: '<', value: literalExpr(6) },
        ],
      });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('more than 5 conditions'))).toBe(true);
    });
  });

  describe('pipeline validation', () => {
    it('reports error for duplicate pipeline names', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'total', source: 'rolled', op: 'max', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Duplicate pipeline name'))).toBe(true);
    });

    it('reports error for invalid pipeline name', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: '123bad', source: 'rolled', op: 'sum', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('must match'))).toBe(true);
    });

    it('reports error for pipeline referencing undefined source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'result', source: 'nonexistent', op: 'sum', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('references undefined source'))).toBe(true);
    });

    it('reports error for pipeline referencing source that appears later', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'a', source: 'b', op: 'sum', comment: '' },
        { id: 'p2', name: 'b', source: 'rolled', op: 'sum', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('appears later in pipeline'))).toBe(true);
    });

    it('reports error for self-referencing pipeline', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'a', source: 'rolled', op: 'sum' as const, comment: '' },
        { id: 'p2', name: 'b', source: 'a', op: { fn: 'add' as const, terms: [{ operand: 'named' as const, source2: 'b' }] }, comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('cannot reference itself'))).toBe(true);
    });

    it('reports non-blocking error for divide by zero', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'div', source: 'total', op: { fn: 'divide', terms: [{ operand: 'literal', value: literalExpr(0) }] }, comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => !e.blocking && e.message.includes('divides by zero'))).toBe(true);
    });

    it('reports error for applying scalar op to scalar source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'counted', source: 'total', op: 'count', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Cannot apply count to scalar'))).toBe(true);
    });

    it('reports error for pipeline exceeding 20 rows', () => {
      const pipeline: NamedValue[] = Array.from({ length: 21 }, (_, i) => ({
        id: `p${i}`, name: `step${i}`, source: i === 0 ? 'rolled' : `step${i - 1}`, op: 'sum' as const, comment: '',
      }));
      const pipeline2: NamedValue[] = [
        { id: 'px', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        ...pipeline.slice(0, 20),
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline2, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 20 pipeline'))).toBe(true);
    });
  });

  describe('reroll condition validation', () => {
    it('reports error for more than 10 reroll conditions', () => {
      const conditions: RerollCondition[] = Array.from({ length: 11 }, (_, i) => ({
        id: `rc${i}`,
        action: 'reroll' as const,
        conditions: { clauses: [{ field: 'face' as const, operator: '>=' as const, value: literalExpr(1) }], connectors: [] as const },
        repeat: 1,
        tagAs: '',
        comment: '',
      }));
      const errors = validateConfig(validPool, conditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 10 reroll'))).toBe(true);
    });

    it('reports error for repeat < 1', () => {
      const conditions: RerollCondition[] = [{
        id: 'rc1',
        action: 'reroll',
        conditions: { clauses: [{ field: 'face', operator: '>=', value: literalExpr(1) }], connectors: [] },
        repeat: 0,
        tagAs: '',
        comment: '',
      }];
      const errors = validateConfig(validPool, conditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Reroll repeat must be >= 1'))).toBe(true);
    });
  });

  describe('sweep and expression validation', () => {
    it('reports error for sweep X exceeding 10 values', () => {
      const sweep: SweepParameters = { x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], y: null };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], sweep);
      expect(errors.some((e) => e.blocking && e.message.includes('max 10'))).toBe(true);
    });

    it('reports blocking error for sweep Y without X', () => {
      const sweep: SweepParameters = { x: [], y: [1, 2] };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], sweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Sweep Y') && e.message.includes('X is empty'))).toBe(true);
    });

    it('reports error for sweep Y exceeding 10 values', () => {
      const sweep: SweepParameters = { x: [1], y: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], sweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Sweep Y') && e.message.includes('max 10'))).toBe(true);
    });

    it('passes validation for valid sweep', () => {
      const sweep: SweepParameters = { x: [1, 2, 3], y: null };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], sweep);
      expect(errors.some((e) => e.blocking)).toBe(false);
    });

    it('reports warning for high total iterations', () => {
      const sweep: SweepParameters = { x: Array.from({ length: 15 }, (_, i) => i + 1), y: null };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], sweep);
      expect(errors.some((e) => !e.blocking && e.message.includes('high'))).toBe(true);
    });

    it('reports blocking error for outcome with empty conditions when sweep is active', () => {
      const outcome: Outcome = { ...validOutcome, id: 'o-empty', conditions: [] };
      const sweep: SweepParameters = { x: [5, 10, 15], y: null };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], sweep);
      expect(errors.some((e) => e.blocking && e.message.includes('no conditions'))).toBe(true);
    });

    it('allows dice condition with sweep', () => {
      const outcome: Outcome = {
        ...validOutcome,
        conditions: [{ source: 'rolled', op: 'any', subCondition: '>=', value: literalExpr(5) }],
      };
      const sweep: SweepParameters = { x: [5, 10, 15], y: null };
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], sweep);
      expect(errors.some((e) => e.blocking && e.message.includes('vector condition'))).toBe(false);
      expect(errors.some((e) => e.blocking && e.message.includes('no conditions'))).toBe(false);
    });

    it('allows ceil/floor pipeline with sweep', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'ceil_total', source: 'total', op: { fn: 'ceil' }, comment: '' },
      ];
      const sweep: SweepParameters = { x: [1, 2], y: null };
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], sweep);
      expect(errors.some((e) => e.blocking)).toBe(false);
    });
  });

  describe('per-condition source', () => {
    it('reports error for condition referencing undefined pipeline source', () => {
      const outcome = makeOutcome({ conditions: [{ source: 'nonexistent', op: '>=', value: literalExpr(10) }] });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('condition references undefined source'))).toBe(true);
    });

    it('reports blocking error for scalar condition on vector source per condition', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'kept', source: 'rolled', op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: literalExpr(1) }], connectors: [] } }, comment: '' },
      ];
      const outcome = makeOutcome({ conditions: [{ source: 'kept', op: '>=', value: literalExpr(10) }] });
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('vector source'))).toBe(true);
    });

    it('reports blocking error for dice condition on scalar source per condition', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
      ];
      const outcome = makeOutcome({ conditions: [{ source: 'total', op: 'any', subCondition: '>=', value: literalExpr(5) }] });
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('scalar source'))).toBe(true);
    });

    it('passes for compound outcome with two valid sources', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'delta', source: 'rolled', op: { fn: 'add', terms: [{ operand: 'literal', value: literalExpr(0) }] }, comment: '' },
      ];
      const outcome: Outcome = {
        id: 'o1',
        name: 'Critical Hit',
        conditions: [
          { source: 'total', op: '>=', value: literalExpr(15) },
          { source: 'delta', op: '>=', value: literalExpr(0) },
        ],
        connectors: ['and'],
        comment: '',
      };
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking)).toBe(false);
    });
  });

  describe('valid configurations', () => {
    it('returns no blocking errors for valid config', () => {
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking)).toBe(false);
    });

    it('returns empty array for minimal valid config', () => {
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], validSweep);
      expect(errors).toEqual([]);
    });
  });

  describe('switch validation', () => {
    it('passes validation for valid switch', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        { id: 'p2', name: 'doubled', source: 'val', op: { fn: 'add', terms: [{ operand: 'literal', value: literalExpr(2) }] }, comment: '' },
        {
          id: 'p3', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'named', source2: 'doubled' }, condition: { source: 'val', op: '=', value: literalExpr(10) } },
            { value: { operand: 'literal', value: literalExpr(0) }, condition: { source: 'val', op: '=', value: literalExpr(1) } },
          ] },
          comment: '',
        },
      ];
      const outcome = makeOutcome({ conditions: [{ source: 'result', op: '>=', value: literalExpr(1) }] });
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [outcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('switch'))).toBe(false);
    });

    it('reports error for switch on vector source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'hits', source: 'rolled', op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: literalExpr(5) }], connectors: [] } }, comment: '' },
        {
          id: 'p3', name: 'result', source: 'hits',
          op: { fn: 'switch', branches: [
            { value: { operand: 'literal', value: literalExpr(1) }, condition: { source: 'total', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Cannot apply switch to vector'))).toBe(true);
    });

    it('reports error for switch on rolled (vector)', () => {
      const pipeline: NamedValue[] = [
        {
          id: 'p1', name: 'result', source: 'rolled',
          op: { fn: 'switch', branches: [
            { value: { operand: 'literal', value: literalExpr(1) }, condition: { source: 'rolled', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('Cannot apply switch'))).toBe(true);
    });

    it('reports error for undefined condition source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'literal', value: literalExpr(1) }, condition: { source: 'nonexistent', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('is not defined'))).toBe(true);
    });

    it('reports error for condition source after switch row', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'literal', value: literalExpr(1) }, condition: { source: 'later', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
        { id: 'p3', name: 'later', source: 'rolled', op: 'max', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('appears after switch row'))).toBe(true);
    });

    it('reports error for condition source as vector', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'hits', source: 'rolled', op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: literalExpr(5) }], connectors: [] } }, comment: '' },
        { id: 'p2', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p3', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'literal', value: literalExpr(1) }, condition: { source: 'hits', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('must be a scalar'))).toBe(true);
    });

    it('reports error for invalid operator is_min', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'literal', value: literalExpr(1) }, condition: { source: 'val', op: 'is_min' as any, value: literalExpr(10) } },
          ] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('not valid for switch'))).toBe(true);
    });

    it('reports error for branch self-reference', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'named', source2: 'result' }, condition: { source: 'val', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('cannot reference itself'))).toBe(true);
    });

    it('reports error for branch value source after switch row', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [
            { value: { operand: 'named', source2: 'later' }, condition: { source: 'val', op: '=', value: literalExpr(10) } },
          ] },
          comment: '',
        },
        { id: 'p3', name: 'later', source: 'rolled', op: 'max', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('appears after switch row'))).toBe(true);
    });

    it('reports error for zero branches', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: [] },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('at least 1 branch'))).toBe(true);
    });

    it('reports error for more than 10 branches', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'val', source: 'rolled', op: 'max', comment: '' },
        {
          id: 'p2', name: 'result', source: 'val',
          op: { fn: 'switch', branches: Array.from({ length: 11 }, (_, i) => ({
            value: { operand: 'literal', value: literalExpr(i) },
            condition: { source: 'val', op: '=', value: literalExpr(i) },
          })) },
          comment: '',
        },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validSweep);
      expect(errors.some((e) => e.blocking && e.message.includes('at most 10 branches'))).toBe(true);
    });
  });
});

describe('canRunSimulation', () => {
  it('returns true when there are no blocking errors', () => {
    expect(canRunSimulation([])).toBe(true);
    expect(canRunSimulation([{ id: 'v1', message: 'warning', blocking: false }])).toBe(true);
  });

  it('returns false when there are blocking errors', () => {
    expect(canRunSimulation([{ id: 'v1', message: 'error', blocking: true }])).toBe(false);
    expect(canRunSimulation([
      { id: 'v1', message: 'warning', blocking: false },
      { id: 'v2', message: 'error', blocking: true },
    ])).toBe(false);
  });
});
