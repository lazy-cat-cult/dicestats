import { rerollConditions, existingTags, getTagColor } from '@/state/app-state';
import type { RerollCondition, ConditionClause, ConditionChain, ConditionOperator, FaceValueSpecial } from '@/types';
import { Button, IconButton, Select, TextField } from '@/components/ui';

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
      {conditions.length === 0 && (
        <div class="border border-dashed border-rule px-4 py-5 text-center">
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
            No reroll conditions
          </p>
          <p class="text-[12px] text-ink-soft mt-1">
            Add a condition to replace or explode dice that meet a face or tag rule.
          </p>
        </div>
      )}

      <div class="space-y-2">
        {conditions.map((rc, i) => (
          <div
            key={rc.id}
            id={`reroll-row-${rc.id}`}
            class="border border-rule bg-paper-deep/30 px-3 py-2.5"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <Select
                ariaLabel="Action"
                value={rc.action}
                onChange={(v) => updateCondition(i, { action: v as 'reroll' | 'explode' })}
                className="w-24"
                options={[
                  { value: 'reroll', label: 'Reroll' },
                  { value: 'explode', label: 'Explode' },
                ]}
                />
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">if</span>
              <ConditionChainEditor
                chain={rc.conditions}
                onChange={(chain) => updateCondition(i, { conditions: chain })}
              />
            </div>
            <div class="mt-2 flex items-center gap-2 flex-wrap">
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">repeat</span>
              <TextField
                ariaLabel="Repeat count"
                type="number"
                min={1}
                max={99}
                value={rc.repeat}
                onInput={(v) => updateCondition(i, { repeat: Number(v) || 1 })}
                className="w-16"
                />
              <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
                {rc.action === 'explode' ? 'max cascade depth' : 'times'}
              </span>
              <TextField
                ariaLabel="Comment"
                value={rc.comment}
                placeholder="Comment (optional)"
                maxLength={100}
                onInput={(v) => updateCondition(i, { comment: v })}
                className="flex-1 min-w-[180px]"
              />
              <div class="flex items-center gap-0.5 ml-auto">
                <IconButton onClick={() => moveUp(i)} ariaLabel="Move up" disabled={i === 0}>
                  <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 7l3-3 3 3" stroke="currentColor" stroke-width="1.4" fill="none" /></svg>
                </IconButton>
                <IconButton onClick={() => moveDown(i)} ariaLabel="Move down" disabled={i === conditions.length - 1}>
                  <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.4" fill="none" /></svg>
                </IconButton>
                <IconButton onClick={() => removeCondition(i)} ariaLabel="Delete this condition" variant="danger">
                  <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      {conditions.length < 10 && (
        <div class="mt-3">
          <Button variant="ghost" size="sm" onClick={addCondition}>
            + Add condition
          </Button>
        </div>
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
                className="w-16"
                options={[{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }]}
                />
            )}
            <Select
              ariaLabel="Field"
              value={clause.field}
              onChange={(v) => updateClause(ci, { field: v as 'face' | 'tag' })}
              className="w-20"
              options={[{ value: 'face', label: 'face' }, { value: 'tag', label: 'tag' }]}
                />
            {isFace ? (
              <>
                <Select
                  ariaLabel="Operator"
                  value={clause.operator}
                  onChange={(v) => updateClause(ci, { operator: v as ConditionOperator })}
                  className="w-14"
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
                />
                    <Select
                      ariaLabel="Switch to special"
                      value="__number__"
                      onChange={(v) => {
                        if (v === 'max_value' || v === 'min_value') {
                          updateClause(ci, { value: v as FaceValueSpecial });
                        }
                      }}
                      className="w-16 text-ink-mute"
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
