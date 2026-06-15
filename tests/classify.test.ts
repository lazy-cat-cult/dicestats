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
      source: 'total',
      conditions: [{ op: '>=', value: 15 }],
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
      source: 'rolled',
      conditions: [{ op: '>=', value: 15 }],
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
      source: 'rolled',
      conditions: [{ op: 'any', subCondition: '=', value: 6 }],
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
      source: 'rolled',
      conditions: [{ op: 'none', subCondition: '>=', value: 6 }],
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
      source: 'rolled',
      conditions: [{ op: 'all', subCondition: '>=', value: 6 }],
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
      source: 'total',
      conditions: [{ op: '>=', value: 7 }, { op: '<=', value: 9 }],
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
      { id: '1', name: 'Hit', source: 'total', conditions: [{ op: '>=', value: 20 }], connector: 'and', comment: '', isDefault: false },
      { id: '2', name: 'Miss', source: 'total', conditions: [], connector: 'and', comment: '', isDefault: true },
    ];
    const env = makeEnv([{ face: 10, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toBe('Miss');
  });

  it('evaluates PbtA 2d6 outcomes via pipeline sum', () => {
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Miss', source: 'total', conditions: [{ op: '<=', value: 6 }], connector: 'and', comment: '', isDefault: false },
      { id: 'o2', name: 'Partial', source: 'total', conditions: [{ op: '>=', value: 7 }, { op: '<=', value: 9 }], connector: 'and', comment: '', isDefault: false },
      { id: 'o3', name: 'Full Success', source: 'total', conditions: [{ op: '>=', value: 10 }], connector: 'and', comment: '', isDefault: false },
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
      { id: '1', name: 'Crit', source: 'total', conditions: [{ op: '>=', value: 20 }], connector: 'and', comment: '', isDefault: false },
      { id: '2', name: 'Hit', source: 'total', conditions: [{ op: '>=', value: 10 }], connector: 'and', comment: '', isDefault: false },
    ];
    const env = makeEnv([{ face: 20, tag: '' }], pipeline);
    expect(evaluateOutcomes(outcomes, env)).toBe('Crit');
  });
});