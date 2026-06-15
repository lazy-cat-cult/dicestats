import type { RerollCondition, TaggedDie } from '@/types';
import { matchConditions, findSides } from '@/domain/matching';

function rollDie(sides: number, tag: string): TaggedDie {
  return { face: ((Math.random() * sides) | 0) + 1, tag };
}

export function applyRerollConditions(dice: TaggedDie[], conditions: RerollCondition[], termsSidesFallback: { sides: number; tag: string }[]): TaggedDie[] {
  let result = [...dice];

  for (const rc of conditions) {
    const newDice: TaggedDie[] = [];

    for (const die of result) {
      const sides = findSides(die.tag, termsSidesFallback);

      if (!matchConditions(die, rc.conditions)) {
        newDice.push(die);
        continue;
      }

      if (rc.action === 'reroll') {
        let current = die;
        for (let attempt = 0; attempt < rc.repeat; attempt++) {
          current = rollDie(sides, die.tag);
          if (!matchConditions(current, rc.conditions)) break;
        }
        newDice.push(current);
      }

      if (rc.action === 'explode') {
        newDice.push(die);
        let safety = 100;
        let cascadeDepth = 0;
        let lastExploded = die;
        while (cascadeDepth < rc.repeat && safety-- > 0) {
          const extra = rollDie(sides, die.tag);
          if (matchConditions(lastExploded, rc.conditions)) {
            newDice.push(extra);
            lastExploded = extra;
            cascadeDepth++;
          } else {
            break;
          }
        }
      }
    }

    result = newDice;
  }

  return result;
}