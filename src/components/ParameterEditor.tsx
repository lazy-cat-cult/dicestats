import { useState } from 'preact/hooks';
import { parameters, dicePool, outcomes, pipeline, highlightTargetId, highlightTargetKind } from '@/state/app-state';
import { isScalarCondition as isScalarCond, isBinaryMathLiteral as isBML } from '@/utils/validation';
import type { Parameter, ParameterTarget, NamedValue } from '@/types';

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

  function jumpToTarget(param: Parameter) {
    let el: HTMLElement | null = null;
    if ((param.target === 'pool.count' || param.target === 'pool.sides') && param.targetTermId) {
      el = document.getElementById(`dice-term-row-${param.targetTermId}`);
    } else if (param.target === 'outcome.value' && param.targetOutcomeId) {
      el = document.getElementById(`outcome-row-${param.targetOutcomeId}`);
    } else if (param.target === 'pipeline.literal' && param.targetPipelineId) {
      el = document.getElementById(`pipeline-row-${param.targetPipelineId}`);
    }
    if (!el) return;
    const kind: 'term' | 'outcome' | 'pipeline' =
      param.target === 'outcome.value' ? 'outcome' : param.target === 'pipeline.literal' ? 'pipeline' : 'term';
    const id = (param.targetTermId || param.targetOutcomeId || param.targetPipelineId) ?? '';
    highlightTargetKind.value = kind;
    highlightTargetId.value = id;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('outline', 'outline-2', 'outline-offset-2', 'outline-blue-500', 'animate-pulse');
    setTimeout(() => {
      el?.classList.remove('outline', 'outline-2', 'outline-offset-2', 'outline-blue-500', 'animate-pulse');
      highlightTargetId.value = null;
      highlightTargetKind.value = null;
    }, 500);
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
    <div class="mb-4">
      <h2 class="text-lg font-semibold mb-4">Parameters</h2>
      <p class="text-sm text-gray-500 mb-4">
        Specify a parameter and values — a separate simulation will run for each value.
      </p>

      {params.map((param, i) => {
        const stale = getStaleInfo(param);
        return (
          <div
            key={param.id}
            class={`border rounded p-3 mb-3 ${stale ? 'border-red-500 bg-red-50' : 'bg-gray-50'}`}
          >
            <div class="flex items-center gap-2 mb-2">
              {stale && (
                <span
                  class="text-red-600"
                  title={stale.message}
                  aria-label={stale.message}
                >
                  {'\u26A0'}
                </span>
              )}
              <span class="font-mono text-sm">{param.label}</span>
              <span class="text-xs text-gray-500">({TARGET_OPTIONS.find((o) => o.value === param.target)?.label})</span>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <div>
                <label class="block text-xs text-gray-500">Label</label>
                <input
                  type="text"
                  value={param.label}
                  class="w-full px-2 py-1 border rounded text-sm"
                  onInput={(e) => updateParameter(i, { label: (e.target as HTMLInputElement).value })}
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500">Target</label>
                <select
                  value={param.target}
                  class="w-full px-2 py-1 border rounded text-sm"
                  onChange={(e) => {
                    const target = (e.target as HTMLSelectElement).value as ParameterTarget;
                    updateParameter(i, { target });
                  }}
                >
                  {TARGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {(param.target === 'pool.count' || param.target === 'pool.sides') && (
                <div>
                  <label class="block text-xs text-gray-500">Dice Term</label>
                  <select
                    value={param.targetTermId || ''}
                    class="w-full px-2 py-1 border rounded text-sm"
                    onChange={(e) => updateParameter(i, { targetTermId: (e.target as HTMLSelectElement).value })}
                  >
                    {dicePool.value.terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.count}d{t.sides}{t.tag ? ` ${t.tag}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              {param.target === 'outcome.value' && (
                <div>
                  <label class="block text-xs text-gray-500">Outcome</label>
                  <select
                    value={param.targetOutcomeId || ''}
                    class="w-full px-2 py-1 border rounded text-sm"
                    onChange={(e) => updateParameter(i, { targetOutcomeId: (e.target as HTMLSelectElement).value })}
                  >
                    {outcomes.value.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {param.target === 'pipeline.literal' && (
                <div>
                  <label class="block text-xs text-gray-500">Pipeline Step</label>
                  <select
                    value={param.targetPipelineId || ''}
                    class="w-full px-2 py-1 border rounded text-sm"
                    onChange={(e) => updateParameter(i, { targetPipelineId: (e.target as HTMLSelectElement).value })}
                  >
                    {scalarLiterals.map((sl) => (
                      <option key={sl.id} value={sl.id}>{sl.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div class="flex items-end">
                <button class="text-red-400 hover:text-red-600 text-sm" onClick={() => removeParameter(i)}>
                  Delete
                </button>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-xs text-gray-500">Values (comma-separated, or range like 1..5)</label>
              <input
                type="text"
                value={param.values.join(', ')}
                class="w-full px-2 py-1 border rounded text-sm"
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  const values = parseValues(raw);
                  updateParameter(i, { values });
                }}
              />
            </div>
            <div class="mt-2 flex items-center gap-2">
              {stale ? (
                retargetIndex === i ? (
                  <select
                    class="text-xs border rounded px-1 py-0.5"
                    value=""
                    onChange={(e) => {
                      const v = (e.target as HTMLSelectElement).value;
                      if (v) applyRetarget(i, v);
                    }}
                  >
                    <option value="">Retarget to…</option>
                    {retargetOptions(param).map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    class="text-xs text-indigo-600 hover:text-indigo-800"
                    onClick={() => setRetargetIndex(i)}
                  >
                    Retarget
                  </button>
                )
              ) : (
                <button
                  type="button"
                  class="text-xs text-indigo-600 hover:text-indigo-800"
                  onClick={() => jumpToTarget(param)}
                >
                  Jump to target
                </button>
              )}
              {stale && (
                <span class="text-xs text-red-600">{stale.message}</span>
              )}
            </div>
          </div>
        );
      })}

      {params.length < 3 && (
        <button class="text-sm text-indigo-600 hover:text-indigo-800" onClick={addParameter}>
          + Add parameter
        </button>
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
