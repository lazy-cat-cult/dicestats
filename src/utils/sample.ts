import type { DicePool, RerollCondition, NamedValue, Outcome, TaggedDie, SampleTrace, SampleDieDetail, SamplePipelineValue, SampleOutcomeMatch } from '@/types';
import { NOT_MATCHED_LABEL } from '@/types';
import { matchConditions, findSides } from '@/domain/matching';
import { evaluatePipeline } from '@/domain/resolve';
import { evaluateOutcomes } from '@/domain/classify';
import { exprToInteger } from '@/utils/expression';

function rollDie(sides: number): number {
  return ((Math.random() * sides) | 0) + 1;
}

export function buildSampleTrace(
  pool: DicePool,
  rerollConditions: RerollCondition[],
  pipeline: NamedValue[],
  outcomes: Outcome[],
  termsSides: { sides: number; tag: string }[],
  vars: { x: number; y: number },
  overrides?: { termIndex: number; faces: number[] }[]
): SampleTrace {
  const details: SampleDieDetail[] = [];

  for (let ti = 0; ti < pool.terms.length; ti++) {
    const term = pool.terms[ti]!;
    const sides = exprToInteger(term.sides, vars, { min: 1, max: 999 });
    const count = exprToInteger(term.count, vars, { min: 1, max: 99 });
    const override = overrides?.find((o) => o.termIndex === ti);
    for (let di = 0; di < count; di++) {
      const face = override && di < override.faces.length
        ? Math.max(1, Math.min(sides, Math.round(override.faces[di]!)))
        : rollDie(sides);
      details.push({ termIndex: ti, originalFace: face, tag: term.tag, rerollEvents: [] });
    }
  }

  for (let ci = 0; ci < rerollConditions.length; ci++) {
    const rc = rerollConditions[ci]!;
    const newDetails: SampleDieDetail[] = [];

    for (const detail of details) {
      const die = { face: detail.originalFace, tag: detail.tag };
      const sides = findSides(die.tag, termsSides);

      if (!matchConditions(die, rc.conditions, termsSides, vars)) {
        newDetails.push(detail);
        continue;
      }

      const effectiveTag = rc.tagAs || die.tag;

      if (rc.action === 'reroll') {
        let currentFace = die.face;
        for (let attempt = 0; attempt < rc.repeat; attempt++) {
          const newFace = rollDie(sides);
          detail.rerollEvents.push({ conditionIndex: ci, action: 'reroll', oldFace: currentFace, newFace });
          currentFace = newFace;
          if (!matchConditions({ face: newFace, tag: effectiveTag }, rc.conditions, termsSides, vars)) break;
        }
        detail.originalFace = currentFace;
        detail.tag = effectiveTag;
        newDetails.push(detail);
      }

      if (rc.action === 'explode') {
        newDetails.push(detail);
        let lastFace = die.face;
        let safety = 100;
        for (let depth = 0; depth < rc.repeat && safety > 0; depth++, safety--) {
          const checkTag = depth === 0 ? die.tag : effectiveTag;
          if (matchConditions({ face: lastFace, tag: checkTag }, rc.conditions, termsSides, vars)) {
            const extraFace = rollDie(sides);
            const extra: SampleDieDetail = { termIndex: detail.termIndex, originalFace: extraFace, tag: effectiveTag, rerollEvents: [] };
            if (depth === 0) {
              detail.rerollEvents.push({ conditionIndex: ci, action: 'explode', oldFace: lastFace, newFace: extraFace });
            } else {
              const prevExtra = newDetails[newDetails.length - 1]!;
              prevExtra.rerollEvents.push({ conditionIndex: ci, action: 'explode', oldFace: lastFace, newFace: extraFace });
            }
            newDetails.push(extra);
            lastFace = extraFace;
          } else {
            break;
          }
        }
      }
    }

    details.length = 0;
    details.push(...newDetails);
  }

  const currentDice: TaggedDie[] = details.map((d) => ({ face: d.originalFace, tag: d.tag }));
  const env = evaluatePipeline(currentDice, pipeline, vars, termsSides);
  env.set('rolled', currentDice);

  const matchedOutcomes = evaluateOutcomes(outcomes, env, vars);

  const pipelineValues: SamplePipelineValue[] = [];
  pipelineValues.push({ name: 'rolled', value: currentDice, type: 'vector' });
  for (const nv of pipeline) {
    const val = env.get(nv.name);
    if (val !== undefined) {
      pipelineValues.push({
        name: nv.name,
        value: val,
        type: Array.isArray(val) ? 'vector' : 'scalar',
      });
    }
  }

  const outcomeResults: SampleOutcomeMatch[] = outcomes.map((o) => ({
    name: o.name,
    matched: matchedOutcomes.includes(o.name),
  }));
  const anyMatched = outcomes.some((o) => matchedOutcomes.includes(o.name));
  outcomeResults.push({ name: NOT_MATCHED_LABEL, matched: !anyMatched });

  return {
    diceDetails: details,
    pipeline: pipelineValues,
    outcomes: outcomeResults,
    sweepX: vars.x,
    sweepY: vars.y,
  };
}
