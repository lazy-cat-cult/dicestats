import type { TaggedDie, ConditionClause, ConditionChain } from '@/types';
import { compare } from '@/types';
import { evalExpr } from '@/utils/expression';

export function matchClause(die: TaggedDie, clause: ConditionClause, termsSides: { sides: number; tag: string }[], vars: { x: number; y: number }): boolean {
  if (clause.field === 'face') {
    switch (clause.operator) {
      case 'is_min':
        return die.face === 1;
      case 'is_max':
        return die.face === findSides(die.tag, termsSides);
      case 'is_even':
        return die.face % 2 === 0;
      case 'is_odd':
        return die.face % 2 !== 0;
      default:
        return compare(die.face, clause.operator, evalExpr(clause.value!, vars));
    }
  }
  if (clause.field === 'tag') {
    if (clause.operator === '=') return die.tag === clause.value;
    if (clause.operator === '!=') return die.tag !== clause.value;
  }
  return false;
}

export function matchConditions(die: TaggedDie, chain: ConditionChain, termsSides: { sides: number; tag: string }[], vars: { x: number; y: number }): boolean {
  if (chain.clauses.length === 0) return false;
  let result = matchClause(die, chain.clauses[0]!, termsSides, vars);
  for (let i = 0; i < chain.connectors.length; i++) {
    const next = matchClause(die, chain.clauses[i + 1]!, termsSides, vars);
    result = chain.connectors[i] === 'and' ? result && next : result || next;
  }
  return result;
}

export function findSides(tag: string, terms: { sides: number; tag: string }[]): number {
  if (tag !== '') {
    const match = terms.find((t) => t.tag === tag);
    if (match) return match.sides;
  }
  return terms[0]?.sides ?? 6;
}
