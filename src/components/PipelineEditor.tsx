import { useState } from 'preact/hooks';
import {
  pipeline,
  activeSweepsByTarget,
  parameters,
  showComments,
  existingTags,
  getTagColor,
} from '@/state/app-state';
import type {
  NamedValue,
  ScalarFunction,
  VectorFunction,
  ConditionChain,
  ConditionClause,
  ConditionOperator,
  ScalarBinaryOp,
  FaceValueSpecial,
  Parameter,
  ScalarLiteralOp,
  ScalarNamedOp,
} from '@/types';
import { SweepIndicator } from '@/components/SweepIndicator';
import { SweepPopover } from '@/components/SweepPopover';
import { Button, IconButton, Pill, Select, TextField } from '@/components/ui';

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

function getAvailableSources(pipe: NamedValue[], currentIndex: number): { id: string; label: string; type: 'vector' | 'scalar' }[] {
  const sources: { id: string; label: string; type: 'vector' | 'scalar' }[] = [{ id: 'rolled', label: 'rolled', type: 'vector' }];
  for (let i = 0; i < currentIndex && i < pipe.length; i++) {
    const nv = pipe[i];
    if (nv.name) {
      sources.push({ id: nv.name, label: nv.name, type: getOutputType(nv) });
    }
  }
  return sources;
}

export function PipelineEditor() {
  const pipe = pipeline.value;
  const sweeps = activeSweepsByTarget.value;
  const paramsCount = parameters.value.length;
  const [popoverNvId, setPopoverNvId] = useState<string | null>(null);

  function addRow() {
    if (pipe.length >= 20) return;
    pipeline.value = [...pipe, emptyNamedValue()];
  }

  function removeRow(index: number) {
    pipeline.value = pipe.filter((_, i) => i !== index);
  }

  function createPipelineSweep(nvId: string, label: string, values: number[]) {
    const newParam: Parameter = {
      id: crypto.randomUUID(),
      label,
      values,
      target: 'pipeline.literal',
      targetPipelineId: nvId,
    };
    parameters.value = [...parameters.value, newParam];
    setPopoverNvId(null);
  }

  function updateRow(index: number, partial: Partial<NamedValue>) {
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
      {pipe.length === 0 && (
        <div class="border border-dashed border-rule px-4 py-5 text-center">
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
            No pipeline steps
          </p>
          <p class="text-[12px] text-ink-soft mt-1">
            Outcomes will reference rolled values directly.
          </p>
        </div>
      )}

      <div class="space-y-2">
        {pipe.map((nv, i) => {
          const sources = getAvailableSources(pipe, i);
          const currentOp = nv.op;
          const isVectorOp = typeof currentOp === 'object' && 'fn' in currentOp && (currentOp.fn === 'filter' || currentOp.fn === 'remove');
          const isBinary = typeof currentOp === 'object' && 'fn' in currentOp && SCALAR_BINARY_OPS.includes(currentOp.fn as ScalarBinaryOp);
          const sourceType = nv.source === 'rolled' ? 'vector' : (() => {
            const src = pipe.find((p) => p.name === nv.source);
            return src ? getOutputType(src) : 'vector';
          })();

          const nameInvalid = nv.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nv.name);
          const nameDuplicate = nv.name && pipe.filter((p) => p.name === nv.name).length > 1;
          const sourceInvalid = nv.source !== 'rolled' && !pipe.find((p) => p.name === nv.source);
          const hasError = nameInvalid || nameDuplicate || sourceInvalid;

          const outputType = getOutputType(nv);

          const fnKey = typeof currentOp === 'string'
            ? currentOp
            : typeof currentOp === 'object' && 'fn' in currentOp
              ? currentOp.fn
              : 'filter';

          return (
            <div
              key={nv.id}
              id={`pipeline-row-${nv.id}`}
              class={`border bg-paper-deep/30 px-3 py-2.5 ${hasError ? 'border-billiard' : 'border-rule'}`}
            >
              <div class="flex items-center gap-2 flex-wrap">
                <TextField
                  ariaLabel="Name"
                  value={nv.name}
                  placeholder="name"
                  maxLength={30}
                  onInput={(v) => updateRow(i, { name: v })}
                  className="w-32"
                  mono
                />
                <Pill variant={outputType === 'scalar' ? 'accent' : 'mute'}>
                  {outputType === 'scalar' ? 'value' : 'dice'}
                </Pill>
                <span class="font-mono text-[13px] text-ink-mute">=</span>
                <Select
                  ariaLabel="Source"
                  value={nv.source}
                  onChange={(v) => {
                    const newSource = v;
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
                  className="w-40"
                  options={sources.map((s) => ({ value: s.id, label: `${s.label} (${s.type === 'scalar' ? 'value' : 'dice'})` }))}
                />
                {sourceType === 'vector' ? (
                  <Select
                    ariaLabel="Function"
                    value={fnKey}
                    onChange={(v) => {
                      const fn = v;
                      if (fn === 'filter' || fn === 'remove') {
                        updateRow(i, { op: { fn, conditions: emptyCondition() } as VectorFunction });
                      } else if (fn === 'count' || fn === 'sum' || fn === 'max' || fn === 'min') {
                        updateRow(i, { op: fn as ScalarFunction });
                      }
                    }}
                    className="w-24"
                    mono
                    options={[
                      { value: 'filter', label: 'filter' },
                      { value: 'remove', label: 'remove' },
                      { value: 'count', label: 'count' },
                      { value: 'sum', label: 'sum' },
                      { value: 'max', label: 'max' },
                      { value: 'min', label: 'min' },
                    ]}
                  />
                ) : (
                  <Select
                    ariaLabel="Function"
                    value={fnKey}
                    onChange={(v) => {
                      const val = v;
                      if (val === 'ceil' || val === 'floor') {
                        updateRow(i, { op: { fn: val } as ScalarFunction });
                      } else if (SCALAR_BINARY_OPS.includes(val as ScalarBinaryOp)) {
                        updateRow(i, { op: { fn: val as ScalarBinaryOp, operand: 'literal', value: 0 } as ScalarFunction });
                      }
                    }}
                    className="w-24"
                    mono
                    options={[
                      ...SCALAR_BINARY_OPS.map((op) => ({ value: op, label: op })),
                      { value: 'ceil', label: 'ceil' },
                      { value: 'floor', label: 'floor' },
                    ]}
                  />
                )}
                <div class="ml-auto">
                  <IconButton onClick={() => removeRow(i)} ariaLabel="Remove pipeline step" variant="danger">
                    <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
                  </IconButton>
                </div>
              </div>

              {isVectorOp && typeof currentOp === 'object' && 'fn' in currentOp && (currentOp.fn === 'filter' || currentOp.fn === 'remove') && (
                <div class="mt-2 pl-1 border-l border-rule">
                  <ConditionChainEditor
                    chain={currentOp.conditions}
                    onChange={(chain) => {
                      updateRow(i, { op: { ...currentOp, conditions: chain } as VectorFunction });
                    }}
                  />
                </div>
              )}

              {isBinary && typeof currentOp === 'object' && 'fn' in currentOp && SCALAR_BINARY_OPS.includes(currentOp.fn as ScalarBinaryOp) && (() => {
                const binaryOp = currentOp as ScalarLiteralOp | ScalarNamedOp;
                return (
                  <div class="mt-2 flex items-center gap-2 flex-wrap pl-1 border-l border-rule">
                    <Select
                      ariaLabel="Operand"
                      value={binaryOp.operand}
                      onChange={(v) => {
                        const operand = v;
                        if (operand === 'literal') {
                          updateRow(i, { op: { fn: binaryOp.fn, operand: 'literal', value: 0 } as ScalarFunction });
                        } else {
                          const scalarNames = getScalarNgNames(i);
                          const firstScalar = scalarNames[0] || '';
                          updateRow(i, { op: { fn: binaryOp.fn, operand: 'named', source2: firstScalar } as ScalarFunction });
                        }
                      }}
                      className="w-24"
                      mono
                      options={[
                        { value: 'literal', label: 'literal' },
                        { value: 'named', label: 'named' },
                      ]}
                    />
                    {binaryOp.operand === 'literal' ? (
                      <>
                        <TextField
                          ariaLabel="Literal value"
                          type="number"
                          value={binaryOp.value ?? 0}
                          onInput={(v) => {
                            updateRow(i, { op: { fn: binaryOp.fn, operand: 'literal', value: Number(v) || 0 } as ScalarFunction });
                          }}
                          className="w-20"
                          mono
                        />
                        {(() => {
                          const sweepParam = sweeps.get(`pipeline.literal:${nv.id}`);
                          if (sweepParam) {
                            return (
                              <SweepIndicator
                                parameterId={sweepParam.id}
                                label={sweepParam.label}
                                values={sweepParam.values}
                              />
                            );
                          }
                          if (paramsCount < 3) {
                            return (
                              <Button variant="quiet" size="sm" onClick={() => setPopoverNvId(nv.id)} ariaLabel="Add sweep to pipeline literal">
                                ↻ Sweep
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </>
                    ) : (
                      <Select
                        ariaLabel="Source 2"
                        value={(binaryOp as ScalarNamedOp).source2 || ''}
                        onChange={(v) => {
                          updateRow(i, { op: { fn: binaryOp.fn, operand: 'named', source2: v } as ScalarFunction });
                        }}
                        className="w-32"
                        options={getScalarNgNames(i).map((n) => ({ value: n, label: n }))}
                      />
                    )}
                  </div>
                );
              })()}

              {showComments.value && (
                <div class="mt-2">
                  <TextField
                    ariaLabel="Comment"
                    value={nv.comment}
                    placeholder="Comment (optional)"
                    onInput={(v) => updateRow(i, { comment: v })}
                    className="w-full"
                  />
                </div>
              )}

              {hasError && (
                <ul class="mt-1.5 space-y-0.5">
                  {nameInvalid && <li class="font-mono text-[11px] text-billiard">Name must match /^[a-zA-Z_][a-zA-Z0-9_]*$/</li>}
                  {nameDuplicate && <li class="font-mono text-[11px] text-billiard">Duplicate name</li>}
                  {sourceInvalid && <li class="font-mono text-[11px] text-billiard">Invalid source reference</li>}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {pipe.length < 20 && (
        <div class="mt-3">
          <Button variant="ghost" size="sm" onClick={addRow}>
            + Add named value
          </Button>
        </div>
      )}

      {popoverNvId && (
        <SweepPopover
          open={true}
          defaultLabel="Modifier"
          defaultValues="-2, -1, 0, 1, 2"
          maxSimulationsReached={paramsCount >= 3}
          onCreate={(label, values) => createPipelineSweep(popoverNvId, label, values)}
          onCancel={() => setPopoverNvId(null)}
        />
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
    <div class="flex flex-wrap items-center gap-1.5">
      {chain.clauses.map((clause, ci) => {
        const isFace = clause.field === 'face';
        const isStringValue = isFace && typeof clause.value === 'string';
        return (
          <div key={ci} class="flex items-center gap-1 flex-wrap">
            {ci > 0 && (
              <Select
                ariaLabel="Connector"
                value={chain.connector}
                onChange={(v) => onChange({ ...chain, connector: v as 'and' | 'or' })}
                className="w-14"
                mono
                options={[{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }]}
              />
            )}
            <Select
              ariaLabel="Field"
              value={clause.field}
              onChange={(v) => updateClause(ci, { field: v as 'face' | 'tag' })}
              className="w-16"
              mono
              options={[{ value: 'face', label: 'face' }, { value: 'tag', label: 'tag' }]}
            />
            {isFace ? (
              <>
                <Select
                  ariaLabel="Operator"
                  value={clause.operator}
                  onChange={(v) => updateClause(ci, { operator: v as ConditionOperator })}
                  className="w-14"
                  mono
                  options={CONDITION_OPERATORS.map((op) => ({ value: op, label: op }))}
                />
                {isStringValue ? (
                  <Select
                    ariaLabel="Value"
                    value={clause.value as string}
                    onChange={(v) => {
                      if (v === '__number__') updateClause(ci, { value: 1 });
                      else updateClause(ci, { value: v as FaceValueSpecial });
                    }}
                    className="w-24"
                    mono
                    options={[
                      ...FACE_VALUE_OPTIONS.map((opt) => ({ value: opt.value as string, label: opt.label })),
                      { value: '__number__', label: 'number…' },
                    ]}
                  />
                ) : (
                  <div class="flex items-center gap-1">
                    <TextField
                      ariaLabel="Value"
                      type="number"
                      value={clause.value as number}
                      onInput={(v) => updateClause(ci, { value: Number(v) || 0 })}
                      className="w-16"
                      mono
                    />
                    <Select
                      ariaLabel="Switch to special"
                      value="__number__"
                      onChange={(v) => {
                        if (v === 'max_value' || v === 'min_value') {
                          updateClause(ci, { value: v as FaceValueSpecial });
                        }
                      }}
                      className="w-16"
                      mono
                      options={[
                        { value: '__number__', label: 'num' },
                        ...FACE_VALUE_OPTIONS.map((opt) => ({ value: opt.value as string, label: opt.label })),
                      ]}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <Select
                  ariaLabel="Operator"
                  value={clause.operator}
                  onChange={(v) => updateClause(ci, { operator: v as '=' | '!=' })}
                  className="w-14"
                  mono
                  options={TAG_OPERATORS.map((op) => ({ value: op, label: op }))}
                />
                <Select
                  ariaLabel="Tag value"
                  value={clause.value as string}
                  onChange={(v) => updateClause(ci, { value: v })}
                  className="w-32"
                  style={typeof clause.value === 'string' && clause.value ? { borderColor: getTagColor(clause.value) } : undefined}
                  options={existingTags.value.length === 0
                    ? [{ value: '', label: 'Select tag…' }]
                    : existingTags.value.map((tag) => ({ value: tag, label: tag }))}
                />
              </>
            )}
            {chain.clauses.length > 1 && (
              <IconButton onClick={() => removeClause(ci)} ariaLabel="Remove clause" variant="danger">
                <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
              </IconButton>
            )}
          </div>
        );
      })}
      {chain.clauses.length < 10 && (
        <Button variant="quiet" size="sm" onClick={addClause} ariaLabel="Add clause">
          + clause
        </Button>
      )}
    </div>
  );
}
