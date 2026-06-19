import {
  pipeline,
  showComments,
  sweep,
} from '@/state/app-state';
import type {
  NamedValue,
  ScalarFunction,
  VectorFunction,
  ConditionChain,
  ScalarBinaryOp,
  Expr,
  ScalarBinaryTerm,
} from '@/types';
import { ExprInput } from '@/components/ExprInput';
import { ConditionChainEditor } from '@/components/ConditionChainEditor';
import { literalExpr } from '@/utils/expression';
import { inferTypeFromOp } from '@/utils/validation';
import { Button, IconButton, Select, TextField, BracketedNameInput } from '@/components/ui';

const SCALAR_BINARY_OPS: ScalarBinaryOp[] = ['add', 'subtract', 'multiply', 'divide'];

function emptyCondition(): ConditionChain {
  return { clauses: [{ field: 'face', operator: '>=', value: literalExpr(1) }], connectors: [] };
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

function getAvailableSources(pipe: NamedValue[], currentIndex: number): { id: string; label: string; type: 'vector' | 'scalar' }[] {
  const sources: { id: string; label: string; type: 'vector' | 'scalar' }[] = [{ id: 'rolled', label: 'rolled', type: 'vector' }];
  for (let i = 0; i < currentIndex && i < pipe.length; i++) {
    const nv = pipe[i];
    if (nv.name) {
      sources.push({ id: nv.name, label: nv.name, type: inferTypeFromOp(nv) });
    }
  }
  return sources;
}

export function PipelineEditor() {
  const pipe = pipeline.value;
  const sw = sweep.value;
  const availableVars = { x: sw.x.length > 0, y: sw.y !== null && sw.y.length > 0 };

  function addRow() {
    if (pipe.length >= 20) return;
    pipeline.value = [...pipe, emptyNamedValue()];
  }

  function removeRow(index: number) {
    pipeline.value = pipe.filter((_, i) => i !== index);
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
        const type = inferTypeFromOp(nv);
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
          const isBinary = typeof currentOp === 'object' && 'fn' in currentOp && SCALAR_BINARY_OPS.includes(currentOp.fn as ScalarBinaryOp) && 'terms' in currentOp;
          const sourceType = nv.source === 'rolled' ? 'vector' : (() => {
            const src = pipe.find((p) => p.name === nv.source);
            return src ? inferTypeFromOp(src) : 'vector';
          })();

          const nameInvalid = nv.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nv.name);
          const nameDuplicate = nv.name && pipe.filter((p) => p.name === nv.name).length > 1;
          const sourceInvalid = nv.source !== 'rolled' && !pipe.find((p) => p.name === nv.source);
          const hasError = nameInvalid || nameDuplicate || sourceInvalid;

          const outputType = inferTypeFromOp(nv);

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
                <BracketedNameInput
                  ariaLabel="Name"
                  value={nv.name}
                  placeholder="name"
                  maxLength={30}
                  bracketed={outputType === 'vector'}
                  onInput={(v) => updateRow(i, { name: v })}
                  className="w-32"
                />
                <span class="font-mono text-[13px] text-ink-mute">=</span>
                <Select
                  ariaLabel="Source"
                  value={nv.source}
                  onChange={(v) => {
                    const newSource = v;
                    const newSourceType = newSource === 'rolled' ? 'vector' : (() => {
                      const src = pipe.find((p) => p.name === newSource);
                      return src ? inferTypeFromOp(src) : 'vector';
                    })();
                    if (sourceType !== newSourceType) {
                      if (newSourceType === 'scalar') {
                        updateRow(i, { source: newSource, op: { fn: 'add', terms: [{ operand: 'literal', value: literalExpr(0) }] } as ScalarFunction });
                      } else {
                        updateRow(i, { source: newSource, op: { fn: 'filter', conditions: emptyCondition() } as VectorFunction });
                      }
                    } else {
                      updateRow(i, { source: newSource });
                    }
                  }}
                  className="w-40"
                  options={sources.map((s) => ({ value: s.id, label: s.type === 'vector' ? `[ ${s.label} ]` : s.label }))}
                />
                {sourceType === 'vector' ? (
                  <Select
                    ariaLabel="Function"
                    value={fnKey}
                    onChange={(v) => {
                      const fn = v;
                      if (fn === 'filter' || fn === 'remove') {
                        updateRow(i, { op: { fn, conditions: emptyCondition() } as VectorFunction });
                      } else if (fn === 'count' || fn === 'sum' || fn === 'max' || fn === 'min' || fn === 'sub') {
                        updateRow(i, { op: fn as ScalarFunction });
                      }
                    }}
                    className="w-24"
                options={[
                      { value: 'filter', label: 'filter' },
                      { value: 'remove', label: 'remove' },
                      { value: 'count', label: 'count' },
                      { value: 'sum', label: 'sum' },
                      { value: 'max', label: 'max' },
                      { value: 'min', label: 'min' },
                      { value: 'sub', label: 'sub' },
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
                        updateRow(i, { op: { fn: val as ScalarBinaryOp, terms: [{ operand: 'literal', value: literalExpr(0) }] } as ScalarFunction });
                      }
                    }}
                    className="w-24"
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
                    variant="pipeline"
                    availableVars={availableVars}
                  />
                </div>
              )}

              {isBinary && typeof currentOp === 'object' && 'fn' in currentOp && SCALAR_BINARY_OPS.includes(currentOp.fn as ScalarBinaryOp) && 'terms' in currentOp && (() => {
                const binaryOp = currentOp as { fn: ScalarBinaryOp; terms: ScalarBinaryTerm[] };
                const terms = binaryOp.terms || [];
                const scalarNames = getScalarNgNames(i);

                function updateTerms(newTerms: ScalarBinaryTerm[]) {
                  updateRow(i, { op: { fn: binaryOp.fn, terms: newTerms } as ScalarFunction });
                }

                function updateTerm(ti: number, partial: Partial<ScalarBinaryTerm>) {
                  const newTerms = terms.map((t, j) => (j === ti ? { ...t, ...partial } as ScalarBinaryTerm : t));
                  updateTerms(newTerms);
                }

                function addTerm() {
                  updateTerms([...terms, { operand: 'literal', value: literalExpr(0) }]);
                }

                function removeTerm(ti: number) {
                  if (terms.length <= 1) return;
                  updateTerms(terms.filter((_, j) => j !== ti));
                }

                return (
                  <div class="mt-2 space-y-1.5 pl-1 border-l border-rule">
                    {terms.map((term, ti) => (
                      <div key={ti} class="flex items-center gap-1">
                        <Select
                          ariaLabel="Operand"
                          value={term.operand}
                          onChange={(v) => {
                            if (v === 'literal') {
                              updateTerm(ti, { operand: 'literal', value: literalExpr(0) } as ScalarBinaryTerm);
                            } else {
                              const firstScalar = scalarNames[0] || '';
                              updateTerm(ti, { operand: 'named', source2: firstScalar } as ScalarBinaryTerm);
                            }
                          }}
                          className="w-20"
                          options={[
                            { value: 'literal', label: 'literal' },
                            { value: 'named', label: 'named' },
                          ]}
                        />
                        {term.operand === 'literal' ? (
                          <ExprInput
                            value={term.value}
                            onChange={(expr: Expr) => updateTerm(ti, { value: expr } as ScalarBinaryTerm)}
                            ariaLabel="Literal value"
                            availableVars={availableVars}
                            className="w-36"
                          />
                        ) : (
                          <Select
                            ariaLabel="Source 2"
                            value={term.source2 || ''}
                            onChange={(v) => updateTerm(ti, { source2: v } as ScalarBinaryTerm)}
                            className="w-32"
                            options={scalarNames.map((n) => ({ value: n, label: n }))}
                          />
                        )}
                        {terms.length > 1 && (
                          <IconButton onClick={() => removeTerm(ti)} ariaLabel="Remove term" variant="danger">
                            <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
                          </IconButton>
                        )}
                      </div>
                    ))}
                    <div class="flex items-center gap-1">
                      <Button variant="quiet" size="sm" onClick={addTerm}>
                        + term
                      </Button>
                    </div>
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
    </div>
  );
}
