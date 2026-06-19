import { describe, it, expect } from 'vitest';
import { applyRerollConditions } from '@/domain/reroll';
import type { RerollCondition, TaggedDie } from '@/types';
import { literalExpr } from '@/utils/expression';

describe('applyRerollConditions', () => {
  const fallbackSides = [{ sides: 6, tag: '' }];

  it('no conditions returns dice unchanged', () => {
    const dice: TaggedDie[] = [{ face: 3, tag: '' }, { face: 5, tag: '' }];
    const result = applyRerollConditions(dice, [], fallbackSides, { x: 0, y: 0 });
    expect(result).toEqual(dice);
  });

  it('reroll matching dice once', () => {
    const dice: TaggedDie[] = [{ face: 1, tag: '' }, { face: 5, tag: '' }];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'reroll',
      conditions: { clauses: [{ field: 'face', operator: '=', value: literalExpr(1) }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const result = applyRerollConditions(dice, [rc], fallbackSides, { x: 0, y: 0 });
    expect(result.length).toBe(2);
    expect(result[1].face).toBe(5);
  });

  it('explode adds extra die on match', () => {
    const dice: TaggedDie[] = [{ face: 6, tag: '' }];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'explode',
      conditions: { clauses: [{ field: 'face', operator: '=', value: literalExpr(6) }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const result = applyRerollConditions(dice, [rc], fallbackSides, { x: 0, y: 0 });
    expect(result.length).toBe(2);
    expect(result[0].face).toBe(6);
  });

  it('tag-based condition only affects matching tags', () => {
    const dice: TaggedDie[] = [
      { face: 1, tag: 'hunger' },
      { face: 1, tag: 'normal' },
    ];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'reroll',
      conditions: { clauses: [{ field: 'tag', operator: '=', value: 'hunger' }, { field: 'face', operator: '=', value: literalExpr(1) }], connectors: [] },
      repeat: 3,
      comment: '',
      tagAs: '',
    };
    const sidesMap = [{ sides: 10, tag: 'hunger' }, { sides: 10, tag: 'normal' }];
    const result = applyRerollConditions(dice, [rc], sidesMap, { x: 0, y: 0 });
    expect(result.length).toBe(2);
    expect(result[1].tag).toBe('normal');
    expect(result[1].face).toBe(1);
  });

  it('conditions cascade sequentially', () => {
    const dice: TaggedDie[] = [{ face: 6, tag: '' }];
    const rc1: RerollCondition = {
      id: 'rc1',
      action: 'explode',
      conditions: { clauses: [{ field: 'face', operator: '=', value: literalExpr(6) }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const rc2: RerollCondition = {
      id: 'rc2',
      action: 'reroll',
      conditions: { clauses: [{ field: 'face', operator: '=', value: literalExpr(1) }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const result = applyRerollConditions(dice, [rc1, rc2], fallbackSides, { x: 0, y: 0 });
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('explode on max_value triggers for die showing max face', () => {
    const dice: TaggedDie[] = [{ face: 6, tag: '' }];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'explode',
      conditions: { clauses: [{ field: 'face', operator: 'is_max' }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const result = applyRerollConditions(dice, [rc], fallbackSides, { x: 0, y: 0 });
    expect(result.length).toBe(2);
    expect(result[0].face).toBe(6);
  });

  it('explode on max_value does not trigger for die below max', () => {
    const dice: TaggedDie[] = [{ face: 4, tag: '' }];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'explode',
      conditions: { clauses: [{ field: 'face', operator: 'is_max' }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const result = applyRerollConditions(dice, [rc], fallbackSides, { x: 0, y: 0 });
    expect(result.length).toBe(1);
    expect(result[0].face).toBe(4);
  });

  it('explode on max_value respects tagged die sides', () => {
    const dice: TaggedDie[] = [{ face: 10, tag: 'hunger' }];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'explode',
      conditions: { clauses: [{ field: 'face', operator: 'is_max' }], connectors: [] },
      repeat: 1,
      comment: '',
      tagAs: '',
    };
    const sidesMap = [{ sides: 20, tag: '' }, { sides: 10, tag: 'hunger' }];
    const result = applyRerollConditions(dice, [rc], sidesMap, { x: 0, y: 0 });
    expect(result.length).toBe(2);
    expect(result[0].face).toBe(10);
  });

  it('reroll on min_value (face = 1)', () => {
    const dice: TaggedDie[] = [{ face: 1, tag: '' }, { face: 5, tag: '' }];
    const rc: RerollCondition = {
      id: 'rc1',
      action: 'reroll',
      conditions: { clauses: [{ field: 'face', operator: 'is_min' }], connectors: [] },
      repeat: 3,
      comment: '',
      tagAs: '',
    };
    const result = applyRerollConditions(dice, [rc], fallbackSides, { x: 0, y: 0 });
    expect(result.length).toBe(2);
    expect(result[1].face).toBe(5);
  });
});
