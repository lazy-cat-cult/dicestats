import { useState } from 'preact/hooks';
import { outcomes, pipeline, dicePool, activeSweepsByTarget, parameters, highlightTargetId, highlightTargetKind } from '@/state/app-state';
import type { Outcome, OutcomeCondition, ConditionOperator, DiceConditionType, NamedValue, Parameter } from '@/types';
import { DICE_CONDITION_TYPES } from '@/types';
import { SweepIndicator } from '@/components/SweepIndicator';
import { SweepPopover } from '@/components/SweepPopover';

const CONDITION_OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!='];

function getSourceOptions(): { id: string; label: string; type: 'vector' | 'scalar' }[] {
  const options: { id: string; label: string; type: 'vector' | 'scalar' }[] = [{ id: 'rolled', label: 'rolled', type: 'vector' }];
  for (const nv of pipeline.value) {
    if (nv.name) {
      const t = getOutputType(nv);
      options.push({ id: nv.name, label: nv.name, type: t });
    }
  }
  return options;
}

function getOutputType(nv: NamedValue): 'vector' | 'scalar' {
  const op = nv.op;
  if (typeof op === 'string') {
    if (op === 'count' || op === 'sum' || op === 'max' || op === 'min') return 'scalar';
    return 'vector';
  }
  if (typeof op === 'object' && 'fn' in op) {
    if (op.fn === 'filter' || op.fn === 'remove') return 'vector';
    return 'scalar';
  }
  return 'vector';
}

function isScalarSource(source: string): boolean {
  if (source === 'rolled') return false;
  const nv = pipeline.value.find((p) => p.name === source);
  if (!nv) return false;
  return getOutputType(nv) === 'scalar';
}

function emptyOutcome(): Outcome {
  return {
    id: crypto.randomUUID(),
    name: 'New Outcome',
    source: 'rolled',
    conditions: [{ op: 'any', subCondition: '>=', value: 10 }],
    connector: 'and',
    comment: '',
    isDefault: false,
  };
}

function isScalarCondition(cond: OutcomeCondition): cond is { op: ConditionOperator; value: number } {
  return typeof cond === 'object' && 'op' in cond && typeof cond.op === 'string' && !DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
}

function isDiceCondition(cond: OutcomeCondition): cond is { op: DiceConditionType; subCondition: ConditionOperator; value: number } {
  return typeof cond === 'object' && 'op' in cond && DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
}

export function OutcomeEditor() {
  const list = outcomes.value;
  const sweeps = activeSweepsByTarget.value;
  const paramsCount = parameters.value.length;
  const [popoverOutcomeId, setPopoverOutcomeId] = useState<string | null>(null);

  function addOutcome() {
    if (list.length >= 10) return;
    outcomes.value = [...list, emptyOutcome()];
  }

  function removeOutcome(index: number) {
    outcomes.value = list.filter((_, i) => i !== index);
  }

  function updateOutcome(index: number, partial: Partial<Outcome>) {
    outcomes.value = list.map((o, i) => (i === index ? { ...o, ...partial } : o));
  }

  function createOutcomeSweep(outcomeId: string, label: string, values: number[]) {
    const newParam: Parameter = {
      id: crypto.randomUUID(),
      label,
      values,
      target: 'outcome.value',
      targetOutcomeId: outcomeId,
    };
    parameters.value = [...parameters.value, newParam];
    setPopoverOutcomeId(null);
  }

  function jumpToOutcome(outcomeId: string) {
    highlightTargetId.value = outcomeId;
    highlightTargetKind.value = 'outcome';
    const el = document.getElementById(`outcome-row-${outcomeId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('outline', 'outline-2', 'outline-offset-2', 'outline-blue-500', 'animate-pulse');
    setTimeout(() => {
      el?.classList.remove('outline', 'outline-2', 'outline-offset-2', 'outline-blue-500', 'animate-pulse');
      highlightTargetId.value = null;
      highlightTargetKind.value = null;
    }, 500);
  }

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Outcomes</h2>

      {list.map((outcome, i) => {
        const scalar = isScalarSource(outcome.source);
        const sourceOptions = getSourceOptions();
        const firstScalar = outcome.conditions.length > 0 && isScalarCondition(outcome.conditions[0]);
        const sweepParam = sweeps.get(`outcome.value:${outcome.id}`);

        return (
          <div
            key={outcome.id}
            id={`outcome-row-${outcome.id}`}
            class={`border rounded p-3 mb-3 ${sweepParam ? 'border-blue-300 bg-blue-50/30' : 'bg-gray-50'}`}
          >
            <div class="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={outcome.name}
                maxLength={40}
                class="flex-1 px-2 py-1 border rounded text-sm"
                onInput={(e) => updateOutcome(i, { name: (e.target as HTMLInputElement).value })}
              />
              <select
                  value={outcome.source}
                  class="px-2 py-1 border rounded text-sm"
                  onChange={(e) => updateOutcome(i, { source: (e.target as HTMLSelectElement).value })}
                >
                  {sourceOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label} ({s.type === 'scalar' ? 'num' : 'vec'})</option>
                  ))}
                </select>
              <label class="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={outcome.isDefault}
                  disabled={list.some((o, j) => j !== i && o.isDefault)}
                  onChange={(e) => updateOutcome(i, { isDefault: (e.target as HTMLInputElement).checked })}
                />
                Default
              </label>
              {list.length > 1 && (
                <button class="text-red-400 hover:text-red-600" onClick={() => removeOutcome(i)}>×</button>
              )}
            </div>

            <div class="mb-2">
              {outcome.conditions.map((cond, ci) => (
                <div key={ci} class="flex items-center gap-1 mb-1 flex-wrap">
                  {scalar ? (
                    <OutcomeScalarCondition
                      cond={cond}
                      onChange={(newCond) => {
                        const conditions = [...outcome.conditions];
                        conditions[ci] = newCond;
                        updateOutcome(i, { conditions });
                      }}
                    />
                  ) : (
                    <OutcomeVectorCondition
                      cond={cond}
                      onChange={(newCond) => {
                        const conditions = [...outcome.conditions];
                        conditions[ci] = newCond;
                        updateOutcome(i, { conditions });
                      }}
                    />
                  )}
                  {ci === 0 && firstScalar && (
                    <>
                      {sweepParam ? (
                        <SweepIndicator
                          parameterId={sweepParam.id}
                          label={sweepParam.label}
                          values={sweepParam.values}
                          onJump={() => jumpToOutcome(outcome.id)}
                        />
                      ) : (
                        paramsCount < 3 && (
                          <button
                            type="button"
                            class="text-xs text-indigo-600 hover:text-indigo-800 px-1"
                            onClick={() => setPopoverOutcomeId(outcome.id)}
                            aria-label="Add sweep to first condition"
                          >
                            + Sweep
                          </button>
                        )
                      )}
                    </>
                  )}
                  {outcome.conditions.length > 1 && (
                    <button
                      class="text-red-400 hover:text-red-600 text-xs"
                      onClick={() => {
                        const conditions = outcome.conditions.filter((_, j) => j !== ci);
                        updateOutcome(i, { conditions });
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {outcome.conditions.length > 1 && (
                <select
                  value={outcome.connector}
                  class="px-2 py-0.5 border rounded text-xs mb-1"
                  onChange={(e) => updateOutcome(i, { connector: (e.target as HTMLSelectElement).value as 'and' | 'or' })}
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </select>
              )}

              {outcome.conditions.length < 5 && (
                <button
                  class="text-xs text-indigo-600 hover:text-indigo-800 ml-2"
                  onClick={() => {
                    const newCond = scalar
                      ? { op: '>=' as ConditionOperator, value: 0 }
                      : { op: 'any' as DiceConditionType, subCondition: '>=' as ConditionOperator, value: 0 };
                    const conditions = [...outcome.conditions, newCond as OutcomeCondition];
                    updateOutcome(i, { conditions });
                  }}
                >
                  + condition
                </button>
              )}
            </div>

            <input
              type="text"
              value={outcome.comment}
              placeholder="Comment (optional)"
              class="w-full px-2 py-1 border rounded text-sm"
              onInput={(e) => updateOutcome(i, { comment: (e.target as HTMLInputElement).value })}
            />
          </div>
        );
      })}

      {list.length < 10 && (
        <button class="text-sm text-indigo-600 hover:text-indigo-800" onClick={addOutcome}>
          + Add outcome
        </button>
      )}

      {popoverOutcomeId && (
        <SweepPopover
          open={true}
          defaultLabel="DC"
          defaultValues="5, 10, 15, 20"
          maxSimulationsReached={paramsCount >= 3}
          onCreate={(label, values) => createOutcomeSweep(popoverOutcomeId, label, values)}
          onCancel={() => setPopoverOutcomeId(null)}
        />
      )}
    </div>
  );
}

function OutcomeScalarCondition({ cond, onChange }: { cond: OutcomeCondition; onChange: (c: OutcomeCondition) => void }) {
  const scalar = isScalarCondition(cond) ? cond : null;
  if (!scalar) {
    return (
      <button
        class="px-2 py-0.5 border rounded text-xs bg-gray-100"
        onClick={() => onChange({ op: '>=', value: 0 })}
      >
        Reset condition
      </button>
    );
  }
  return (
    <div class="flex items-center gap-1">
      <select
        value={scalar.op}
        class="px-1 py-0.5 border rounded text-xs"
        onChange={(e) => onChange({ op: (e.target as HTMLSelectElement).value as ConditionOperator, value: scalar.value })}
      >
        {CONDITION_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
      </select>
      <input
        type="number"
        value={scalar.value}
        class="w-16 px-1 py-0.5 border rounded text-xs text-center"
        onInput={(e) => onChange({ op: scalar.op, value: Number((e.target as HTMLInputElement).value) || 0 })}
      />
    </div>
  );
}

function OutcomeVectorCondition({ cond, onChange }: { cond: OutcomeCondition; onChange: (c: OutcomeCondition) => void }) {
  const dice = isDiceCondition(cond) ? cond : null;
  if (!dice) {
    return (
      <button
        class="px-2 py-0.5 border rounded text-xs bg-gray-100"
        onClick={() => onChange({ op: 'any', subCondition: '>=', value: 0 })}
      >
        Reset condition
      </button>
    );
  }
  return (
    <div class="flex items-center gap-1">
      <select
        value={dice.op}
        class="px-1 py-0.5 border rounded text-xs"
        onChange={(e) => onChange({ op: (e.target as HTMLSelectElement).value as DiceConditionType, subCondition: dice.subCondition, value: dice.value })}
      >
        {DICE_CONDITION_TYPES.map((t) => (<option key={t} value={t}>{t} dice</option>))}
      </select>
      <select
        value={dice.subCondition}
        class="px-1 py-0.5 border rounded text-xs"
        onChange={(e) => onChange({ op: dice.op, subCondition: (e.target as HTMLSelectElement).value as ConditionOperator, value: dice.value })}
      >
        {CONDITION_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
      </select>
      <input
        type="number"
        value={dice.value}
        class="w-14 px-1 py-0.5 border rounded text-xs text-center"
        onInput={(e) => onChange({ op: dice.op, subCondition: dice.subCondition, value: Number((e.target as HTMLInputElement).value) || 0 })}
      />
    </div>
  );
}
