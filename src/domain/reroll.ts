import type { RerollCondition, ConditionChain, ConditionClause, TaggedDie } from '@/types';
import { compare } from '@/types';

function matchClause(die: TaggedDie, clause: ConditionClause): boolean {
  if (clause.field === 'face') {
    return compare(die.face, clause.operator, clause.value);
  }
  if (clause.field === 'tag') {
    if (clause.operator === '=') return die.tag === clause.value;
    if (clause.operator === '!=') return die.tag !== clause.value;
  }
  return false;
}

function matchConditions(die: TaggedDie, chain: ConditionChain): boolean {
  if (chain.clauses.length === 0) return false;
  if (chain.connector === 'and') {
    return chain.clauses.every((c) => matchClause(die, c));
  }
  return chain.clauses.some((c) => matchClause(die, c));
}

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

function findSides(tag: string, terms: { sides: number; tag: string }[]): number {
  const match = terms.find((t) => t.tag === tag && tag !== '');
  if (match) return match.sides;
  return terms[0]?.sides ?? 6;
}