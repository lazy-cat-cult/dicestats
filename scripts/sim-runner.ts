import { runSimulation, materializeSimJob, buildSweepList } from '../src/worker/sim-core';
import type { DicePool, RerollCondition, NamedValue, Outcome, SimResult } from '../src/types';

export { runSimulation, materializeSimJob, buildSweepList };

export function runPresetSimulation(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  sweep: { x: number[]; y: number[] | null; xName: string; yName: string },
  taskName?: string
): SimResult[] {
  const { xList, yList, xName, yName } = buildSweepList(sweep);
  const yOuter: number[] = yList ?? [0];
  const results: SimResult[] = [];

  for (const yVal of yOuter) {
    for (const xVal of xList) {
      const vars: Record<string, number> = {};
      vars[xName] = xVal;
      if (yList !== null) vars[yName] = yVal;

      const materialized = materializeSimJob({
        pool, rerollConditions, pipeline, outcomes,
      }, vars);

      const result = runSimulation(
        materialized.pool,
        materialized.rerollConditions,
        materialized.pipeline,
        materialized.outcomes,
        1_000_000,
        vars,
        taskName,
        yList === null ? xVal : xVal,
        yList === null ? null : yVal,
        xName,
        yName,
        (completed, total) => {
          process.stdout.write(`\r  ${completed.toLocaleString()} / ${total.toLocaleString()}`);
        }
      );
      results.push(result);
    }
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  return results;
}
