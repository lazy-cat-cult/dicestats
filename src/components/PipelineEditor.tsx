import { pipeline, dicePool } from '@/state/app-state';
import type { NamedValue, ScalarFunction, VectorFunction, ConditionChain, ConditionClause, ConditionOperator, ScalarBinaryOp, FaceValueSpecial } from '@/types';

const CONDITION_OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!='];
const TAG_OPERATORS: ('=' | '!=')[] = ['=', '!='];
const SCALAR_BINARY_OPS: ScalarBinaryOp[] = ['add', 'subtract', 'multiply', 'divide'];

function emptyCondition(): ConditionChain {
  return { clauses: [{ field: 'face', operator: '>=', value: 1 }], connector: 'and' };
}

function emptyNamedValue(): NamedValue {
  return {
    id: crypto.randomUUID(),
    name: '',
    source: 'rolled',
    op: { fn: 'filter', conditions: emptyCondition() },
    comment: '',
  };
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

function getAvailableSources(pipeline: NamedValue[], currentIndex: number): { id: string; label: string; type: 'vector' | 'scalar' }[] {
  const sources: { id: string; label: string; type: 'vector' | 'scalar' }[] = [{ id: 'rolled', label: 'rolled', type: 'vector' }];
  for (let i = 0; i < currentIndex && i < pipeline.length; i++) {
    const nv = pipeline[i];
    if (nv.name) {
      sources.push({ id: nv.name, label: nv.name, type: getOutputType(nv) });
    }
  }
  return sources;
}

export function PipelineEditor() {
  const pipe = pipeline.value;

  function addRow() {
    if (pipe.length >= 20) return;
    pipeline.value = [...pipe, emptyNamedValue()];
  }

  function removeRow(index: number) {
    pipeline.value = pipe.filter((_, i) => i !== index);
  }

  function updateRow(index: number, partial: Record<string, any>) {
    pipeline.value = pipe.map((nv, i) => (i === index ? { ...nv, ...partial } as NamedValue : nv));
  }

  function getScalarNgNames(upToIndex: number): string[] {
    const names: string[] = [];
    const currentPipe = pipeline.value;
    for (let i = 0; i < upToIndex && i < currentPipe.length; i++) {
      const nv = currentPipe[i];
      if (nv.name && nv.source) {
        const type = getOutputType(nv);
        if (type === 'scalar') names.push(nv.name);
      }
    }
    return names;
  }

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Resolution Pipeline</h2>

      {pipe.length === 0 && (
        <p class="text-sm text-gray-500 mb-4">No pipeline steps. Outcomes will reference rolled values directly.</p>
      )}

      {pipe.map((nv, i) => {
        const sources = getAvailableSources(pipe, i);
        const currentOp = nv.op;
        const isVectorOp = typeof currentOp === 'object' && 'fn' in currentOp && (currentOp.fn === 'filter' || currentOp.fn === 'remove');
        const isCount = (currentOp as any) === 'count' || (currentOp as any) === 'sum';
        const isBinary = typeof currentOp === 'object' && 'fn' in currentOp && SCALAR_BINARY_OPS.includes(currentOp.fn as ScalarBinaryOp);
        const isCeilFloor = typeof currentOp === 'object' && 'fn' in currentOp && (currentOp.fn === 'ceil' || currentOp.fn === 'floor');
        const sourceType = nv.source === 'rolled' ? 'vector' : (() => {
          const src = pipe.find((p) => p.name === nv.source);
          return src ? getOutputType(src) : 'vector';
        })();

        const nameInvalid = nv.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nv.name);
        const nameDuplicate = nv.name && pipe.filter((p) => p.name === nv.name).length > 1;
        const sourceInvalid = nv.source !== 'rolled' && !pipe.find((p) => p.name === nv.source);

        const outputType = getOutputType(nv);

        return (
          <div key={nv.id} class={`border rounded p-3 mb-3 ${nameInvalid || nameDuplicate || sourceInvalid ? 'border-red-300 bg-red-50' : outputType === 'scalar' ? 'border-green-300 bg-green-50' : 'bg-gray-50'}`}>
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <input
                type="text"
                value={nv.name}
                placeholder="name"
                maxLength={30}
                class={`w-28 px-2 py-1 border rounded text-sm font-mono ${nameInvalid || nameDuplicate ? 'border-red-400' : outputType === 'scalar' ? 'text-green-700 border-green-400' : ''}`}
                onInput={(e) => updateRow(i, { name: (e.target as HTMLInputElement).value })}
              />
              <span class={`text-xs px-1.5 py-0.5 rounded ${outputType === 'scalar' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'}`}>{outputType === 'scalar' ? 'num' : 'vec'}</span>
              <span class="text-gray-500 text-sm">=</span>
              <select
                value={nv.source}
                class="px-2 py-1 border rounded text-sm"
                onChange={(e) => {
                  const newSource = (e.target as HTMLSelectElement).value;
                  const newSourceType = newSource === 'rolled' ? 'vector' : (() => {
                    const src = pipe.find((p) => p.name === newSource);
                    return src ? getOutputType(src) : 'vector';
                  })();
                  if (sourceType !== newSourceType) {
                    if (newSourceType === 'scalar') {
                      updateRow(i, { source: newSource, op: { fn: 'add', operand: 'literal', value: 0 } as ScalarFunction });
                    } else {
                      updateRow(i, { source: newSource, op: { fn: 'filter', conditions: emptyCondition() } as VectorFunction });
                    }
                  } else {
                    updateRow(i, { source: newSource });
                  }
                }}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.label} ({s.type === 'scalar' ? 'num' : 'vec'})</option>
                ))}
              </select>

              {sourceType === 'vector' ? (
                <select
                  value={typeof currentOp === 'object' && 'fn' in currentOp ? currentOp.fn : (currentOp === 'count' ? 'count' : currentOp === 'sum' ? 'sum' : currentOp === 'max' ? 'max' : currentOp === 'min' ? 'min' : 'filter')}
                  class="px-2 py-1 border rounded text-sm"
                  onChange={(e) => {
                    const fn = (e.target as HTMLSelectElement).value;
                    if (fn === 'filter' || fn === 'remove') {
                      updateRow(i, { op: { fn, conditions: emptyCondition() } as VectorFunction });
                    } else if (fn === 'count' || fn === 'sum' || fn === 'max' || fn === 'min') {
                      updateRow(i, { op: fn as ScalarFunction });
                    }
                  }}
                >
                  <option value="filter">filter</option>
                  <option value="remove">remove</option>
                  <option value="count">count</option>
                  <option value="sum">sum</option>
                  <option value="max">max</option>
                  <option value="min">min</option>
                </select>
              ) : (
                <select
                  value={
                    typeof currentOp === 'string' ? currentOp :
                    typeof currentOp === 'object' && 'fn' in currentOp ? currentOp.fn : 'add'
                  }
                  class="px-2 py-1 border rounded text-sm"
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    if (val === 'ceil' || val === 'floor') {
                      updateRow(i, { op: { fn: val } as ScalarFunction });
                    } else if (SCALAR_BINARY_OPS.includes(val as ScalarBinaryOp)) {
                      updateRow(i, { op: { fn: val as ScalarBinaryOp, operand: 'literal', value: 0 } as ScalarFunction });
                    }
                  }}
                >
                  {SCALAR_BINARY_OPS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                  <option value="ceil">ceil</option>
                  <option value="floor">floor</option>
                </select>
              )}

              <button class="text-red-400 hover:text-red-600" onClick={() => removeRow(i)}>×</button>
            </div>

            {isVectorOp && typeof currentOp === 'object' && 'fn' in currentOp && (currentOp.fn === 'filter' || currentOp.fn === 'remove') && (
              <ConditionChainEditor
                chain={currentOp.conditions}
                onChange={(chain) => {
                  updateRow(i, { op: { ...currentOp, conditions: chain } as VectorFunction });
                }}
              />
            )}

            {isBinary && typeof currentOp === 'object' && 'fn' in currentOp && SCALAR_BINARY_OPS.includes(currentOp.fn as ScalarBinaryOp) && (
              <div class="flex items-center gap-2 mb-1">
                <select
                  value={(currentOp as any).operand}
                  class="px-2 py-1 border rounded text-sm"
                  onChange={(e) => {
                    const operand = (e.target as HTMLSelectElement).value;
                    if (operand === 'literal') {
                      updateRow(i, { op: { fn: currentOp.fn as ScalarBinaryOp, operand: 'literal', value: 0 } as ScalarFunction });
                    } else {
                      const scalarNames = getScalarNgNames(i);
                      const firstScalar = scalarNames[0] || '';
                      updateRow(i, { op: { fn: currentOp.fn as ScalarBinaryOp, operand: 'named', source2: firstScalar } as ScalarFunction });
                    }
                  }}
                >
                  <option value="literal">literal</option>
                  <option value="named">named value</option>
                </select>
                {(currentOp as any).operand === 'literal' ? (
                  <input
                    type="number"
                    value={(currentOp as any).value ?? 0}
                    class="w-20 px-2 py-1 border rounded text-sm"
                    onInput={(e) => {
                      updateRow(i, { op: { fn: currentOp.fn as ScalarBinaryOp, operand: 'literal', value: Number((e.target as HTMLInputElement).value) || 0 } as ScalarFunction });
                    }}
                  />
                ) : (
                  <select
                    value={(currentOp as any).source2 || ''}
                    class="px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      updateRow(i, { op: { fn: currentOp.fn as ScalarBinaryOp, operand: 'named', source2: (e.target as HTMLSelectElement).value } as ScalarFunction });
                    }}
                  >
                    {getScalarNgNames(i).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <input
              type="text"
              value={nv.comment}
              placeholder="Comment (optional)"
              class="w-full mt-1 px-2 py-1 border rounded text-sm"
              onInput={(e) => updateRow(i, { comment: (e.target as HTMLInputElement).value })}
            />

            {(nameInvalid && <p class="text-red-500 text-xs mt-1">Name must match /^[a-zA-Z_][a-zA-Z0-9_]*$/</p>)}
            {(nameDuplicate && <p class="text-red-500 text-xs mt-1">Duplicate name</p>)}
            {(sourceInvalid && <p class="text-red-500 text-xs mt-1">Invalid source reference</p>)}
          </div>
        );
      })}

      {pipe.length < 20 && (
        <button class="text-sm text-indigo-600 hover:text-indigo-800" onClick={addRow}>
          + Add named value
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

  const FACE_VALUE_OPTIONS: { value: number | FaceValueSpecial; label: string }[] = [
    { value: 'max_value', label: 'max' },
    { value: 'min_value', label: 'min' },
  ];

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
                {CONDITION_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
              </select>
              {typeof clause.value === 'string' ? (
                <select
                  value={clause.value}
                  class="px-1 py-0.5 border rounded text-xs bg-yellow-50"
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    if (val === '__number__') {
                      updateClause(ci, { value: 1 });
                    } else {
                      updateClause(ci, { value: val as FaceValueSpecial });
                    }
                  }}
                >
                  {FACE_VALUE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  <option value="__number__">number…</option>
                </select>
              ) : (
                <span class="flex items-center gap-0.5">
                  <input
                    type="number"
                    value={clause.value as number}
                    class="w-14 px-1 py-0.5 border rounded text-xs text-center"
                    onInput={(e) => updateClause(ci, { value: Number((e.target as HTMLInputElement).value) || 0 })}
                  />
                  <select
                    value="__number__"
                    class="px-0.5 py-0.5 border rounded text-xs text-gray-400"
                    onChange={(e) => {
                      const val = (e.target as HTMLSelectElement).value;
                      if (val === 'max_value' || val === 'min_value') {
                        updateClause(ci, { value: val as FaceValueSpecial });
                      }
                    }}
                  >
                    <option value="__number__">number</option>
                    {FACE_VALUE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </span>
              )}
            </>
          ) : (
            <>
              <select
                value={clause.operator}
                class="px-1 py-0.5 border rounded text-xs"
                onChange={(e) => updateClause(ci, { operator: (e.target as HTMLSelectElement).value as '=' | '!=' })}
              >
                {TAG_OPERATORS.map((op) => (<option key={op} value={op}>{op}</option>))}
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