import type { TaggedDie, ConditionClause, ConditionChain, FaceValueSpecial } from '@/types';
import { compare } from '@/types';

function resolveFaceValue(value: number | FaceValueSpecial, die: TaggedDie, termsSides: { sides: number; tag: string }[]): number {
  if (value === 'max_value') {
    return findSides(die.tag, termsSides);
  }
  if (value === 'min_value') {
    return 1;
  }
  return value;
}

export function matchClause(die: TaggedDie, clause: ConditionClause, termsSides: { sides: number; tag: string }[]): boolean {
  if (clause.field === 'face') {
    return compare(die.face, clause.operator, resolveFaceValue(clause.value, die, termsSides));
  }
  if (clause.field === 'tag') {
    if (clause.operator === '=') return die.tag === clause.value;
    if (clause.operator === '!=') return die.tag !== clause.value;
  }
  return false;
}

export function matchConditions(die: TaggedDie, chain: ConditionChain, termsSides: { sides: number; tag: string }[]): boolean {
  if (chain.clauses.length === 0) return false;
  if (chain.connector === 'and') {
    return chain.clauses.every((c) => matchClause(die, c, termsSides));
  }
  return chain.clauses.some((c) => matchClause(die, c, termsSides));
}

export function findSides(tag: string, terms: { sides: number; tag: string }[]): number {
  if (tag !== '') {
    const match = terms.find((t) => t.tag === tag);
    if (match) return match.sides;
  }
  return terms[0]?.sides ?? 6;
}