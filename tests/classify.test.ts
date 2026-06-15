import { describe, it, expect } from 'vitest';
import { evaluateOutcome, evaluateOutcomes } from '@/domain/classify';
import type { Outcome, TaggedDie, PipelineValue, NamedValue } from '@/types';
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
      isDefault: false,
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
      isDefault: false,
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
      isDefault: false,
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
      isDefault: false,
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
      isDefault: false,
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
      isDefault: false,
    };
    const env = makeEnv([{ face: 5, tag: '' }, { face: 3, tag: '' }], pipeline);
    expect(evaluateOutcome(outcome, env)).toBe(true);

    const env2 = makeEnv([{ face: 6, tag: '' }, { face: 5, tag: '' }], pipeline);
    expect(evaluateOutcome(outcome, env2)).toBe(false);
  });

  it('evaluates default outcome when no other matches', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: '1', name: 'Hit', conditions: [{ source: 'total', op: '>=', value: 20 }], connector: 'and', comment: '', isDefault: false },
      { id: '2', name: 'Miss', conditions: [], connector: 'and', comment: '', isDefault: true },
    ];
    const env = makeEnv([{ face: 10, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toBe('Miss');
  });

  it('evaluates PbtA 2d6 outcomes via pipeline sum', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Miss', conditions: [{ source: 'total', op: '<=', value: 6 }], connector: 'and', comment: '', isDefault: false },
      { id: 'o2', name: 'Partial', conditions: [{ source: 'total', op: '>=', value: 7 }, { source: 'total', op: '<=', value: 9 }], connector: 'and', comment: '', isDefault: false },
      { id: 'o3', name: 'Full Success', conditions: [{ source: 'total', op: '>=', value: 10 }], connector: 'and', comment: '', isDefault: false },
    ];

    const env1 = makeEnv([{ face: 3, tag: '' }, { face: 2, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env1)).toBe('Miss');

    const env2 = makeEnv([{ face: 5, tag: '' }, { face: 3, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env2)).toBe('Partial');

    const env3 = makeEnv([{ face: 6, tag: '' }, { face: 5, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env3)).toBe('Full Success');
  });

  it('first matching outcome wins', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: '1', name: 'Crit', conditions: [{ source: 'total', op: '>=', value: 20 }], connector: 'and', comment: '', isDefault: false },
      { id: '2', name: 'Hit', conditions: [{ source: 'total', op: '>=', value: 10 }], connector: 'and', comment: '', isDefault: false },
    ];
    const env = makeEnv([{ face: 20, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toBe('Crit');
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
      isDefault: false,
    };
    const envMatch = makeEnv([{ face: 17, tag: '' }], pipeline);
    envMatch.set('delta', 5);
    expect(evaluateOutcome(outcome, envMatch)).toBe(true);

    const envNoMatch = makeEnv([{ face: 17, tag: '' }], pipeline);
    envNoMatch.set('delta', -3);
    expect(evaluateOutcome(outcome, envNoMatch)).toBe(false);
  });
});