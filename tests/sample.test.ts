import { describe, it, expect } from 'vitest';
import { buildSampleTrace } from '@/utils/sample';
import { literalExpr } from '@/utils/expression';
import type { DicePool, RerollCondition, Outcome } from '@/types';

function makeTrace(pool: DicePool, reroll: RerollCondition[], outcomes: Outcome[], vars = { x: 0, y: 0 }) {
  const termsSides = pool.terms.map((t) => ({ sides: 999, tag: t.tag }));
  return buildSampleTrace(pool, reroll, [], outcomes, termsSides, vars);
}

describe('buildSampleTrace', () => {
  it('returns dice details for a simple pool', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const trace = buildSampleTrace(pool, [], [], [], [{ sides: 6, tag: '' }], { x: 0, y: 0 });
    expect(trace.diceDetails.length).toBe(2);
    expect(trace.diceDetails[0].termIndex).toBe(0);
    expect(trace.diceDetails[0].originalFace).toBeGreaterThanOrEqual(1);
    expect(trace.diceDetails[0].originalFace).toBeLessThanOrEqual(6);
    expect(trace.diceDetails[0].rerollEvents).toEqual([]);
    expect(trace.diceDetails[0].tag).toBe('');
  });

  it('includes rolled in pipeline', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const trace = buildSampleTrace(pool, [], [], [], [{ sides: 6, tag: '' }], { x: 0, y: 0 });
    expect(trace.pipeline.length).toBe(1);
    expect(trace.pipeline[0].name).toBe('rolled');
    expect(trace.pipeline[0].type).toBe('vector');
  });

  it('returns unmatched outcome when no outcomes defined', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const trace = makeTrace(pool, [], []);
    expect(trace.outcomes.length).toBe(1);
    expect(trace.outcomes[0].name).toBe('Not matched');
    expect(trace.outcomes[0].matched).toBe(true);
  });

  it('records which outcomes matched', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(20), tag: '', comment: '' }],
    };
    // Retry until we get a face >= 10
    for (let attempt = 0; attempt < 50; attempt++) {
      const trace = makeTrace(pool, [], [
        { id: 'o1', name: 'Hit', conditions: [{ source: 'rolled', op: 'any', subCondition: '>=', value: literalExpr(10) }], connectors: [], comment: '' },
      ]);
      if (trace.outcomes[0].name === 'Hit') {
        expect(trace.outcomes.length).toBe(2);
        const hit = trace.outcomes.find((o) => o.name === 'Hit')!;
        expect(hit.matched).toBe(hit.name === 'Hit');
        break;
      }
    }
  });

  it('uses provided overrides instead of random rolls', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(2), sides: literalExpr(20), tag: '', comment: '' }],
    };
    const trace = buildSampleTrace(pool, [], [], [], [{ sides: 20, tag: '' }], { x: 0, y: 0 }, [
      { termIndex: 0, faces: [18, 5] },
    ]);
    expect(trace.diceDetails.length).toBe(2);
    expect(trace.diceDetails[0].originalFace).toBe(18);
    expect(trace.diceDetails[1].originalFace).toBe(5);
  });

  it('clamps overrides to valid range', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const trace = buildSampleTrace(pool, [], [], [], [{ sides: 6, tag: '' }], { x: 0, y: 0 }, [
      { termIndex: 0, faces: [99] },
    ]);
    expect(trace.diceDetails[0].originalFace).toBe(6);
  });

  it('records reroll events', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    // Run multiple attempts hoping to trigger a reroll on face=1
    for (let attempt = 0; attempt < 100; attempt++) {
      const trace = buildSampleTrace(pool, [
        { id: 'r1', action: 'reroll', conditions: { clauses: [{ field: 'face', operator: '=', value: literalExpr(1) }], connectors: [] }, repeat: 1, comment: '', tagAs: '' },
      ], [], [], [{ sides: 6, tag: '' }], { x: 0, y: 0 });
      if (trace.diceDetails[0].rerollEvents.length > 0) {
        expect(trace.diceDetails[0].rerollEvents[0].action).toBe('reroll');
        expect(trace.diceDetails[0].rerollEvents[0].oldFace).toBe(1);
        expect(trace.diceDetails[0].rerollEvents[0].newFace).toBeGreaterThanOrEqual(1);
        expect(trace.diceDetails[0].rerollEvents[0].newFace).toBeLessThanOrEqual(6);
        expect(trace.diceDetails[0].rerollEvents[0].conditionIndex).toBe(0);
        expect(trace.diceDetails[0].originalFace).not.toBe(1);
        break;
      }
    }
  });

  it('records explode events on the triggering die', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    // Run multiple attempts hoping to trigger an explode on face=6
    for (let attempt = 0; attempt < 100; attempt++) {
      const trace = buildSampleTrace(pool, [
        { id: 'r1', action: 'explode', conditions: { clauses: [{ field: 'face', operator: '=', value: literalExpr(6) }], connectors: [] }, repeat: 1, comment: '', tagAs: '' },
      ], [], [], [{ sides: 6, tag: '' }], { x: 0, y: 0 });
      if (trace.diceDetails.length > 1) {
        // Original die has the explode event
        expect(trace.diceDetails[0].rerollEvents.length).toBeGreaterThanOrEqual(1);
        expect(trace.diceDetails[0].rerollEvents[0].action).toBe('explode');
        expect(trace.diceDetails[0].rerollEvents[0].conditionIndex).toBe(0);
        // Extra die has no events
        expect(trace.diceDetails[1].rerollEvents).toEqual([]);
        break;
      }
    }
  });

  it('returns sweepX and sweepY from vars', () => {
    const pool: DicePool = {
      terms: [{ id: '1', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
    };
    const trace = buildSampleTrace(pool, [], [], [], [{ sides: 6, tag: '' }], { x: 5, y: 10 });
    expect(trace.sweepX).toBe(5);
    expect(trace.sweepY).toBe(10);
  });

  it('duplicates overrides into all dice of a term', () => {
    const pool: DicePool = {
      terms: [
        { id: '1', count: literalExpr(3), sides: literalExpr(6), tag: '', comment: '' },
      ],
    };
    const trace = buildSampleTrace(pool, [], [], [], [{ sides: 6, tag: '' }], { x: 0, y: 0 }, [
      { termIndex: 0, faces: [2, 4, 6] },
    ]);
    expect(trace.diceDetails[0].originalFace).toBe(2);
    expect(trace.diceDetails[1].originalFace).toBe(4);
    expect(trace.diceDetails[2].originalFace).toBe(6);
  });

  it('handles mixed pool with tags', () => {
    const pool: DicePool = {
      terms: [
        { id: '1', count: literalExpr(1), sides: literalExpr(20), tag: 'adv', comment: '' },
        { id: '2', count: literalExpr(2), sides: literalExpr(6), tag: 'fire', comment: '' },
      ],
    };
    const termsSides = pool.terms.map((t) => ({ sides: t.sides === literalExpr(20) ? 20 : 6, tag: t.tag }));
    const trace = buildSampleTrace(pool, [], [], [], termsSides, { x: 0, y: 0 });
    expect(trace.diceDetails.length).toBe(3);
    expect(trace.diceDetails[0].tag).toBe('adv');
    expect(trace.diceDetails[0].termIndex).toBe(0);
    expect(trace.diceDetails[1].tag).toBe('fire');
    expect(trace.diceDetails[1].termIndex).toBe(1);
    expect(trace.diceDetails[2].tag).toBe('fire');
    expect(trace.diceDetails[2].termIndex).toBe(1);
  });
});
