import { rerollConditions } from '@/state/app-state';
import type { RerollCondition, ConditionClause, ConditionChain, ConditionOperator } from '@/types';

const CONDITION_OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!='];
const TAG_OPERATORS: ('=' | '!=')[] = ['=', '!='];

function emptyCondition(): ConditionChain {
  return { clauses: [{ field: 'face', operator: '>=', value: 1 }], connector: 'and' };
}

function emptyRerollCondition(): RerollCondition {
  return {
    id: crypto.randomUUID(),
    action: 'reroll',
    conditions: emptyCondition(),
    repeat: 1,
    comment: '',
  };
}

export function RerollEditor() {
  const conditions = rerollConditions.value;

  function addCondition() {
    if (conditions.length >= 10) return;
    rerollConditions.value = [...conditions, emptyRerollCondition()];
  }

  function removeCondition(index: number) {
    rerollConditions.value = conditions.filter((_, i) => i !== index);
  }

  function updateCondition(index: number, partial: Partial<RerollCondition>) {
    rerollConditions.value = conditions.map((c, i) => (i === index ? { ...c, ...partial } : c));
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const arr = [...conditions];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    rerollConditions.value = arr;
  }

  function moveDown(index: number) {
    if (index >= conditions.length - 1) return;
    const arr = [...conditions];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    rerollConditions.value = arr;
  }

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Reroll Conditions</h2>

      {conditions.length === 0 && (
        <p class="text-sm text-gray-500 mb-4">No reroll conditions. Click '+' to add one.</p>
      )}

      {conditions.map((rc, i) => (
        <div key={rc.id} class="border rounded p-3 mb-3 bg-gray-50">
          <div class="flex items-center gap-2 mb-2">
            <select
              value={rc.action}
              class="px-2 py-1 border rounded text-sm"
              onChange={(e) => updateCondition(i, { action: (e.target as HTMLSelectElement).value as 'reroll' | 'explode' })}
            >
              <option value="reroll">Reroll</option>
              <option value="explode">Explode</option>
            </select>
            <span class="text-gray-500 text-sm">if</span>
            <span class="text-gray-500 text-sm">repeat</span>
            <input
              type="number"
              min={1}
              max={99}
              value={rc.repeat}
              class="w-14 px-2 py-1 border rounded text-sm text-center"
              onInput={(e) => updateCondition(i, { repeat: Number((e.target as HTMLInputElement).value) || 1 })}
            />
            <span class="text-gray-400 text-xs">{rc.action === 'explode' ? 'max cascade' : 'times'}</span>
            <div class="flex-1" />
            <button class="text-xs text-gray-400 hover:text-gray-600" onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
            <button class="text-xs text-gray-400 hover:text-gray-600" onClick={() => moveDown(i)} disabled={i === conditions.length - 1}>↓</button>
            <button class="text-red-400 hover:text-red-600" onClick={() => removeCondition(i)}>×</button>
          </div>

          <ConditionChainEditor
            chain={rc.conditions}
            onChange={(chain) => updateCondition(i, { conditions: chain })}
          />

          <input
            type="text"
            value={rc.comment}
            placeholder="Comment (optional)"
            maxLength={100}
            class="w-full mt-2 px-2 py-1 border rounded text-sm"
            onInput={(e) => updateCondition(i, { comment: (e.target as HTMLInputElement).value })}
          />
        </div>
      ))}

      {conditions.length < 10 && (
        <button class="text-sm text-indigo-600 hover:text-indigo-800" onClick={addCondition}>
          + Add condition
        </button>
      )}
    </div>
  );
}

function ConditionChainEditor({ chain, onChange }: { chain: ConditionChain; onChange: (chain: ConditionChain) => void }) {
  function addClause() {
    if (chain.clauses.length >= 10) return;
    onChange({ ...chain, clauses: [...chain.clauses, { field: 'face', operator: '>=', value: 1 }] });
  }

  function removeClause(index: number) {
    if (chain.clauses.length <= 1) return;
    onChange({ ...chain, clauses: chain.clauses.filter((_, i) => i !== index) });
  }

  function updateClause(index: number, partial: Partial<ConditionClause>) {
    const newClauses = chain.clauses.map((c, i) => {
      if (i !== index) return c;
      if (partial.field === 'tag') {
        return { field: 'tag' as const, operator: '=' as const, value: '' } as ConditionClause;
      }
      if (partial.field === 'face') {
        return { ...c, field: 'face' as const, operator: (partial.operator ?? c.operator) as ConditionOperator, value: partial.value ?? c.value } as ConditionClause;
      }
      return { ...c, ...partial } as ConditionClause;
    });
    onChange({ ...chain, clauses: newClauses });
  }

  return (
    <div>
      {chain.clauses.map((clause, ci) => (
        <div key={ci} class="flex items-center gap-1 mb-1 flex-wrap">
          {ci > 0 && (
            <select
              value={chain.connector}
              class="px-1 py-0.5 border rounded text-xs"
              onChange={(e) => onChange({ ...chain, connector: (e.target as HTMLSelectElement).value as 'and' | 'or' })}
            >
              <option value="and">AND</option>
              <option value="or">OR</option>
            </select>
          )}
          <select
            value={clause.field}
            class="px-1 py-0.5 border rounded text-xs"
            onChange={(e) => updateClause(ci, { field: (e.target as HTMLSelectElement).value as 'face' | 'tag' })}
          >
            <option value="face">face</option>
            <option value="tag">tag</option>
          </select>

          {clause.field === 'face' ? (
            <>
              <select
                value={clause.operator}
                class="px-1 py-0.5 border rounded text-xs"
                onChange={(e) => updateClause(ci, { operator: (e.target as HTMLSelectElement).value as ConditionOperator })}
              >
                {CONDITION_OPERATORS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <input
                type="number"
                value={clause.value as number}
                class="w-14 px-1 py-0.5 border rounded text-xs text-center"
                onInput={(e) => updateClause(ci, { value: Number((e.target as HTMLInputElement).value) || 0 })}
              />
            </>
          ) : (
            <>
              <select
                value={clause.operator}
                class="px-1 py-0.5 border rounded text-xs"
                onChange={(e) => updateClause(ci, { operator: (e.target as HTMLSelectElement).value as '=' | '!=' })}
              >
                {TAG_OPERATORS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <input
                type="text"
                value={clause.value as string}
                class="w-20 px-1 py-0.5 border rounded text-xs"
                onInput={(e) => updateClause(ci, { value: (e.target as HTMLInputElement).value })}
              />
            </>
          )}

          {chain.clauses.length > 1 && (
            <button class="text-red-400 hover:text-red-600 text-xs" onClick={() => removeClause(ci)}>×</button>
          )}
        </div>
      ))}
      {chain.clauses.length < 10 && (
        <button class="text-xs text-indigo-600 hover:text-indigo-800" onClick={addClause}>+ clause</button>
      )}
    </div>
  );
}