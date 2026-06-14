import { describe, it, expect } from 'vitest';
import { evaluatePipeline } from '@/domain/resolve';
import type { NamedValue, TaggedDie } from '@/types';

describe('evaluatePipeline', () => {
  it('returns rolled as vector source', () => {
    const rolled: TaggedDie[] = [{ face: 5, tag: '' }, { face: 3, tag: '' }];
    const env = evaluatePipeline(rolled, []);
    expect(env.get('rolled')).toEqual(rolled);
  });

  it('filter produces a vector', () => {
    const rolled: TaggedDie[] = [
      { face: 5, tag: '' },
      { face: 2, tag: '' },
      { face: 6, tag: '' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'hits',
        source: 'rolled',
        op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: 5 }], connector: 'and' } },
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    const hits = env.get('hits') as TaggedDie[];
    expect(hits.length).toBe(2);
    expect(hits[0].face).toBe(5);
    expect(hits[1].face).toBe(6);
  });

  it('remove filters out matching dice', () => {
    const rolled: TaggedDie[] = [
      { face: 1, tag: '' },
      { face: 5, tag: '' },
      { face: 2, tag: '' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'non_ones',
        source: 'rolled',
        op: { fn: 'remove', conditions: { clauses: [{ field: 'face', operator: '=', value: 1 }], connector: 'and' } },
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    const nonOnes = env.get('non_ones') as TaggedDie[];
    expect(nonOnes.length).toBe(2);
  });

  it('count produces a scalar', () => {
    const rolled: TaggedDie[] = [
      { face: 5, tag: '' },
      { face: 2, tag: '' },
      { face: 6, tag: '' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'hits',
        source: 'rolled',
        op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: 5 }], connector: 'and' } },
        comment: '',
      },
      {
        id: 'p2',
        name: 'hit_count',
        source: 'hits',
        op: 'count',
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('hit_count')).toBe(2);
  });

  it('sum produces a scalar from vector faces', () => {
    const rolled: TaggedDie[] = [
      { face: 5, tag: '' },
      { face: 3, tag: '' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'total',
        source: 'rolled',
        op: 'sum',
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('total')).toBe(8);
  });

  it('sum on filtered vector', () => {
    const rolled: TaggedDie[] = [
      { face: 5, tag: '' },
      { face: 2, tag: '' },
      { face: 6, tag: '' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'hits',
        source: 'rolled',
        op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: 5 }], connector: 'and' } },
        comment: '',
      },
      {
        id: 'p2',
        name: 'hit_total',
        source: 'hits',
        op: 'sum',
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('hit_total')).toBe(11);
  });

  it('max returns highest face value', () => {
    const rolled: TaggedDie[] = [
      { face: 5, tag: 'a' },
      { face: 10, tag: 'b' },
      { face: 3, tag: 'c' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'best',
        source: 'rolled',
        op: 'max' as const,
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('best')).toBe(10);
  });

  it('min returns lowest face value', () => {
    const rolled: TaggedDie[] = [
      { face: 5, tag: 'a' },
      { face: 10, tag: 'b' },
      { face: 3, tag: 'c' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'worst',
        source: 'rolled',
        op: 'min' as const,
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('worst')).toBe(3);
  });

  it('scalar math operations', () => {
    const rolled: TaggedDie[] = [{ face: 5, tag: '' }, { face: 3, tag: '' }];
    const pipeline: NamedValue[] = [
      {
        id: 'p0',
        name: 'cnt',
        source: 'rolled',
        op: 'count' as any,
        comment: '',
      },
      {
        id: 'p1',
        name: 'doubled',
        source: 'cnt',
        op: { fn: 'multiply', operand: 'literal', value: 2 },
        comment: '',
      },
    ];
    const env1 = evaluatePipeline(rolled, pipeline);
    expect(env1.get('doubled')).toBe(4);

    const pipeline2: NamedValue[] = [
      {
        id: 'p0',
        name: 'cnt',
        source: 'rolled',
        op: 'count' as any,
        comment: '',
      },
      {
        id: 'p1',
        name: 'plus_five',
        source: 'cnt',
        op: { fn: 'add', operand: 'literal', value: 5 },
        comment: '',
      },
    ];
    const env2 = evaluatePipeline(rolled, pipeline2);
    expect(env2.get('plus_five')).toBe(7);
  });

  it('ceil and floor', () => {
    const rolled: TaggedDie[] = [{ face: 5, tag: '' }];
    const pipeline: NamedValue[] = [
      {
        id: 'p0',
        name: 'cnt',
        source: 'rolled',
        op: 'count' as any,
        comment: '',
      },
      {
        id: 'p1',
        name: 'half',
        source: 'cnt',
        op: { fn: 'divide', operand: 'literal', value: 3 },
        comment: '',
      },
      {
        id: 'p2',
        name: 'ceiled',
        source: 'half',
        op: { fn: 'ceil' },
        comment: '',
      },
      {
        id: 'p3',
        name: 'floored',
        source: 'half',
        op: { fn: 'floor' },
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    const half = env.get('half') as number;
    expect(half).toBeCloseTo(1 / 3, 10);
    expect(env.get('ceiled')).toBe(Math.ceil(1 / 3));
    expect(env.get('floored')).toBe(Math.floor(1 / 3));
  });

  it('divide by zero returns 0', () => {
    const rolled: TaggedDie[] = [{ face: 5, tag: '' }];
    const pipeline: NamedValue[] = [
      {
        id: 'p0',
        name: 'cnt',
        source: 'rolled',
        op: 'count' as any,
        comment: '',
      },
      {
        id: 'p1',
        name: 'result',
        source: 'cnt',
        op: { fn: 'divide', operand: 'literal', value: 0 },
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('result')).toBe(0);
  });

  it('named source in binary op', () => {
    const rolled: TaggedDie[] = [
      { face: 6, tag: '' },
      { face: 4, tag: '' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'hits',
        source: 'rolled',
        op: { fn: 'filter', conditions: { clauses: [{ field: 'face', operator: '>=', value: 5 }], connector: 'and' } },
        comment: '',
      },
      {
        id: 'p2',
        name: 'hit_count',
        source: 'hits',
        op: 'count',
        comment: '',
      },
      {
        id: 'p3',
        name: 'doubled_hits',
        source: 'hit_count',
        op: { fn: 'multiply', operand: 'literal', value: 2 },
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    expect(env.get('hit_count')).toBe(1);
    expect(env.get('doubled_hits')).toBe(2);
  });

  it('tag-based filter', () => {
    const rolled: TaggedDie[] = [
      { face: 10, tag: 'hunger' },
      { face: 6, tag: 'normal' },
      { face: 8, tag: 'hunger' },
    ];
    const pipeline: NamedValue[] = [
      {
        id: 'p1',
        name: 'hunger_dice',
        source: 'rolled',
        op: { fn: 'filter', conditions: { clauses: [{ field: 'tag', operator: '=', value: 'hunger' }], connector: 'and' } },
        comment: '',
      },
    ];
    const env = evaluatePipeline(rolled, pipeline);
    const hungerDice = env.get('hunger_dice') as TaggedDie[];
    expect(hungerDice.length).toBe(2);
    expect(hungerDice.every((d) => d.tag === 'hunger')).toBe(true);
  });
});