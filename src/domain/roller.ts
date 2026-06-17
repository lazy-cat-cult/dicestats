import type { DicePool, TaggedDie } from '@/types';
import { exprToInteger } from '@/utils/expression';

export function rollDie(sides: number): number {
  return ((Math.random() * sides) | 0) + 1;
}

const DEFAULT_VARS = { x: 0, y: 0 };

export function rollPool(pool: DicePool): TaggedDie[] {
  const dice: TaggedDie[] = [];

  for (const term of pool.terms) {
    const count = exprToInteger(term.count, DEFAULT_VARS, { min: 1, max: 99 });
    const sides = exprToInteger(term.sides, DEFAULT_VARS, { min: 1, max: 999 });
    for (let i = 0; i < count; i++) {
      dice.push({ face: rollDie(sides), tag: term.tag });
    }
  }

  return dice;
}