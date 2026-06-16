import { useState } from 'preact/hooks';
import {
  parameters,
  dicePool,
  outcomes,
  pipeline,
} from '@/state/app-state';
import { isScalarCondition as isScalarCond, isBinaryMathLiteral as isBML } from '@/utils/validation';
import type { Parameter, ParameterTarget, NamedValue } from '@/types';
import { Button, IconButton, Pill, Select, TextField } from '@/components/ui';

const TARGET_OPTIONS: { value: ParameterTarget; label: string }[] = [
  { value: 'pool.count', label: 'Dice count' },
  { value: 'pool.sides', label: 'Dice sides' },
  { value: 'outcome.value', label: 'Outcome threshold' },
  { value: 'pipeline.literal', label: 'Pipeline literal' },
];

function getScalarLiterals(pipe: NamedValue[]): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const nv of pipe) {
    if (isBML(nv)) {
      const op = nv.op as { fn: string; value: number };
      result.push({ id: nv.id, label: `${nv.name} (${op.fn} ${op.value})` });
    }
  }
  return result;
}

interface StaleInfo {
  reason: 'deleted' | 'not-scalar' | 'not-binary-literal' | 'no-conditions';
  message: string;
}

function getStaleInfo(param: Parameter): StaleInfo | null {
  if (param.target === 'pool.count' || param.target === 'pool.sides') {
    if (param.targetTermId && !dicePool.value.terms.find((t) => t.id === param.targetTermId)) {
      return { reason: 'deleted', message: 'Target no longer exists' };
    }
  }
  if (param.target === 'outcome.value') {
    if (!param.targetOutcomeId || !outcomes.value.find((o) => o.id === param.targetOutcomeId)) {
      return { reason: 'deleted', message: 'Target no longer exists' };
    }
    const o = outcomes.value.find((x) => x.id === param.targetOutcomeId);
    if (o && o.conditions.length === 0) {
      return { reason: 'no-conditions', message: 'Target outcome has no conditions' };
    }
    if (o && o.conditions.length > 0 && !isScalarCond(o.conditions[0])) {
      return { reason: 'not-scalar', message: 'Target is no longer a numeric condition' };
    }
  }
  if (param.target === 'pipeline.literal') {
    if (!param.targetPipelineId || !pipeline.value.find((p) => p.id === param.targetPipelineId)) {
      return { reason: 'deleted', message: 'Target no longer exists' };
    }
    const nv = pipeline.value.find((p) => p.id === param.targetPipelineId);
    if (nv && !isBML(nv)) {
      return { reason: 'not-binary-literal', message: 'Target is no longer a binary-math-literal row' };
    }
  }
  return null;
}

export function ParameterEditor() {
  const params = parameters.value;
  const scalarLiterals = getScalarLiterals(pipeline.value);
  const [retargetIndex, setRetargetIndex] = useState<number | null>(null);

  function addParameter() {
    if (params.length >= 3) return;
    const firstTermId = dicePool.value.terms[0]?.id;
    const firstOutcomeId = outcomes.value[0]?.id;
    const firstLiteralId = scalarLiterals[0]?.id;
    parameters.value = [
      ...params,
      {
        id: crypto.randomUUID(),
        label: 'X',
        values: [1, 2, 3, 4, 5],
        target: 'pool.count',
        targetTermId: firstTermId,
        targetOutcomeId: firstOutcomeId,
        targetPipelineId: firstLiteralId,
      },
    ];
  }

  function removeParameter(index: number) {
    parameters.value = params.filter((_, i) => i !== index);
  }

  function updateParameter(index: number, partial: Partial<Parameter>) {
    parameters.value = params.map((p, i) => (i === index ? { ...p, ...partial } : p));
  }

  function retargetOptions(param: Parameter): { id: string; label: string }[] {
    if (param.target === 'pool.count' || param.target === 'pool.sides') {
      return dicePool.value.terms.map((t) => ({ id: t.id, label: `${t.count}d${t.sides}${t.tag ? ' ' + t.tag : ''}` }));
    }
    if (param.target === 'outcome.value') {
      return outcomes.value.map((o) => ({ id: o.id, label: o.name }));
    }
    return scalarLiterals.map((s) => ({ id: s.id, label: s.label }));
  }

  function applyRetarget(index: number, targetId: string) {
    const p = params[index];
    if (p.target === 'pool.count' || p.target === 'pool.sides') {
      updateParameter(index, { targetTermId: targetId });
    } else if (p.target === 'outcome.value') {
      updateParameter(index, { targetOutcomeId: targetId });
    } else if (p.target === 'pipeline.literal') {
      updateParameter(index, { targetPipelineId: targetId });
    }
    setRetargetIndex(null);
  }

  return (
    <div>
      {params.length === 0 && (
        <div class="border border-dashed border-rule px-4 py-5 text-center">
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
            No sweeps
          </p>
          <p class="text-[12px] text-ink-soft mt-1">
            Add a parameter to run the same setup across a range of values.
          </p>
        </div>
      )}

      <div class="space-y-2">
        {params.map((param, i) => {
          const stale = getStaleInfo(param);
          return (
            <div
              key={param.id}
              class={`border bg-paper-deep/30 px-3 py-2.5 ${stale ? 'border-billiard' : 'border-rule'}`}
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <TextField
                  label="Label"
                  value={param.label}
                  onInput={(v) => updateParameter(i, { label: v })}
                />
                <Select
                  label="Target"
                  value={param.target}
                  onChange={(v) => updateParameter(i, { target: v as ParameterTarget })}
                  options={TARGET_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
                {(param.target === 'pool.count' || param.target === 'pool.sides') && (
                  <Select
                    label="Dice Term"
                    value={param.targetTermId || ''}
                    onChange={(v) => updateParameter(i, { targetTermId: v })}
                    options={dicePool.value.terms.map((t) => ({
                      value: t.id,
                      label: `${t.count}d${t.sides}${t.tag ? ` ${t.tag}` : ''}`,
                    }))}
                  />
                )}
                {param.target === 'outcome.value' && (
                  <Select
                    label="Outcome"
                    value={param.targetOutcomeId || ''}
                    onChange={(v) => updateParameter(i, { targetOutcomeId: v })}
                    options={outcomes.value.map((o) => ({ value: o.id, label: o.name }))}
                  />
                )}
                {param.target === 'pipeline.literal' && (
                  <Select
                    label="Pipeline Step"
                    value={param.targetPipelineId || ''}
                    onChange={(v) => updateParameter(i, { targetPipelineId: v })}
                    options={scalarLiterals.map((sl) => ({ value: sl.id, label: sl.label }))}
                  />
                )}
                <div class="flex items-end gap-1">
                  {stale && <Pill variant="accent">⚠ {stale.message}</Pill>}
                  <IconButton onClick={() => removeParameter(i)} ariaLabel="Delete parameter" variant="danger" className="ml-auto">
                    <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
                  </IconButton>
                </div>
              </div>
              <div class="mt-2">
                <TextField
                  label="Values (comma-separated, or range like 1..5)"
                  value={param.values.join(', ')}
                  onInput={(v) => {
                    const values = parseValues(v);
                    updateParameter(i, { values });
                  }}
                />
              </div>
              {stale && (
                <div class="mt-2 flex items-center gap-2">
                  {retargetIndex === i ? (
                    <Select
                      ariaLabel="Retarget to"
                      value=""
                      onChange={(v) => { if (v) applyRetarget(i, v); }}
                      className="w-48"
                      options={[
                        { value: '', label: 'Retarget to…' },
                        ...retargetOptions(param).map((o) => ({ value: o.id, label: o.label })),
                      ]}
                    />
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setRetargetIndex(i)}>
                      Retarget
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {params.length < 3 && (
        <div class="mt-3">
          <Button variant="ghost" size="sm" onClick={addParameter}>
            + Add parameter
          </Button>
        </div>
      )}
    </div>
  );
}

function parseValues(raw: string): number[] {
  const results: number[] = [];
  const parts = raw.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(-?\d+)\.\.(-?\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start <= end) {
        for (let i = start; i <= end; i++) results.push(i);
      } else {
        for (let i = end; i <= start; i++) results.push(i);
      }
    } else {
      const num = Number(trimmed);
      if (!isNaN(num)) results.push(num);
    }
  }
  return results;
}
