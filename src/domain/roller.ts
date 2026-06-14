import type { DicePool, TaggedDie } from '@/types';

export function rollDie(sides: number): number {
  return ((Math.random() * sides) | 0) + 1;
}

export function rollPool(pool: DicePool): TaggedDie[] {
  const dice: TaggedDie[] = [];

  for (const term of pool.terms) {
    for (let i = 0; i < term.count; i++) {
      dice.push({ face: rollDie(term.sides), tag: term.tag });
    }
  }

  return dice;
}