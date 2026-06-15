import { describe, it, expect } from 'vitest';
import { matchClause, matchConditions, findSides } from '@/domain/matching';
import type { TaggedDie, ConditionClause, ConditionChain } from '@/types';

describe('matchClause', () => {
  it('matches face with >= operator', () => {
    const die: TaggedDie = { face: 5, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '>=', value: 5 };
    expect(matchClause(die, clause)).toBe(true);
  });

  it('matches face with = operator', () => {
    const die: TaggedDie = { face: 6, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '=', value: 6 };
    expect(matchClause(die, clause)).toBe(true);
  });

  it('does not match face with > operator when equal', () => {
    const die: TaggedDie = { face: 3, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '>', value: 3 };
    expect(matchClause(die, clause)).toBe(false);
  });

  it('matches tag with = operator', () => {
    const die: TaggedDie = { face: 1, tag: 'fire' };
    const clause: ConditionClause = { field: 'tag', operator: '=', value: 'fire' };
    expect(matchClause(die, clause)).toBe(true);
  });

  it('matches tag with != operator', () => {
    const die: TaggedDie = { face: 1, tag: 'normal' };
    const clause: ConditionClause = { field: 'tag', operator: '!=', value: 'hunger' };
    expect(matchClause(die, clause)).toBe(true);
  });

  it('does not match tag when wrong value', () => {
    const die: TaggedDie = { face: 1, tag: 'fire' };
    const clause: ConditionClause = { field: 'tag', operator: '=', value: 'hunger' };
    expect(matchClause(die, clause)).toBe(false);
  });

  it('matches face with < operator', () => {
    const die: TaggedDie = { face: 2, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '<', value: 3 };
    expect(matchClause(die, clause)).toBe(true);
  });

  it('matches face with != operator', () => {
    const die: TaggedDie = { face: 4, tag: '' };
    const clause: ConditionClause = { field: 'face', operator: '!=', value: 5 };
    expect(matchClause(die, clause)).toBe(true);
  });
});

describe('matchConditions', () => {
  it('returns false for empty clauses', () => {
    const die: TaggedDie = { face: 5, tag: '' };
    const chain: ConditionChain = { clauses: [], connector: 'and' };
    expect(matchConditions(die, chain)).toBe(false);
  });

  it('matches single clause with AND', () => {
    const die: TaggedDie = { face: 6, tag: '' };
    const chain: ConditionChain = {
      clauses: [{ field: 'face', operator: '>=', value: 5 }],
      connector: 'and',
    };
    expect(matchConditions(die, chain)).toBe(true);
  });

  it('AND requires all clauses to match', () => {
    const die: TaggedDie = { face: 6, tag: 'fire' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: '>=', value: 5 },
        { field: 'tag', operator: '=', value: 'fire' },
      ],
      connector: 'and',
    };
    expect(matchConditions(die, chain)).toBe(true);

    const chain2: ConditionChain = {
      clauses: [
        { field: 'face', operator: '>=', value: 5 },
        { field: 'tag', operator: '=', value: 'ice' },
      ],
      connector: 'and',
    };
    expect(matchConditions(die, chain2)).toBe(false);
  });

  it('OR requires any clause to match', () => {
    const die: TaggedDie = { face: 6, tag: 'fire' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: '=', value: 1 },
        { field: 'tag', operator: '=', value: 'fire' },
      ],
      connector: 'or',
    };
    expect(matchConditions(die, chain)).toBe(true);
  });

  it('OR fails when no clause matches', () => {
    const die: TaggedDie = { face: 3, tag: '' };
    const chain: ConditionChain = {
      clauses: [
        { field: 'face', operator: '=', value: 1 },
        { field: 'face', operator: '=', value: 6 },
      ],
      connector: 'or',
    };
    expect(matchConditions(die, chain)).toBe(false);
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