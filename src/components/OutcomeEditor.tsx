import { outcomes, pipeline, dicePool } from '@/state/app-state';
import type { Outcome, OutcomeCondition, ConditionOperator } from '@/types';

const CONDITION_OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!='];

function getSourceOptions(): { id: string; label: string }[] {
  const options = [{ id: 'rolled', label: 'rolled' }];
  for (const nv of pipeline.value) {
    if (nv.name) {
      options.push({ id: nv.name, label: nv.name });
    }
  }
  return options;
}

function isScalarSource(source: string): boolean {
  if (source === 'rolled') return false;
  const nv = pipeline.value.find((p) => p.name === source);
  if (!nv) return false;
  const op = nv.op;
  if (typeof op === 'string' && op === 'count') return true;
  if (typeof op === 'object' && 'fn' in op) {
    if (op.fn === 'filter' || op.fn === 'remove') return false;
    return true;
  }
  return false;
}

function emptyOutcome(): Outcome {
  return {
    id: crypto.randomUUID(),
    name: 'New Outcome',
    source: 'rolled',
    conditions: [{ op: '>=', value: 10 }],
    connector: 'and',
    comment: '',
    isDefault: false,
  };
}

export function OutcomeEditor() {
  const list = outcomes.value;

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

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Outcomes</h2>

      {list.map((outcome, i) => {
        const scalar = isScalarSource(outcome.source);
        const sourceOptions = getSourceOptions();

        return (
          <div key={outcome.id} class="border rounded p-3 mb-3 bg-gray-50">
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
                  <option key={s.id} value={s.id}>{s.label}</option>
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
                    const conditions = [...outcome.conditions, { op: '>=', value: 0 } as OutcomeCondition];
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
    </div>
  );
}

function OutcomeScalarCondition({ cond, onChange }: { cond: OutcomeCondition; onChange: (c: OutcomeCondition) => void }) {
  if (typeof cond === 'object' && 'op' in cond && (cond as any).op !== 'all?' && typeof cond !== 'string') {
    const c = cond as { op: ConditionOperator; value: number };
    return (
      <div class="flex items-center gap-1">
        <select
          value={c.op}
          class="px-1 py-0.5 border rounded text-xs"
          onChange={(e) => onChange({ op: (e.target as HTMLSelectElement).value as ConditionOperator, value: c.value })}
        >
          {CONDITION_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
        </select>
        <input
          type="number"
          value={c.value}
          class="w-16 px-1 py-0.5 border rounded text-xs text-center"
          onInput={(e) => onChange({ op: c.op, value: Number((e.target as HTMLInputElement).value) || 0 })}
        />
      </div>
    );
  }
  return <span class="text-xs text-gray-500">Condition not applicable to scalar</span>;
}

function OutcomeVectorCondition({ cond, onChange }: { cond: OutcomeCondition; onChange: (c: OutcomeCondition) => void }) {
  if (cond === 'none?') {
    return (
      <button class="px-2 py-0.5 border rounded text-xs bg-blue-50" onClick={() => onChange({ op: '>=', value: 0 })}>
        none?
      </button>
    );
  }
  if (cond === 'any?') {
    return (
      <button class="px-2 py-0.5 border rounded text-xs bg-blue-50" onClick={() => onChange({ op: '>=', value: 0 })}>
        any?
      </button>
    );
  }
  const typeCond = typeof cond === 'object' && 'op' in cond;

  return (
    <div class="flex items-center gap-1">
      <select
        value={typeCond && cond.op === 'all?' ? 'all?' : 'compare'}
        class="px-1 py-0.5 border rounded text-xs"
        onChange={(e) => {
          const val = (e.target as HTMLSelectElement).value;
          if (val === 'none?') onChange('none?' as OutcomeCondition);
          else if (val === 'any?') onChange('any?' as OutcomeCondition);
          else if (val === 'all?') onChange({ op: 'all?', subCondition: '>=', value: 1 } as OutcomeCondition);
          else onChange({ op: '>=', value: 0 } as OutcomeCondition);
        }}
      >
        <option value="compare">compare</option>
        <option value="none?">none?</option>
        <option value="any?">any?</option>
        <option value="all?">all?</option>
      </select>
      {typeCond && (
        <>
          {cond.op === 'all?' ? (
            <>
              <span class="text-xs text-gray-500">all</span>
              <select
                value={(cond as any).subCondition}
                class="px-1 py-0.5 border rounded text-xs"
                onChange={(e) => onChange({ op: 'all?', subCondition: (e.target as HTMLSelectElement).value as ConditionOperator, value: (cond as any).value })}
              >
                {CONDITION_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
              </select>
              <input
                type="number"
                value={(cond as any).value}
                class="w-14 px-1 py-0.5 border rounded text-xs text-center"
                onInput={(e) => onChange({ op: 'all?', subCondition: (cond as any).subCondition, value: Number((e.target as HTMLInputElement).value) || 0 })}
              />
            </>
          ) : (
            <>
              <select
                value={(cond as any).op}
                class="px-1 py-0.5 border rounded text-xs"
                onChange={(e) => onChange({ op: (e.target as HTMLSelectElement).value as ConditionOperator, value: (cond as any).value })}
              >
                {CONDITION_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
              </select>
              <input
                type="number"
                value={(cond as any).value}
                class="w-16 px-1 py-0.5 border rounded text-xs text-center"
                onInput={(e) => onChange({ op: (cond as any).op, value: Number((e.target as HTMLInputElement).value) || 0 })}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}