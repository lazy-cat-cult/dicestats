import type { DicePool, RerollCondition, NamedValue, Outcome, OutcomeOverlap, Parameter, TaggedDie, SimJob, SimResult } from '@/types';
import { matchConditions, findSides } from '@/domain/matching';
import { evaluatePipeline } from '@/domain/resolve';
import { evaluateOutcomes } from '@/domain/classify';

function rollDie(sides: number): number {
  return ((Math.random() * sides) | 0) + 1;
}

function rollPool(pool: DicePool): TaggedDie[] {
  const dice: TaggedDie[] = [];
  for (const term of pool.terms) {
    for (let i = 0; i < term.count; i++) {
      dice.push({ face: rollDie(term.sides), tag: term.tag });
    }
  }
  return dice;
}

function applyRerollConditions(dice: TaggedDie[], conditions: RerollCondition[], termsSides: { sides: number; tag: string }[]): TaggedDie[] {
  let result = [...dice];

  for (const rc of conditions) {
    const newDice: TaggedDie[] = [];

    for (const die of result) {
      const sides = findSides(die.tag, termsSides);

      if (!matchConditions(die, rc.conditions, termsSides)) {
        newDice.push(die);
        continue;
      }

      if (rc.action === 'reroll') {
        let current = die;
        for (let attempt = 0; attempt < rc.repeat; attempt++) {
          current = { face: rollDie(sides), tag: die.tag };
          if (!matchConditions(current, rc.conditions, termsSides)) break;
        }
        newDice.push(current);
      }

      if (rc.action === 'explode') {
        newDice.push(die);
        let safety = 100;
        let cascadeDepth = 0;
        let lastExploded = die;
        while (cascadeDepth < rc.repeat && safety-- > 0) {
          const extra = { face: rollDie(sides), tag: die.tag };
          if (matchConditions(lastExploded, rc.conditions, termsSides)) {
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

function simulateOnce(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  termsSides: { sides: number; tag: string }[]
): { distributionKey: number; matchedOutcomes: string[] } {
  let dice = rollPool(pool);
  dice = applyRerollConditions(dice, rerollConditions, termsSides);

  const env = evaluatePipeline(dice, pipeline, termsSides);
  env.set('rolled', dice);

  const matchedOutcomes = evaluateOutcomes(outcomes, env);

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

function runSimulation(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  iterations: number,
  taskName?: string
): SimResult {
  const termsSides = pool.terms.map((t) => ({ sides: t.sides, tag: t.tag }));
  const outcomeCounts = new Map<string, number>();
  for (const o of outcomes) {
    outcomeCounts.set(o.name, 0);
  }
  const overlapCounts = new Map<string, number>();
  const distribution = new Map<number, number>();

  for (let i = 0; i < iterations; i++) {
    if (i % 10000 === 0) {
      if (typeof self !== 'undefined') {
        self.postMessage({ type: 'progress', completed: i, total: iterations });
      }
    }

    const { distributionKey, matchedOutcomes } = simulateOnce(pool, rerollConditions, pipeline, outcomes, termsSides);

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

  return {
    label: taskName ?? '',
    outcomes: outcomes.map((o) => ({
      label: o.name,
      probability: (outcomeCounts.get(o.name) ?? 0) / iterations,
      count: outcomeCounts.get(o.name) ?? 0,
    })),
    overlaps,
    totalRolls: iterations,
    distribution: sortedDist,
  };
}

function applyParameter(job: SimJob, param: Parameter, value: number): SimJob {
  const newJob: SimJob = {
    ...job,
    pool: {
      ...job.pool,
      terms: job.pool.terms.map((t) => ({ ...t })),
    },
    rerollConditions: job.rerollConditions.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } })),
    pipeline: job.pipeline.map((p) => ({ ...p })),
    outcomes: job.outcomes.map((o) => ({ ...o, conditions: [...o.conditions] })),
    parameters: undefined,
  };

  if (param.target === 'pool.count' && param.targetTermId) {
    const term = newJob.pool.terms.find((t) => t.id === param.targetTermId);
    if (term) term.count = value;
  } else if (param.target === 'pool.sides' && param.targetTermId) {
    const term = newJob.pool.terms.find((t) => t.id === param.targetTermId);
    if (term) term.sides = value;
  } else if (param.target === 'outcome.value' && param.targetOutcomeId) {
    const outcome = newJob.outcomes.find((o) => o.id === param.targetOutcomeId);
    if (outcome) {
      for (let i = 0; i < outcome.conditions.length; i++) {
        const cond = outcome.conditions[i];
        if (typeof cond === 'object' && 'value' in cond) {
          outcome.conditions[i] = { ...cond, value };
          break;
        }
      }
    }
  } else if (param.target === 'pipeline.literal' && param.targetPipelineId) {
    const pNv = newJob.pipeline.find((p) => p.id === param.targetPipelineId);
    if (pNv && typeof pNv.op === 'object' && 'fn' in pNv.op) {
      const op = pNv.op as { fn: string; operand?: string; value?: number };
      if ((op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide') && op.operand === 'literal') {
        pNv.op = { fn: op.fn, operand: 'literal', value };
      }
    }
  }

  return newJob;
}

export type WorkerMessage =
  | { type: 'run'; job: SimJob }
  | { type: 'cancel' };

export type WorkerResponse =
  | { type: 'progress'; completed: number; total: number }
  | { type: 'result'; results: SimResult[] }
  | { type: 'error'; message: string };

let cancelled = false;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (msg.type === 'run') {
    cancelled = false;
    const { pool, rerollConditions, pipeline, outcomes, parameters, iterations, taskName } = msg.job;

    try {
      if (!parameters || parameters.length === 0) {
        const result = runSimulation(pool, rerollConditions, pipeline, outcomes, iterations, taskName);
        self.postMessage({ type: 'result', results: [result] } as WorkerResponse);
      } else {
        const results: SimResult[] = [];

        const paramSweeps: { paramIndex: number; valueIndex: number; value: number }[] = [];
        for (let pi = 0; pi < parameters.length; pi++) {
          for (let vi = 0; vi < parameters[pi].values.length; vi++) {
            paramSweeps.push({ paramIndex: pi, valueIndex: vi, value: parameters[pi].values[vi] });
          }
        }

        for (const sweep of paramSweeps) {
          if (cancelled) break;

          const param = parameters[sweep.paramIndex];
          const modifiedJob = applyParameter(msg.job, param, sweep.value);
          const result = runSimulation(modifiedJob.pool, modifiedJob.rerollConditions, modifiedJob.pipeline, modifiedJob.outcomes, iterations, taskName);
          result.label = taskName ? `${taskName} · ${param.label}=${sweep.value}` : `${param.label}=${sweep.value}`;
          results.push(result);

          self.postMessage({ type: 'progress', completed: results.length, total: paramSweeps.length } as WorkerResponse);
        }

        self.postMessage({ type: 'result', results } as WorkerResponse);
      }
    } catch (err: unknown) {
      self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) } as WorkerResponse);
    }
  }
};