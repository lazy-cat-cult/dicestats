import { describe, it, expect } from 'vitest';
import { evaluateOutcome, evaluateOutcomes } from '@/domain/classify';
import type { Outcome, TaggedDie, PipelineValue, NamedValue } from '@/types';
import { NOT_MATCHED_LABEL } from '@/types';
import { evaluatePipeline } from '@/domain/resolve';

function makeEnv(rolled: TaggedDie[], pipeline: NamedValue[] = []): Map<string, PipelineValue> {
  return evaluatePipeline(rolled, pipeline);
}

describe('evaluateOutcome', () => {
  it('evaluates scalar comparison (>=) via pipeline sum', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcome: Outcome = {
      id: '1',
      name: 'Hit',
      conditions: [{ source: 'total', op: '>=', value: 15 }],
      connector: 'and',
      comment: '',
    };
    const env = makeEnv([{ face: 18, tag: '' }], pipeline);
    expect(evaluateOutcome(outcome, env)).toBe(true);

    const env2 = makeEnv([{ face: 10, tag: '' }], pipeline);
    expect(evaluateOutcome(outcome, env2)).toBe(false);
  });

  it('rejects comparison on vector source (no implicit sum)', () => {
    const outcome: Outcome = {
      id: '1',
      name: 'Hit',
      conditions: [{ source: 'rolled', op: '>=', value: 15 }],
      connector: 'and',
      comment: '',
    };
    const env = new Map<string, PipelineValue>();
    env.set('rolled', [{ face: 18, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(false);
  });

  it('evaluates any dice condition on vector', () => {
    const outcome: Outcome = {
      id: '1',
      name: 'Any six',
      conditions: [{ source: 'rolled', op: 'any', subCondition: '=', value: 6 }],
      connector: 'and',
      comment: '',
    };
    const env = new Map<string, PipelineValue>();
    env.set('rolled', [{ face: 6, tag: '' }, { face: 3, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(true);

    env.set('rolled', [{ face: 4, tag: '' }, { face: 3, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(false);

    env.set('rolled', []);
    expect(evaluateOutcome(outcome, env)).toBe(false);
  });

  it('evaluates none dice condition on vector', () => {
    const outcome: Outcome = {
      id: '1',
      name: 'No hits',
      conditions: [{ source: 'rolled', op: 'none', subCondition: '>=', value: 6 }],
      connector: 'and',
      comment: '',
    };
    const env = new Map<string, PipelineValue>();
    env.set('rolled', [{ face: 4, tag: '' }, { face: 3, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(true);

    env.set('rolled', [{ face: 6, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(false);

    env.set('rolled', []);
    expect(evaluateOutcome(outcome, env)).toBe(true);
  });

  it('evaluates all dice condition on vector', () => {
    const outcome: Outcome = {
      id: '1',
      name: 'All >= 6',
      conditions: [{ source: 'rolled', op: 'all', subCondition: '>=', value: 6 }],
      connector: 'and',
      comment: '',
    };
    const env = new Map<string, PipelineValue>();
    env.set('rolled', [{ face: 6, tag: '' }, { face: 8, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(true);

    env.set('rolled', [{ face: 6, tag: '' }, { face: 3, tag: '' }]);
    expect(evaluateOutcome(outcome, env)).toBe(false);
  });

  it('evaluates AND connector with scalar source', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcome: Outcome = {
      id: '1',
      name: 'Range',
      conditions: [{ source: 'total', op: '>=', value: 7 }, { source: 'total', op: '<=', value: 9 }],
      connector: 'and',
      comment: '',
    };
    const env = makeEnv([{ face: 5, tag: '' }, { face: 3, tag: '' }], pipeline);
    expect(evaluateOutcome(outcome, env)).toBe(true);

    const env2 = makeEnv([{ face: 6, tag: '' }, { face: 5, tag: '' }], pipeline);
    expect(evaluateOutcome(outcome, env2)).toBe(false);
  });

  it('evaluates outcomes and returns Not matched when no match', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: '1', name: 'Hit', conditions: [{ source: 'total', op: '>=', value: 20 }], connector: 'and', comment: '' },
    ];
    const env = makeEnv([{ face: 10, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toEqual([NOT_MATCHED_LABEL]);
  });

  it('evaluates PbtA 2d6 outcomes via pipeline sum', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Miss', conditions: [{ source: 'total', op: '<=', value: 6 }], connector: 'and', comment: '' },
      { id: 'o2', name: 'Partial', conditions: [{ source: 'total', op: '>=', value: 7 }, { source: 'total', op: '<=', value: 9 }], connector: 'and', comment: '' },
      { id: 'o3', name: 'Full Success', conditions: [{ source: 'total', op: '>=', value: 10 }], connector: 'and', comment: '' },
    ];

    const env1 = makeEnv([{ face: 3, tag: '' }, { face: 2, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env1)).toEqual(['Miss']);

    const env2 = makeEnv([{ face: 5, tag: '' }, { face: 3, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env2)).toEqual(['Partial']);

    const env3 = makeEnv([{ face: 6, tag: '' }, { face: 5, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env3)).toEqual(['Full Success']);
  });

  it('records all matching outcomes independently', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: '1', name: 'Crit', conditions: [{ source: 'total', op: '>=', value: 20 }], connector: 'and', comment: '' },
      { id: '2', name: 'Hit', conditions: [{ source: 'total', op: '>=', value: 10 }], connector: 'and', comment: '' },
    ];
    const env = makeEnv([{ face: 20, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toEqual(['Crit', 'Hit']);
  });

  it('returns Not matched when no outcome matches', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: '1', name: 'Hit', conditions: [{ source: 'total', op: '>=', value: 20 }], connector: 'and', comment: '' },
    ];
    const env = makeEnv([{ face: 10, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toEqual([NOT_MATCHED_LABEL]);
  });

  it('Not matched is not added when other outcomes match', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: '1', name: 'Big', conditions: [{ source: 'total', op: '>=', value: 15 }], connector: 'and', comment: '' },
    ];
    const envBig = makeEnv([{ face: 18, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, envBig)).toEqual(['Big']);
  });

  it('Daggerheart compound outcomes evaluate independently', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'delta', source: 'rolled', op: { fn: 'add', operand: 'literal', value: 2 }, comment: '' },
      { id: 'p2', name: 'total_mod', source: 'rolled', op: { fn: 'add', operand: 'literal', value: 17 }, comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Critical Success', conditions: [{ source: 'delta', op: '=', value: 0 }], connector: 'and', comment: '' },
      { id: 'o2', name: 'Success with Hope', conditions: [{ source: 'delta', op: '>', value: 0 }, { source: 'total_mod', op: '>=', value: 15 }], connector: 'and', comment: '' },
      { id: 'o3', name: 'Success with Fear', conditions: [{ source: 'delta', op: '<', value: 0 }, { source: 'total_mod', op: '>=', value: 15 }], connector: 'and', comment: '' },
      { id: 'o4', name: 'Failure with Hope', conditions: [{ source: 'delta', op: '>=', value: 0 }, { source: 'total_mod', op: '<', value: 15 }], connector: 'and', comment: '' },
      { id: 'o5', name: 'Failure with Fear', conditions: [{ source: 'delta', op: '<', value: 0 }, { source: 'total_mod', op: '<', value: 15 }], connector: 'and', comment: '' },
    ];

    const envHopeHigh = makeEnv([{ face: 10, tag: '' }], pipeline);
    envHopeHigh.set('delta', 2);
    envHopeHigh.set('total_mod', 17);
    expect(evaluateOutcomes(outcomes, envHopeHigh)).toEqual(['Success with Hope']);

    const envFearHigh = makeEnv([{ face: 5, tag: '' }], pipeline);
    envFearHigh.set('delta', -3);
    envFearHigh.set('total_mod', 17);
    expect(evaluateOutcomes(outcomes, envFearHigh)).toEqual(['Success with Fear']);
  });

  it('AND connector across two different sources', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
      { id: 'p2', name: 'delta', source: 'rolled', op: { fn: 'add', operand: 'literal', value: 5 }, comment: '' },
    ];
    const outcome: Outcome = {
      id: '1',
      name: 'Critical Hit',
      conditions: [
        { source: 'total', op: '>=', value: 15 },
        { source: 'delta', op: '>=', value: 0 },
      ],
      connector: 'and',
      comment: '',
    };
    const envMatch = makeEnv([{ face: 17, tag: '' }], pipeline);
    envMatch.set('delta', 5);
    expect(evaluateOutcome(outcome, envMatch)).toBe(true);

    const envNoMatch = makeEnv([{ face: 17, tag: '' }], pipeline);
    envNoMatch.set('delta', -3);
    expect(evaluateOutcome(outcome, envNoMatch)).toBe(false);
  });
});