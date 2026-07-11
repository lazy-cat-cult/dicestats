import type { SimJob, SimResult, SampleTrace } from '@/types';
import { buildSampleTrace } from '@/utils/sample';
import { exprToInteger } from '@/utils/expression';
import { runSimulation, materializeSimJob, buildSweepList } from '@/worker/sim-core';

export type WorkerMessage =
  | { type: 'run'; job: SimJob }
  | { type: 'sample'; job: SimJob; x?: number; y?: number; overrides?: { termIndex: number; faces: number[] }[] }
  | { type: 'cancel' };

export type WorkerResponse =
  | { type: 'progress'; completed: number; total: number; overallCompleted: number; overallTotal: number }
  | { type: 'result'; results: SimResult[] }
  | { type: 'sampleResult'; trace: SampleTrace }
  | { type: 'sampleError'; message: string }
  | { type: 'error'; message: string };

let cancelled = false;

function sampleOnce(
  pool: SimJob['pool'],
  rerollConditions: SimJob['rerollConditions'],
  pipeline: SimJob['pipeline'],
  outcomes: SimJob['outcomes'],
  termsSides: { sides: number; tag: string }[],
  vars: Record<string, number>,
  overrides?: { termIndex: number; faces: number[] }[]
): SampleTrace {
  return buildSampleTrace(pool, rerollConditions, pipeline, outcomes, termsSides, vars, overrides);
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (msg.type === 'run') {
    cancelled = false;
    const { iterations, taskName, sweep } = msg.job;

    try {
      const { xList, yList, xName, yName } = buildSweepList(sweep);
      const yOuter: number[] = yList ?? [0];
      const totalSteps = yOuter.length * xList.length;
      const results: SimResult[] = [];
      let stepIndex = 0;

      for (const yVal of yOuter) {
        if (cancelled) break;
        for (const xVal of xList) {
          if (cancelled) break;
          stepIndex++;
          const vars: Record<string, number> = {};
          vars[xName] = xVal;
          if (yList !== null) vars[yName] = yVal;
          const materialized = materializeSimJob(msg.job, vars);
          const result = runSimulation(
            materialized.pool,
            materialized.rerollConditions,
            materialized.pipeline,
            materialized.outcomes,
            iterations,
            vars,
            taskName,
            yList === null ? xVal : xVal,
            yList === null ? null : yVal,
            xName,
            yName,
            (completed, total) => {
              const overallCompleted = (stepIndex - 1) * iterations + completed;
              const overallTotal = totalSteps * iterations;
              self.postMessage({ type: 'progress', completed, total, overallCompleted, overallTotal } as WorkerResponse);
            }
          );
          results.push(result);
        }
      }

      self.postMessage({ type: 'result', results } as WorkerResponse);
    } catch (err: unknown) {
      self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) } as WorkerResponse);
    }
    return;
  }

  if (msg.type === 'sample') {
    cancelled = false;
    try {
      const { xName, yName } = msg.job.sweep;
      const vars: Record<string, number> = {};
      vars[xName] = msg.x ?? 0;
      if (msg.y !== undefined) vars[yName] = msg.y;
      const materialized = materializeSimJob(msg.job, vars);
      const termsSides = materialized.pool.terms.map((t) => ({ sides: exprToInteger(t.sides, vars, { min: 1, max: 999 }), tag: t.tag }));
      const trace = sampleOnce(
        materialized.pool,
        materialized.rerollConditions,
        materialized.pipeline,
        materialized.outcomes,
        termsSides,
        vars,
        msg.overrides
      );
      self.postMessage({ type: 'sampleResult', trace } as WorkerResponse);
    } catch (err: unknown) {
      self.postMessage({ type: 'sampleError', message: err instanceof Error ? err.message : String(err) } as WorkerResponse);
    }
    return;
  }
};
