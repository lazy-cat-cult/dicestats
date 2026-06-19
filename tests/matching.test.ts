import { describe, it, expect } from 'vitest';
import { matchClause, matchConditions, findSides } from '@/domain/matching';
import type { TaggedDie, ConditionClause, ConditionChain } from '@/types';
import { literalExpr } from '@/utils/expression';

const defaultTerms = [{ sides: 6, tag: '' }];
const mixedTerms = [{ sides: 20, tag: '' }, { sides: 10, tag: 'hunger' }];

describe('matchClause', () => {
  it('matches face with >= operator', () => {
    const die: TaggedDie = { face: 5, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '>=', value: literalExpr(5) };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('matches face with = operator', () => {
    const die: TaggedDie = { face: 6, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '=', value: literalExpr(6) };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('does not match face with > operator when equal', () => {
    const die: TaggedDie = { face: 3, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '>', value: literalExpr(3) };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('matches tag with = operator', () => {
    const die: TaggedDie = { face: 1, tag: 'fire' };
    const clause: ConditionClause = { field: 'tag', operator: '=', value: 'fire' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('matches tag with != operator', () => {
    const die: TaggedDie = { face: 1, tag: 'normal' };
    const clause: ConditionClause = { field: 'tag', operator: '!=', value: 'hunger' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('does not match tag when wrong value', () => {
    const die: TaggedDie = { face: 1, tag: 'fire' };
    const clause: ConditionClause = { field: 'tag', operator: '=', value: 'hunger' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('matches face with < operator', () => {
    const die: TaggedDie = { face: 2, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '<', value: literalExpr(3) };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('matches face with != operator', () => {
    const die: TaggedDie = { face: 4, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '!=', value: literalExpr(5) };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('matches face with is_max when die shows max', () => {
    const die: TaggedDie = { face: 6, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_max' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('does not match face with is_max when die shows less than max', () => {
    const die: TaggedDie = { face: 4, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_max' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('matches face with is_max on tagged die using tag-specific sides', () => {
    const die: TaggedDie = { face: 10, tag: 'hunger' };
    const clause: ConditionClause = { field: 'face', operator: 'is_max' };
    expect(matchClause(die, clause, mixedTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('matches face with is_max on untagged die using first term sides', () => {
    const die: TaggedDie = { face: 20, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_max' };
    expect(matchClause(die, clause, mixedTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('does not match face with is_max on untagged die below max', () => {
    const die: TaggedDie = { face: 15, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_max' };
    expect(matchClause(die, clause, mixedTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('matches face with is_max on max roll', () => {
    const die: TaggedDie = { face: 20, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_max' };
    expect(matchClause(die, clause, mixedTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('matches face with is_min when die shows 1', () => {
    const die: TaggedDie = { face: 1, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_min' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('does not match face with is_min when die shows more than 1', () => {
    const die: TaggedDie = { face: 3, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_min' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('matches face with is_min on 1', () => {
    const die: TaggedDie = { face: 1, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: 'is_min' };
    expect(matchClause(die, clause, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });
});

describe('matchConditions', () => {
  it('returns false for empty clauses', () => {
    const die: TaggedDie = { face: 5, tag: '' };
    const chain: ConditionChain = { clauses: [], connectors: [] };
    expect(matchConditions(die, chain, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('matches single clause with AND', () => {
    const die: TaggedDie = { face: 6, tag: '' };
    const chain: ConditionChain = {
      clauses: [{ field: 'face', operator: '>=', value: literalExpr(5) }],
      connectors: [],
    };
    expect(matchConditions(die, chain, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('AND requires all clauses to match', () => {
    const die: TaggedDie = { face: 6, tag: 'fire' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: '>=', value: literalExpr(5) },
        { field: 'tag', operator: '=', value: 'fire' },
      ],
      connectors: ['and'],
    };
    expect(matchConditions(die, chain, defaultTerms, { x: 0, y: 0 })).toBe(true);

    const chain2: ConditionChain = {
      clauses: [
        { field: 'face', operator: '>=', value: literalExpr(5) },
        { field: 'tag', operator: '=', value: 'ice' },
      ],
      connectors: ['and'],
    };
    expect(matchConditions(die, chain2, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('OR requires any clause to match', () => {
    const die: TaggedDie = { face: 6, tag: 'fire' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: '=', value: literalExpr(1) },
        { field: 'tag', operator: '=', value: 'fire' },
      ],
      connectors: ['or'],
    };
    expect(matchConditions(die, chain, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });

  it('OR fails when no clause matches', () => {
    const die: TaggedDie = { face: 3, tag: '' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: '=', value: literalExpr(1) },
        { field: 'face', operator: '=', value: literalExpr(6) },
      ],
      connectors: ['or'],
    };
    expect(matchConditions(die, chain, defaultTerms, { x: 0, y: 0 })).toBe(false);
  });

  it('AND with is_max clause', () => {
    const die: TaggedDie = { face: 6, tag: '' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: 'is_max' },
        { field: 'tag', operator: '=', value: '' },
      ],
      connectors: [],
    };
    expect(matchConditions(die, chain, defaultTerms, { x: 0, y: 0 })).toBe(true);
  });
});

describe('findSides', () => {
  const terms = [
    { sides: 20, tag: 'normal' },
    { sides: 6, tag: 'fire' },
  ];

  it('finds sides by tag', () => {
    expect(findSides('fire', terms)).toBe(6);
  });

  it('finds sides by normal tag', () => {
    expect(findSides('normal', terms)).toBe(20);
  });

  it('returns first term sides for empty tag', () => {
    expect(findSides('', terms)).toBe(20);
  });

  it('returns first term sides for unknown tag', () => {
    expect(findSides('unknown', terms)).toBe(20);
  });

  it('returns default 6 when terms is empty', () => {
    expect(findSides('any', [])).toBe(6);
  });

  it('returns default 6 for empty tag with empty terms', () => {
    expect(findSides('', [])).toBe(6);
  });
});
