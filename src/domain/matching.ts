import type { TaggedDie, ConditionClause, ConditionChain } from '@/types';
import { compare } from '@/types';

export function matchClause(die: TaggedDie, clause: ConditionClause): boolean {
  if (clause.field === 'face') {
    return compare(die.face, clause.operator, clause.value);
  }
  if (clause.field === 'tag') {
    if (clause.operator === '=') return die.tag === clause.value;
    if (clause.operator === '!=') return die.tag !== clause.value;
  }
  return false;
}

export function matchConditions(die: TaggedDie, chain: ConditionChain): boolean {
  if (chain.clauses.length === 0) return false;
  if (chain.connector === 'and') {
    return chain.clauses.every((c) => matchClause(die, c));
  }
  return chain.clauses.some((c) => matchClause(die, c));
}

export function findSides(tag: string, terms: { sides: number; tag: string }[]): number {
  if (tag !== '') {
    const match = terms.find((t) => t.tag === tag);
    if (match) return match.sides;
  }
  return terms[0]?.sides ?? 6;
}