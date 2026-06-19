import { describe, it, expect } from 'vitest';
import type { DicePool, Outcome, NamedValue, PipelineValue } from '@/types';
import { rollPool } from '@/domain/roller';
import { evaluateOutcomes } from '@/domain/classify';
import { evaluatePipeline } from '@/domain/resolve';
import { literalExpr } from '@/utils/expression';

describe('dice mechanics: rollPool basics', () => {
  it('2d6 total ranges from 2 to 12', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(6), tag: '', comment: '' }],
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
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(6), tag: '', comment: '' }],
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
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
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
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(20), tag: '', comment: '' }],
    };
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'hits', source: 'rolled',
        op: { fn: 'filter' as const, conditions: { clauses: [{ field: 'face' as const, operator: '>=' as const, value: literalExpr(5) }], connectors: [] as const } },
        comment: '',
      } as NamedValue,
      { id: 'p2', name: 'hit_count', source: 'hits', op: 'count' as const, comment: '' } as NamedValue,
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: '1+ hits', conditions: [{ source: 'hit_count', op: '>=' as const, value: literalExpr(1) }], connectors: [] as const, comment: '' },
    ];

    let successCount = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      const env = evaluatePipeline(dice, pipeline);
      env.set('rolled', dice);
      if (evaluateOutcomes(outcomes, env).includes('1+ hits')) successCount++;
    }
    const prob = successCount / N;
    expect(prob).toBeGreaterThan(0.93);
    expect(prob).toBeLessThan(0.98);
  });

  it('PbtA: 2d6 sum outcomes', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Hit', conditions: [{ source: 'rolled', op: 'any', subCondition: '>=' as const, value: literalExpr(1) }], connectors: [], comment: '' },
    ];

    const env = new Map<string, PipelineValue>();
    let hitCount = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      env.set('rolled', dice);
      const result = evaluateOutcomes(outcomes, env);
      if (result.includes('Hit')) hitCount++;
    }
    expect(hitCount / N).toBeGreaterThan(0.99);
  });
});

describe('dice mechanics: compound outcomes (per-condition source)', () => {
  it('AND across two different pipeline values', () => {
    const pool: DicePool = {
      terms: [
        { id: 'd12-hope', count: literalExpr(1), sides: literalExpr(12), tag: 'hope', comment: '' },
        { id: 'd12-fear', count: literalExpr(1), sides: literalExpr(12), tag: 'fear', comment: '' },
      ],
    };
    const pipeline: NamedValue[] = [
      { id: 'p1', name: 'total', source: 'rolled', op: 'sum', comment: '' },
      { id: 'p2', name: 'delta', source: 'rolled', op: { fn: 'add', terms: [{ operand: 'val', value: literalExpr(0) }] }, comment: '' },
    ];
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Critical Hit', conditions: [{ source: 'total', op: '>=', value: literalExpr(15) }, { source: 'delta', op: '>=', value: literalExpr(0) }], connectors: ['and'], comment: '' },
    ];
    let matched = 0;
    for (let i = 0; i < 20000; i++) {
      const dice = rollPool(pool);
      const env = evaluatePipeline(dice, pipeline);
      env.set('delta', 3);
      if (evaluateOutcomes(outcomes, env).length > 0) matched++;
    }
    expect(matched).toBeGreaterThan(0);
  });
});

describe('dice mechanics: tagged dice', () => {
  it('rolls mixed tags correctly', () => {
    const pool: DicePool = {
      terms: [
        { id: '1', count: literalExpr(3), sides: literalExpr(10), tag: 'normal', comment: '' },
        { id: '2', count: literalExpr(2), sides: literalExpr(10), tag: 'hunger', comment: '' },
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

describe('outcome overlap counting', () => {
  it('counts pairwise co-occurrences for overlapping outcomes', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'High', conditions: [{ source: 'face', op: '>=', value: literalExpr(4) }], connectors: [], comment: '' },
      { id: 'o2', name: 'Even', conditions: [{ source: 'face', op: '=', value: literalExpr(4) }, { source: 'face', op: '=', value: literalExpr(6) }], connectors: ['or'], comment: '' },
    ];

    const overlapCounts = new Map<string, number>();
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      const env = new Map<string, PipelineValue>();
      env.set('rolled', dice);
      env.set('face', dice[0]!.face);
      const matched = evaluateOutcomes(outcomes, env);
      if (matched.length > 1) {
        const sorted = [...matched].sort();
        for (let a = 0; a < sorted.length; a++) {
          for (let b = a + 1; b < sorted.length; b++) {
            const key = `${sorted[a]}||${sorted[b]}`;
            overlapCounts.set(key, (overlapCounts.get(key) ?? 0) + 1);
          }
        }
      }
    }

    expect(overlapCounts.size).toBeGreaterThan(0);
    expect(overlapCounts.get('Even||High')).toBeDefined();
    expect(overlapCounts.get('Even||High')!).toBeGreaterThan(0);
    expect(overlapCounts.get('Even||High')!).toBeLessThan(N);
  });

  it('produces empty overlap map for mutually exclusive outcomes', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'Low', conditions: [{ source: 'face', op: '<=', value: literalExpr(3) }], connectors: [], comment: '' },
      { id: 'o2', name: 'High', conditions: [{ source: 'face', op: '>=', value: literalExpr(4) }], connectors: [], comment: '' },
    ];

    const overlapCounts = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      const dice = rollPool(pool);
      const env = new Map<string, PipelineValue>();
      env.set('rolled', dice);
      env.set('face', dice[0]!.face);
      const matched = evaluateOutcomes(outcomes, env);
      if (matched.length > 1) {
        const sorted = [...matched].sort();
        for (let a = 0; a < sorted.length; a++) {
          for (let b = a + 1; b < sorted.length; b++) {
            const key = `${sorted[a]}||${sorted[b]}`;
            overlapCounts.set(key, (overlapCounts.get(key) ?? 0) + 1);
          }
        }
      }
    }

    expect(overlapCounts.size).toBe(0);
  });
});

describe('match-set frequency accumulation', () => {
  it('tracks every match-set, including co-occurring ones', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const outcomes: Outcome[] = [
      { id: 'o1', name: 'High', conditions: [{ source: 'face', op: '>=', value: literalExpr(4) }], connectors: [], comment: '' },
      { id: 'o2', name: 'Even', conditions: [{ source: 'face', op: '=', value: literalExpr(4) }, { source: 'face', op: '=', value: literalExpr(6) }], connectors: ['or'], comment: '' },
    ];

    const setCounts = new Map<string, number>();
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const dice = rollPool(pool);
      const env = new Map<string, PipelineValue>();
      env.set('rolled', dice);
      env.set('face', dice[0]!.face);
      const matched = evaluateOutcomes(outcomes, env);
      if (matched.length > 0) {
        const key = [...matched].sort().join('\u0001');
        setCounts.set(key, (setCounts.get(key) ?? 0) + 1);
      }
    }

    let total = 0;
    for (const c of setCounts.values()) total += c;
    expect(total).toBe(N);

    let cooccurringRolls = 0;
    for (const [key, count] of setCounts) {
      if (key.includes('\u0001')) cooccurringRolls += count;
    }
    expect(cooccurringRolls).toBeGreaterThan(0);
    expect(cooccurringRolls).toBeLessThan(N);
  });
});
