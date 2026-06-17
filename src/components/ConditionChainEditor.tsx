import type { ConditionChain, ConditionClause, ConditionOperator, FaceValueSpecial } from '@/types';
import { existingTags, getTagColor } from '@/state/app-state';
import { Button, IconButton, Select, TextField } from '@/components/ui';

const CONDITION_OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!='];
const TAG_OPERATORS: ('=' | '!=')[] = ['=', '!='];

const FACE_VALUE_OPTIONS: { value: number | FaceValueSpecial; label: string }[] = [
  { value: 'max_value', label: 'max' },
  { value: 'min_value', label: 'min' },
];

export function ConditionChainEditor({ chain, onChange }: { chain: ConditionChain; onChange: (chain: ConditionChain) => void }) {
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

export { CONDITION_OPERATORS, TAG_OPERATORS, FACE_VALUE_OPTIONS };