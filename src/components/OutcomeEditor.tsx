import { useState } from 'preact/hooks';
import {
  outcomes,
  pipeline,
  activeSweepsByTarget,
  parameters,
  showComments,
} from '@/state/app-state';
import type {
  Outcome,
  OutcomeCondition,
  ConditionOperator,
  DiceConditionType,
  NamedValue,
  Parameter,
  ScalarCondition,
  DiceCondition,
} from '@/types';
import { DICE_CONDITION_TYPES } from '@/types';
import { SweepIndicator } from '@/components/SweepIndicator';
import { SweepPopover } from '@/components/SweepPopover';
import { Button, Checkbox, IconButton, Pill, Select, TextField } from '@/components/ui';
import { inferType } from '@/utils/validation';

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

function resolveSourceType(source: string): 'vector' | 'scalar' | null {
  if (source === 'rolled') return 'vector';
  const nv = pipeline.value.find((p) => p.name === source);
  if (!nv) return null;
  return inferType(nv, pipeline.value);
}

function isScalarCondition(cond: OutcomeCondition): cond is ScalarCondition {
  return typeof cond === 'object' && 'op' in cond && typeof cond.op === 'string' && !DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
}

function isDiceCondition(cond: OutcomeCondition): cond is DiceCondition {
  return typeof cond === 'object' && 'op' in cond && DICE_CONDITION_TYPES.includes(cond.op as DiceConditionType);
}

function defaultScalarSource(): string {
  for (const nv of pipeline.value) {
    if (nv.name && getOutputType(nv) === 'scalar') return nv.name;
  }
  return 'rolled';
}

function makeScalarCondition(source: string): ScalarCondition {
  return { source, op: '>=', value: 0 };
}

function makeDiceCondition(source: string): DiceCondition {
  return { source, op: 'any', subCondition: '>=', value: 0 };
}

function emptyOutcome(): Outcome {
  const source = defaultScalarSource();
  const t = resolveSourceType(source);
  return {
    id: crypto.randomUUID(),
    name: 'New Outcome',
    conditions: [t === 'scalar' ? makeScalarCondition(source) : makeDiceCondition(source)],
    connector: 'and',
    comment: '',
    isDefault: false,
  };
}

function convertCondition(cond: OutcomeCondition, newSource: string, newType: 'vector' | 'scalar'): OutcomeCondition {
  if (newType === 'scalar') {
    const sc = isScalarCondition(cond) ? cond : null;
    return { source: newSource, op: sc?.op ?? '>=', value: sc?.value ?? cond.value };
  }
  const dc = isDiceCondition(cond) ? cond : null;
  return {
    source: newSource,
    op: dc?.op ?? 'any',
    subCondition: dc?.subCondition ?? '>=',
    value: dc?.value ?? cond.value,
  };
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

  return (
    <div>
      {list.length === 0 && (
        <div class="border border-dashed border-rule px-4 py-5 text-center">
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
            No outcomes
          </p>
          <p class="text-[12px] text-ink-soft mt-1">
            Add an outcome to define a probability bucket.
          </p>
        </div>
      )}

      <div class="space-y-2">
        {list.map((outcome, i) => {
          const sourceOptions = getSourceOptions();
          const sweepParam = sweeps.get(`outcome.value:${outcome.id}`);

          return (
            <div
              key={outcome.id}
              id={`outcome-row-${outcome.id}`}
              class={`border bg-paper-deep/30 px-3 py-2.5 ${sweepParam ? 'border-billiard' : 'border-rule'}`}
            >
              <div class="flex items-center gap-2 flex-wrap">
                <TextField
                  ariaLabel="Outcome name"
                  value={outcome.name}
                  maxLength={40}
                  onInput={(v) => updateOutcome(i, { name: v })}
                  className="flex-1 min-w-[200px]"
                />
                {outcome.isDefault && <Pill variant="accent">default</Pill>}
                <Checkbox
                  label="Default"
                  checked={outcome.isDefault}
                  disabled={list.some((o, j) => j !== i && o.isDefault)}
                  onChange={(v) => updateOutcome(i, { isDefault: v })}
                />
                {list.length > 1 && (
                  <IconButton onClick={() => removeOutcome(i)} ariaLabel="Delete outcome" variant="danger">
                    <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
                  </IconButton>
                )}
              </div>

              <div class="mt-2 space-y-1.5">
                {outcome.conditions.map((cond, ci) => {
                  const condType = isScalarCondition(cond) ? 'scalar' : 'dice';
                  return (
                    <div key={ci} class="flex items-center gap-1.5 flex-wrap">
                      <Select
                        ariaLabel="Source"
                        value={cond.source}
                        onChange={(v) => {
                          const newSource = v;
                          const newType = resolveSourceType(newSource);
                          if (newType === null) {
                            const conditions = [...outcome.conditions];
                            conditions[ci] = { ...cond, source: newSource };
                            updateOutcome(i, { conditions });
                            return;
                          }
                          if ((newType === 'scalar') !== (condType === 'scalar')) {
                            const conditions = [...outcome.conditions];
                            conditions[ci] = convertCondition(cond, newSource, newType);
                            updateOutcome(i, { conditions });
                          } else {
                            const conditions = [...outcome.conditions];
                            conditions[ci] = { ...cond, source: newSource };
                            updateOutcome(i, { conditions });
                          }
                        }}
                        className="w-32"
                        options={sourceOptions.map((s) => ({ value: s.id, label: s.type === 'vector' ? `[ ${s.label} ]` : s.label }))}
                      />
                      {condType === 'scalar' ? (
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
                      {ci === 0 && condType === 'scalar' && (
                        <>
                          {sweepParam ? (
                            <SweepIndicator
                              parameterId={sweepParam.id}
                              label={sweepParam.label}
                              values={sweepParam.values}
                            />
                          ) : (
                            paramsCount < 3 && (
                              <Button variant="quiet" size="sm" onClick={() => setPopoverOutcomeId(outcome.id)} ariaLabel="Add sweep to first condition">
                                ↻ Sweep
                              </Button>
                            )
                          )}
                        </>
                      )}
                      {outcome.conditions.length > 1 && (
                        <IconButton onClick={() => {
                          const conditions = outcome.conditions.filter((_, j) => j !== ci);
                          updateOutcome(i, { conditions });
                        }} ariaLabel="Remove condition" variant="danger">
                          <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
                        </IconButton>
                      )}
                    </div>
                  );
                })}

                {outcome.conditions.length > 1 && (
                  <Select
                    ariaLabel="Conditions connector"
                    value={outcome.connector}
                    onChange={(v) => updateOutcome(i, { connector: v as 'and' | 'or' })}
                    className="w-16"
                options={[{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }]}
                  />
                )}

                {outcome.conditions.length < 5 && (
                  <Button variant="quiet" size="sm" onClick={() => {
                    const source = defaultScalarSource();
                    const t = resolveSourceType(source);
                    const newCond: OutcomeCondition = t === 'scalar' ? makeScalarCondition(source) : makeDiceCondition(source);
                    const conditions = [...outcome.conditions, newCond];
                    updateOutcome(i, { conditions });
                  }}>
                    + condition
                  </Button>
                )}
              </div>

              {showComments.value && (
                <div class="mt-2">
                  <TextField
                    ariaLabel="Comment"
                    value={outcome.comment}
                    placeholder="Comment (optional)"
                    onInput={(v) => updateOutcome(i, { comment: v })}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {list.length < 10 && (
        <div class="mt-3">
          <Button variant="ghost" size="sm" onClick={addOutcome}>
            + Add outcome
          </Button>
        </div>
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
      <Button variant="ghost" size="sm" onClick={() => onChange({ source: cond.source, op: '>=', value: 0 })}>
        Reset
      </Button>
    );
  }
  return (
    <div class="flex items-center gap-1">
      <Select
        ariaLabel="Operator"
        value={scalar.op}
        onChange={(v) => onChange({ source: scalar.source, op: v as ConditionOperator, value: scalar.value })}
        className="w-14"
                options={CONDITION_OPERATORS.map((op) => ({ value: op, label: op }))}
      />
      <TextField
        ariaLabel="Value"
        type="number"
        value={scalar.value}
        onInput={(v) => onChange({ source: scalar.source, op: scalar.op, value: Number(v) || 0 })}
        className="w-20"
                />
    </div>
  );
}

function OutcomeVectorCondition({ cond, onChange }: { cond: OutcomeCondition; onChange: (c: OutcomeCondition) => void }) {
  const dice = isDiceCondition(cond) ? cond : null;
  if (!dice) {
    return (
      <Button variant="ghost" size="sm" onClick={() => onChange({ source: cond.source, op: 'any', subCondition: '>=', value: 0 })}>
        Reset
      </Button>
    );
  }
  return (
    <div class="flex items-center gap-1">
      <Select
        ariaLabel="Type"
        value={dice.op}
        onChange={(v) => onChange({ source: dice.source, op: v as DiceConditionType, subCondition: dice.subCondition, value: dice.value })}
        className="w-28"
                options={DICE_CONDITION_TYPES.map((t) => ({ value: t, label: `${t} dice` }))}
      />
      <Select
        ariaLabel="Sub-operator"
        value={dice.subCondition}
        onChange={(v) => onChange({ source: dice.source, op: dice.op, subCondition: v as ConditionOperator, value: dice.value })}
        className="w-14"
                options={CONDITION_OPERATORS.map((op) => ({ value: op, label: op }))}
      />
      <TextField
        ariaLabel="Value"
        type="number"
        value={dice.value}
        onInput={(v) => onChange({ source: dice.source, op: dice.op, subCondition: dice.subCondition, value: Number(v) || 0 })}
        className="w-16"
                />
    </div>
  );
}
