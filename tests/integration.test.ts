import { describe, it, expect } from 'vitest';
import type { DicePool, Outcome, OutcomeCondition, NamedValue, TaggedDie } from '@/types';
import { rollPool } from '@/domain/roller';
import { evaluateOutcomes } from '@/domain/classify';
import { evaluatePipeline } from '@/domain/resolve';

describe('dice mechanics: rollPool basics', () => {
  it('2d6 total ranges from 2 to 12', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: 2, sides: 6, tag: '' }],
    };
    let min = 100, max = 0;
    for (let i = 0; i < 5000; i++) {
      const dice = rollPool(pool);
      const total = dice.reduce((s, d) => s + d.face, 0);
      if (total < min) min = total;
      if (total > max) max = total;
    }
    expect(min).toBe(2);
    expect(max).toBe(12);
  });

  it('2d6 mean is approximately 7', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: 2, sides: 6, tag: '' }],
    };
    let sum = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      sum += rollPool(pool).reduce((s, d) => s + d.face, 0);
    }
    const avg = sum / N;
    expect(avg).toBeGreaterThan(6.5);
    expect(avg).toBeLessThan(7.5);
  });

  it('1d6 produces all faces with reasonable frequency', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: 1, sides: 6, tag: '' }],
    };
    const counts = new Map<number, number>();
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      counts.set(dice[0].face, (counts.get(dice[0].face) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (let face = 1; face <= 6; face++) {
      expect(counts.get(face)).toBeGreaterThan(8000);
      expect(counts.get(face)).toBeLessThan(12000);
    }
  });
});

describe('dice mechanics: keep via pipeline', () => {
  it('D&D advantage: 2d20 max via pipeline', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: 2, sides: 20, tag: '' }],
    };
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'best', source: 'rolled', op: 'max', comment: '' },
    ];
    let maxBest = 0;
    for (let i = 0; i < 5000; i++) {
      const dice = rollPool(pool);
      const env = evaluatePipeline(dice, pipeline);
      const best = env.get('best') as number;
      if (best > maxBest) maxBest = best;
    }
    expect(maxBest).toBe(20);
  });
});

describe('dice mechanics: outcomes with pipeline', () => {
  it('Shadowrun: 5d6 at least 1 hit (>=5) via pipeline', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: 5, sides: 6, tag: '' }],
    };
    const pipeline = [
      {
        id: 'p1',
        name: 'hits',
        source: 'rolled',
        op: { fn: 'filter' as const, conditions: { clauses: [{ field: 'face' as const, operator: '>=' as const, value: 5 }], connector: 'and' as const } },
        comment: '',
      },
      { id: 'p2', name: 'hit_count', source: 'hits', op: 'count' as const, comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: '1+ hits', source: 'hit_count', conditions: [{ op: '>=' as const, value: 1 }], connector: 'and' as const, comment: '', isDefault: false },
    ];

    let successCount = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      const env = evaluatePipeline(dice, pipeline);
      env.set('rolled', dice);
      if (evaluateOutcomes(outcomes, env)) successCount++;
    }
    const prob = successCount / N;
    expect(prob).toBeGreaterThan(0.83);
    expect(prob).toBeLessThan(0.92);
  });

  it('PbtA: 2d6 sum outcomes', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: 2, sides: 6, tag: '' }],
    };
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Hit', source: 'rolled', conditions: ['any?' as OutcomeCondition], connector: 'and', comment: '', isDefault: false },
    ];

    const env = new Map<string, any>();
    let hitCount = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      env.set('rolled', dice);
      const result = evaluateOutcomes(outcomes, env);
      if (result === 'Hit') hitCount++;
    }
    expect(hitCount / N).toBeGreaterThan(0.99);
  });
});

describe('dice mechanics: tagged dice', () => {
  it('rolls mixed tags correctly', () => {
    const pool: DicePool = {
      terms: [
        { id: '1', count: 3, sides: 10, tag: 'normal' },
        { id: '2', count: 2, sides: 10, tag: 'hunger' },
      ],
    };
    const dice = rollPool(pool);
    expect(dice.length).toBe(5);
    const normalDice = dice.filter((d) => d.tag === 'normal');
    const hungerDice = dice.filter((d) => d.tag === 'hunger');
    expect(normalDice.length).toBe(3);
    expect(hungerDice.length).toBe(2);
    expect(normalDice.every((d) => d.face >= 1 && d.face <= 10)).toBe(true);
    expect(hungerDice.every((d) => d.face >= 1 && d.face <= 10)).toBe(true);
  });
});