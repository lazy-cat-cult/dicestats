import type { DicePool, RerollCondition, NamedValue, Outcome, OutcomeOverlap, MatchSetCount, SimResult, TaggedDie, Expr, DiceTerm } from '@/types';
import { NOT_MATCHED_LABEL } from '@/types';
import { matchConditions, findSides } from '@/domain/matching';
import { evaluatePipeline } from '@/domain/resolve';
import { evaluateOutcomes } from '@/domain/classify';
import { evalExpr, exprToInteger, literalExpr } from '@/utils/expression';

const MATCH_SET_SEP = '\u0001';
const MATCH_SET_CAP = 50;

export function rollDie(sides: number): number {
  return ((Math.random() * sides) | 0) + 1;
}

export function rollPool(pool: DicePool, vars: Record<string, number>): TaggedDie[] {
  const dice: TaggedDie[] = [];
  for (const term of pool.terms) {
    const count = exprToInteger(term.count, vars, { min: 1, max: 99 });
    const sides = exprToInteger(term.sides, vars, { min: 1, max: 999 });
    for (let i = 0; i < count; i++) {
      dice.push({ face: rollDie(sides), tag: term.tag });
    }
  }
  return dice;
}

export function applyRerollConditions(dice: TaggedDie[], conditions: RerollCondition[], termsSides: { sides: number; tag: string }[], vars: Record<string, number>): TaggedDie[] {
  let result = [...dice];

  for (const rc of conditions) {
    const newDice: TaggedDie[] = [];

    for (const die of result) {
      const sides = findSides(die.tag, termsSides);

      if (!matchConditions(die, rc.conditions, termsSides, vars)) {
        newDice.push(die);
        continue;
      }

      const effectiveTag = rc.tagAs || die.tag;

      if (rc.action === 'reroll') {
        let current = die;
        for (let attempt = 0; attempt < rc.repeat; attempt++) {
          current = { face: rollDie(sides), tag: effectiveTag };
          if (!matchConditions(current, rc.conditions, termsSides, vars)) break;
        }
        newDice.push(current);
      }

      if (rc.action === 'explode') {
        newDice.push(die);
        let safety = 100;
        let cascadeDepth = 0;
        let lastExploded = die;
        while (cascadeDepth < rc.repeat && safety-- > 0) {
          const extra = { face: rollDie(sides), tag: effectiveTag };
          if (matchConditions(lastExploded, rc.conditions, termsSides, vars)) {
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

export function simulateOnce(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  termsSides: { sides: number; tag: string }[],
  vars: Record<string, number>
): { distributionKey: number; matchedOutcomes: string[] } {
  let dice = rollPool(pool, vars);
  dice = applyRerollConditions(dice, rerollConditions, termsSides, vars);

  const env = evaluatePipeline(dice, pipeline, vars, termsSides);
  env.set('rolled', dice);

  const matchedOutcomes = evaluateOutcomes(outcomes, env, vars);

  let distributionKey: number;
  let lastScalar: number | null = null;
  for (const nv of pipeline) {
    const val = env.get(nv.name);
    if (typeof val === 'number') {
      lastScalar = val;
    }
  }
  if (lastScalar !== null) {
    distributionKey = lastScalar;
  } else {
    distributionKey = dice.reduce((s, d) => s + d.face, 0);
  }

  return { distributionKey, matchedOutcomes };
}

export function runSimulation(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  iterations: number,
  vars: Record<string, number>,
  taskName?: string,
  sweepX: number | null = null,
  sweepY: number | null = null,
  xName?: string,
  yName?: string,
  onProgress?: (completed: number, total: number) => void
): SimResult {
  const termsSides = pool.terms.map((t) => ({ sides: exprToInteger(t.sides, vars, { min: 1, max: 999 }), tag: t.tag }));
  const outcomeCounts = new Map<string, number>();
  for (const o of outcomes) {
    outcomeCounts.set(o.name, 0);
  }
  outcomeCounts.set(NOT_MATCHED_LABEL, 0);
  const overlapCounts = new Map<string, number>();
  const matchSetCounts = new Map<string, number>();
  const distribution = new Map<number, number>();

  for (let i = 0; i < iterations; i++) {
    if (i % 10000 === 0 && onProgress) {
      onProgress(i, iterations);
    }

    const { distributionKey, matchedOutcomes } = simulateOnce(pool, rerollConditions, pipeline, outcomes, termsSides, vars);

    distribution.set(distributionKey, (distribution.get(distributionKey) ?? 0) + 1);

    for (const name of matchedOutcomes) {
      outcomeCounts.set(name, (outcomeCounts.get(name) ?? 0) + 1);
    }

    if (matchedOutcomes.length > 1) {
      const sorted = [...matchedOutcomes].sort();
      for (let a = 0; a < sorted.length; a++) {
        for (let b = a + 1; b < sorted.length; b++) {
          const key = `${sorted[a]}||${sorted[b]}`;
          overlapCounts.set(key, (overlapCounts.get(key) ?? 0) + 1);
        }
      }
      const setKey = sorted.join(MATCH_SET_SEP);
      matchSetCounts.set(setKey, (matchSetCounts.get(setKey) ?? 0) + 1);
    } else if (matchedOutcomes.length === 1) {
      matchSetCounts.set(matchedOutcomes[0] ?? '', (matchSetCounts.get(matchedOutcomes[0] ?? '') ?? 0) + 1);
    }
  }

  const sortedDist: Record<number, number> = {};
  for (const [k, v] of distribution) {
    sortedDist[k] = v;
  }

  const overlaps: OutcomeOverlap[] = [];
  for (const [key, count] of overlapCounts) {
    if (count === 0) continue;
    const sepIdx = key.indexOf('||');
    overlaps.push({
      outcomes: [key.slice(0, sepIdx), key.slice(sepIdx + 2)],
      count,
      probability: count / iterations,
    });
  }
  overlaps.sort((a, b) => b.count - a.count);

  const matchSets: MatchSetCount[] = [];
  for (const [key, count] of matchSetCounts) {
    if (key === '') continue;
    matchSets.push({
      outcomes: key.split(MATCH_SET_SEP),
      count,
      probability: count / iterations,
    });
  }
  matchSets.sort((a, b) => b.count - a.count);
  const matchSetsCapped = matchSets.slice(0, MATCH_SET_CAP);

  const xn = xName ?? 'X';
  const yn = yName ?? 'Y';
  const xPart = sweepX === null ? '' : `${xn}=${sweepX}`;
  const yPart = sweepY === null ? '' : `${yn}=${sweepY}`;
  const label = sweepX === null && sweepY === null
    ? (taskName ?? '')
    : (sweepY === null ? xPart : `${yPart} · ${xPart}`);

  return {
    label,
    outcomes: [
      ...outcomes.map((o) => ({
        label: o.name,
        probability: (outcomeCounts.get(o.name) ?? 0) / iterations,
        count: outcomeCounts.get(o.name) ?? 0,
      })),
      {
        label: NOT_MATCHED_LABEL,
        probability: (outcomeCounts.get(NOT_MATCHED_LABEL) ?? 0) / iterations,
        count: outcomeCounts.get(NOT_MATCHED_LABEL) ?? 0,
      },
    ],
    overlaps,
    matchSets: matchSetsCapped,
    totalRolls: iterations,
    distribution: sortedDist,
    sweepX,
    sweepY,
  };
}

function materializeExpr(expr: Expr, vars: Record<string, number>): Expr {
  return literalExpr(evalExpr(expr, vars));
}

function materializeTerm(term: DiceTerm, vars: Record<string, number>): DiceTerm {
  return {
    id: term.id,
    count: literalExpr(exprToInteger(term.count, vars, { min: 1, max: 99 })),
    sides: literalExpr(exprToInteger(term.sides, vars, { min: 1, max: 999 })),
    tag: term.tag,
    comment: term.comment,
  };
}

function materializePipeline(
  nv: NamedValue,
  vars: Record<string, number>
): NamedValue {
  if (typeof nv.op === 'object' && nv.op !== null && 'fn' in nv.op && (nv.op.fn === 'filter' || nv.op.fn === 'remove')) {
    return { ...nv, op: { ...nv.op } } as NamedValue;
  }
  const sOp = nv.op as { fn: string; terms?: { operand: string; value: Expr }[] };
  if (typeof sOp === 'object' && sOp !== null && 'fn' in sOp && Array.isArray(sOp.terms)) {
    return {
      ...nv,
      op: {
        fn: sOp.fn,
        terms: sOp.terms.map((t) =>
          t.operand === 'val'
            ? { operand: 'val' as const, value: literalExpr(evalExpr(t.value, vars)) }
            : t
        ),
      },
    } as NamedValue;
  }
  return { ...nv } as NamedValue;
}

function materializeOutcome(
  o: Outcome,
  vars: Record<string, number>
): Outcome {
  return {
    ...o,
    conditions: o.conditions.map((c) => {
      if ('value' in c && c.value) {
        return { ...c, value: materializeExpr(c.value, vars) };
      }
      return c;
    }),
  } as Outcome;
}

export function materializeSimJob(job: {
  pool: DicePool;
  rerollConditions: RerollCondition[];
  pipeline: NamedValue[];
  outcomes: Outcome[];
}, vars: Record<string, number>) {
  return {
    pool: {
      terms: job.pool.terms.map((t) => materializeTerm(t, vars)),
    },
    rerollConditions: job.rerollConditions.map((r) => ({ ...r, conditions: { clauses: r.conditions.clauses.map((c) => ({ ...c })), connectors: r.conditions.connectors } })),
    pipeline: job.pipeline.map((nv) => materializePipeline(nv, vars)),
    outcomes: job.outcomes.map((o) => materializeOutcome(o, vars)),
  };
}

export function buildSweepList(sweep: { x: number[]; y: number[] | null; xName: string; yName: string }) {
  const xList = sweep.x.length > 0 ? sweep.x : [0];
  const yList = sweep.y && sweep.y.length > 0 ? sweep.y : null;
  return { xList, yList, xName: sweep.xName, yName: sweep.yName };
}
