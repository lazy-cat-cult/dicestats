import { describe, it, expect } from 'vitest';
import { rollPool } from '@/domain/roller';
import type { DicePool } from '@/types';
import { literalExpr } from '@/utils/expression';

describe('rollPool', () => {
  it('rolls a single d20', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(20), tag: '', comment: '' }],
    };
    const result = rollPool(pool);
    expect(result.length).toBe(1);
    expect(result[0].face).toBeGreaterThanOrEqual(1);
    expect(result[0].face).toBeLessThanOrEqual(20);
    expect(result[0].tag).toBe('');
  });

  it('rolls 2d6 with tags', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(6), tag: 'fire', comment: '' }],
    };
    const result = rollPool(pool);
    expect(result.length).toBe(2);
    expect(result.every((d) => d.tag === 'fire')).toBe(true);
    expect(result.every((d) => d.face >= 1 && d.face <= 6)).toBe(true);
  });

  it('rolls mixed pool with different tags', () => {
    const pool: DicePool = {
      terms: [
        { id: '1', count: literalExpr(1), sides: literalExpr(20), tag: 'normal', comment: '' },
        { id: '2', count: literalExpr(2), sides: literalExpr(6), tag: 'fire', comment: '' },
      ],
    };
    const result = rollPool(pool);
    expect(result.length).toBe(3);
    expect(result[0].tag).toBe('normal');
    expect(result[1].tag).toBe('fire');
    expect(result[2].tag).toBe('fire');
  });
});
