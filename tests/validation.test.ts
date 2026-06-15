import { describe, it, expect } from 'vitest';
import { validateConfig, canRunSimulation } from '@/utils/validation';
import type { DicePool, RerollCondition, NamedValue, Outcome, Parameter } from '@/types';

function makePool(terms?: Partial<{ id: string; count: number; sides: number; tag: string }>[]): DicePool {
  return {
    terms: (terms ?? [{ count: 1, sides: 20, tag: '' }]).map((t, i) => ({
      id: t.id ?? `t${i}`,
      count: t.count ?? 1,
      sides: t.sides ?? 20,
      tag: t.tag ?? '',
    })),
  };
}

function makeOutcome(overrides?: Partial<Outcome>): Outcome {
  return {
    id: 'o1',
    name: 'Hit',
    source: 'total',
    conditions: [{ op: '>=', value: 10 }],
    connector: 'and',
    comment: '',
    isDefault: false,
    ...overrides,
  };
}

const validPool = makePool();
const validOutcome = makeOutcome();
const validPipeline: NamedValue[] = [
  { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
];
const validRerollConditions: RerollCondition[] = [];
const validParameters: Parameter[] = [];

describe('validateConfig', () => {
  describe('pool validation', () => {
    it('reports error when pool has no terms', () => {
      const errors = validateConfig({ terms: [] }, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('At least one dice term'))).toBe(true);
    });

    it('reports error for count < 1', () => {
      const pool = makePool([{ count: 0, sides: 6 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('count must be 1-99'))).toBe(true);
    });

    it('reports error for count > 99', () => {
      const pool = makePool([{ count: 100, sides: 6 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('count must be 1-99'))).toBe(true);
    });

    it('reports error for sides < 1', () => {
      const pool = makePool([{ sides: 0 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('sides must be 1-999'))).toBe(true);
    });

    it('reports error for sides > 999', () => {
      const pool = makePool([{ sides: 1000 }]);
      const errors = validateConfig(pool, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('sides must be 1-999'))).toBe(true);
    });
  });

  describe('outcome validation', () => {
    it('reports error when no outcomes', () => {
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('At least one outcome'))).toBe(true);
    });

    it('reports error when more than one default outcome', () => {
      const outcomes = [
        makeOutcome({ id: 'o1', name: 'A', isDefault: true }),
        makeOutcome({ id: 'o2', name: 'B', isDefault: true }),
      ];
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, outcomes, validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Only one outcome can be default'))).toBe(true);
    });

    it('reports error for outcome with no conditions and not default', () => {
      const outcome = makeOutcome({ conditions: [], isDefault: false });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validParameters);
      expect(errors.some((e) => !e.blocking && e.message.includes('has no conditions'))).toBe(true);
    });

    it('reports error for outcome referencing undefined pipeline source', () => {
      const outcome = makeOutcome({ source: 'nonexistent' });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('references undefined source'))).toBe(true);
    });

    it('reports warning for none?/any? on scalar source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
      ];
      const outcome = makeOutcome({ source: 'total', conditions: ['none?'] });
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [outcome], validParameters);
      expect(errors.some((e) => !e.blocking && e.message.includes('none?'))).toBe(true);
    });

    it('reports error for more than 10 outcomes', () => {
      const outcomes = Array.from({ length: 11 }, (_, i) => makeOutcome({ id: `o${i}`, name: `O${i}`, conditions: [{ op: '>=', value: i }], isDefault: i === 10 }));
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, outcomes, validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 10 outcomes'))).toBe(true);
    });

    it('reports error for outcome with more than 5 conditions', () => {
      const outcome = makeOutcome({
        conditions: [
          { op: '>=', value: 1 },
          { op: '<=', value: 2 },
          { op: '=', value: 3 },
          { op: '!=', value: 4 },
          { op: '>', value: 5 },
          { op: '<', value: 6 },
        ],
      });
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [outcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('more than 5 conditions'))).toBe(true);
    });
  });

  describe('pipeline validation', () => {
    it('reports error for duplicate pipeline names', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'total', source: 'rolled', op: 'max', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Duplicate pipeline name'))).toBe(true);
    });

    it('reports error for invalid pipeline name', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: '123bad', source: 'rolled', op: 'sum', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('must match'))).toBe(true);
    });

    it('reports error for pipeline referencing undefined source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'result', source: 'nonexistent', op: 'sum', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('references undefined source'))).toBe(true);
    });

    it('reports error for pipeline referencing source that appears later', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'a', source: 'b', op: 'sum', comment: '' },
        { id: 'p2', name: 'b', source: 'rolled', op: 'sum', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('appears later in pipeline'))).toBe(true);
    });

    it('reports error for self-referencing pipeline', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'a', source: 'rolled', op: 'sum' as const, comment: '' },
        { id: 'p2', name: 'b', source: 'a', op: { fn: 'add' as const, operand: 'named' as const, source2: 'b' }, comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('cannot reference itself'))).toBe(true);
    });

    it('reports non-blocking error for divide by zero', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'div', source: 'total', op: { fn: 'divide', operand: 'literal', value: 0 }, comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
      expect(errors.some((e) => !e.blocking && e.message.includes('divides by zero'))).toBe(true);
    });

    it('reports error for applying scalar op to scalar source', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
        { id: 'p2', name: 'counted', source: 'total', op: 'count', comment: '' },
      ];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], validParameters);
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
      const errors = validateConfig(validPool, validRerollConditions, pipeline2, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 20 pipeline'))).toBe(true);
    });
  });

  describe('reroll condition validation', () => {
    it('reports error for more than 10 reroll conditions', () => {
      const conditions: RerollCondition[] = Array.from({ length: 11 }, (_, i) => ({
        id: `rc${i}`,
        action: 'reroll' as const,
        conditions: { clauses: [{ field: 'face' as const, operator: '>=' as const, value: 1 }], connector: 'and' as const },
        repeat: 1,
        comment: '',
      }));
      const errors = validateConfig(validPool, conditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 10 reroll'))).toBe(true);
    });

    it('reports error for repeat < 1', () => {
      const conditions: RerollCondition[] = [{
        id: 'rc1',
        action: 'reroll',
        conditions: { clauses: [{ field: 'face', operator: '>=', value: 1 }], connector: 'and' },
        repeat: 0,
        comment: '',
      }];
      const errors = validateConfig(validPool, conditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Reroll repeat must be >= 1'))).toBe(true);
    });
  });

  describe('parameter validation', () => {
    it('reports error for more than 3 parameters', () => {
      const parameters: Parameter[] = Array.from({ length: 4 }, (_, i) => ({
        id: `pm${i}`,
        label: `P${i}`,
        values: [1, 2, 3],
        target: 'outcome.value' as const,
        targetOutcomeId: 'o1',
      }));
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], parameters);
      expect(errors.some((e) => e.blocking && e.message.includes('Maximum 3 parameters'))).toBe(true);
    });

    it('reports error for parameter referencing invalid dice term', () => {
      const parameters: Parameter[] = [{
        id: 'pm1',
        label: 'Count',
        values: [1, 2],
        target: 'pool.count',
        targetTermId: 'nonexistent',
      }];
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], parameters);
      expect(errors.some((e) => e.blocking && e.message.includes('references invalid dice term'))).toBe(true);
    });

    it('reports error for parameter referencing invalid outcome', () => {
      const parameters: Parameter[] = [{
        id: 'pm1',
        label: 'DC',
        values: [10, 15],
        target: 'outcome.value',
        targetOutcomeId: 'nonexistent',
      }];
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], parameters);
      expect(errors.some((e) => e.blocking && e.message.includes('references invalid outcome'))).toBe(true);
    });

    it('reports error for parameter referencing invalid pipeline step', () => {
      const pipeline: NamedValue[] = [
        { id: 'p1', name: 'total', source: 'rolled', op: { fn: 'add', operand: 'literal', value: 5 }, comment: '' },
      ];
      const parameters: Parameter[] = [{
        id: 'pm1',
        label: 'Mod',
        values: [1, 2],
        target: 'pipeline.literal',
        targetPipelineId: 'nonexistent',
      }];
      const errors = validateConfig(validPool, validRerollConditions, pipeline, [validOutcome], parameters);
      expect(errors.some((e) => e.blocking && e.message.includes('references invalid pipeline step'))).toBe(true);
    });

    it('reports warning for high total iterations', () => {
      const parameters: Parameter[] = [{
        id: 'pm1',
        label: 'X',
        values: Array.from({ length: 15 }, (_, i) => i + 1),
        target: 'outcome.value',
        targetOutcomeId: 'o1',
      }];
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], parameters);
      expect(errors.some((e) => !e.blocking && e.message.includes('high'))).toBe(true);
    });
  });

  describe('valid configurations', () => {
    it('returns no blocking errors for valid config', () => {
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors.some((e) => e.blocking)).toBe(false);
    });

    it('returns empty array for minimal valid config', () => {
      const errors = validateConfig(validPool, validRerollConditions, validPipeline, [validOutcome], validParameters);
      expect(errors).toEqual([]);
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