import { parameters, dicePool, outcomes, pipeline } from '@/state/app-state';
import type { Parameter, ParameterTarget, NamedValue, ScalarFunction } from '@/types';

const TARGET_OPTIONS: { value: ParameterTarget; label: string }[] = [
  { value: 'pool.count', label: 'Dice count' },
  { value: 'pool.sides', label: 'Dice sides' },
  { value: 'outcome.value', label: 'Outcome threshold' },
  { value: 'pipeline.literal', label: 'Pipeline literal' },
];

function getScalarLiterals(pipe: NamedValue[]): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const nv of pipe) {
    const op = nv.op;
    if (typeof op === 'object' && 'fn' in op) {
      const fn = op.fn;
      if (fn === 'add' || fn === 'subtract' || fn === 'multiply' || fn === 'divide') {
        if ((op as any).operand === 'literal') {
          result.push({ id: nv.id, label: `${nv.name} (${fn} ${(op as any).value})` });
        }
      }
    }
  }
  return result;
}

export function ParameterEditor() {
  const params = parameters.value;
  const scalarLiterals = getScalarLiterals(pipeline.value);

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

  return (
    <div class="mb-4">
      <h2 class="text-lg font-semibold mb-4">Parameters</h2>
      <p class="text-sm text-gray-500 mb-4">
        Specify a parameter and values — a separate simulation will run for each value.
      </p>

      {params.map((param, i) => (
        <div key={param.id} class="border rounded p-3 mb-3 bg-gray-50">
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
        </div>
      ))}

      {params.length < 3 && (
        <button class="text-sm text-indigo-600 hover:text-indigo-800" onClick={addParameter}>
          + Add parameter
        </button>
      )}

      {params.length > 0 && (() => {
        const totalIter = params.reduce((acc, p) => acc * p.values.length, 1_000_000);
        if (totalIter > 10_000_000) {
          return <p class="text-xs text-yellow-600 mt-2">Warning: {((totalIter / 1_000_000) | 0)}M total iterations</p>;
        }
        return null;
      })()}
    </div>
  );
}

function parseValues(raw: string): number[] {
  const results: number[] = [];
  const parts = raw.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\.\.(\d+)$/);
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