import type { ConditionChain, ConditionClause, ConditionOperator, Expr } from '@/types';
import { existingTags, getTagColor } from '@/state/app-state';
import { Button, IconButton, Select } from '@/components/ui';
import { ExprInput } from '@/components/ExprInput';
import { literalExpr } from '@/utils/expression';

const CONDITION_OPERATORS: ConditionOperator[] = ['>=', '>', '<=', '<', '=', '!=', 'is_min', 'is_max', 'is_even', 'is_odd'];
const TAG_OPERATORS: ('=' | '!=')[] = ['=', '!='];

export function ConditionChainEditor({ chain, onChange, variant, availableVars }: { chain: ConditionChain; onChange: (chain: ConditionChain) => void; variant: 'pipeline' | 'reroll'; availableVars?: { x: boolean; y: boolean } }) {
  function addClause() {
    if (chain.clauses.length >= 10) return;
    const prevConnector = chain.connectors.length > 0 ? chain.connectors[chain.connectors.length - 1]! : 'and';
    onChange({
      clauses: [...chain.clauses, { field: 'face', operator: '>=', value: literalExpr(1) }],
      connectors: [...chain.connectors, prevConnector],
    });
  }

  function removeClause(index: number) {
    if (chain.clauses.length <= 1) return;
    const connIndex = index === 0 ? 0 : index - 1;
    onChange({
      clauses: chain.clauses.filter((_, i) => i !== index),
      connectors: chain.connectors.filter((_, i) => i !== connIndex),
    });
  }

  function updateClause(index: number, partial: Partial<ConditionClause>) {
    const newClauses = chain.clauses.map((c, i) => {
      if (i !== index) return c;
      if (partial.field === 'tag') {
        return { field: 'tag' as const, operator: '=' as const, value: '' } as ConditionClause;
      }
      if (partial.field === 'face') {
        return { ...c, field: 'face' as const, operator: (partial.operator ?? c.operator) as ConditionOperator, value: partial.value as Expr | undefined } as ConditionClause;
      }
      return { ...c, ...partial } as ConditionClause;
    });
    onChange({ clauses: newClauses, connectors: chain.connectors });
  }

  function updateConnector(index: number, value: 'and' | 'or') {
    const newConnectors = chain.connectors.map((c, i) => (i === index ? value : c));
    onChange({ clauses: chain.clauses, connectors: newConnectors });
  }

  const clauseRows = chain.clauses.map((clause, ci) => {
    const isFace = clause.field === 'face';
    const isSpecialOp = isFace && (clause.operator === 'is_min' || clause.operator === 'is_max' || clause.operator === 'is_even' || clause.operator === 'is_odd');
    const connectorSelect = ci > 0 ? (
      <Select
        ariaLabel="Connector"
        value={chain.connectors[ci - 1]!}
        onChange={(v) => updateConnector(ci - 1, v as 'and' | 'or')}
        className="w-14"
        options={[{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }]}
      />
    ) : null;

    const fieldSelect = (
      <Select
        ariaLabel="Field"
        value={clause.field}
        onChange={(v) => updateClause(ci, { field: v as 'face' | 'tag' })}
        className="w-20"
        options={[{ value: 'face', label: 'face' }, { value: 'tag', label: 'tag' }]}
      />
    );

    const operatorSelect = isFace ? (
      <Select
        ariaLabel="Operator"
        value={clause.operator}
        onChange={(v) => updateClause(ci, { operator: v as ConditionOperator })}
        className={isSpecialOp ? 'w-20' : 'w-14'}
        options={CONDITION_OPERATORS.map((op) => ({ value: op, label: op }))}
      />
    ) : (
      <Select
        ariaLabel="Operator"
        value={clause.operator}
        onChange={(v) => updateClause(ci, { operator: v as '=' | '!=' })}
        className="w-14"
        options={TAG_OPERATORS.map((op) => ({ value: op, label: op }))}
      />
    );

    const valueInput = isFace && !isSpecialOp ? (
      <ExprInput
        value={clause.value ?? literalExpr(0)}
        onChange={(expr: Expr) => updateClause(ci, { value: expr })}
        ariaLabel="Value"
        availableVars={availableVars}
        className="w-32"
      />
    ) : !isFace ? (
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
    ) : null;

    const removeBtn = chain.clauses.length > 1 ? (
      <IconButton onClick={() => removeClause(ci)} ariaLabel="Remove clause" variant="danger">
        <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
      </IconButton>
    ) : null;

    if (variant === 'pipeline') {
      const prefix = ci === 0 ? (
        <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute w-14 shrink-0 text-right">when</span>
      ) : (
        <Select
          ariaLabel="Connector"
          value={chain.connectors[ci - 1]!}
          onChange={(v) => updateConnector(ci - 1, v as 'and' | 'or')}
          className="w-14"
          options={[{ value: 'and', label: 'AND' }, { value: 'or', label: 'OR' }]}
        />
      );
      return (
        <div key={ci} class="flex items-center gap-1 flex-wrap">
          {prefix}
          {fieldSelect}
          {operatorSelect}
          {valueInput}
          {removeBtn}
        </div>
      );
    }

    return (
      <span key={ci} class="inline-flex items-center gap-1">
        {connectorSelect}
        {fieldSelect}
        {operatorSelect}
        {valueInput}
        {removeBtn}
      </span>
    );
  });

  if (variant === 'pipeline') {
    return (
      <div class="space-y-1.5">
        {clauseRows}
        {chain.clauses.length < 10 && (
          <div class="flex items-center gap-1">
            <span class="w-14 shrink-0" />
            <Button variant="quiet" size="sm" onClick={addClause} ariaLabel="Add clause">
              + clause
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <span class="inline-flex flex-wrap items-center gap-1">
      {clauseRows}
      {chain.clauses.length < 10 && (
        <Button variant="quiet" size="sm" onClick={addClause} ariaLabel="Add clause">
          + clause
        </Button>
      )}
    </span>
  );
}

export { CONDITION_OPERATORS, TAG_OPERATORS };
