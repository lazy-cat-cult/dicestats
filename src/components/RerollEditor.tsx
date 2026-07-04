import { rerollConditions, showRerollComments, sweep } from '@/state/app-state';
import type { RerollCondition, ConditionChain } from '@/types';
import { Button, IconButton, Select, TextField } from '@/components/ui';
import { ConditionChainEditor } from '@/components/ConditionChainEditor';
import { literalExpr } from '@/utils/expression';

function emptyCondition(): ConditionChain {
  return { clauses: [{ field: 'face', operator: '>=', value: literalExpr(1) }], connectors: [] };
}

function emptyRerollCondition(): RerollCondition {
  return {
    id: crypto.randomUUID(),
    action: 'reroll',
    conditions: emptyCondition(),
    repeat: 1,
    comment: '',
    tagAs: '',
  };
}

export function RerollEditor() {
  const conditions = rerollConditions.value;
  const sw = sweep.value;
  const availableVars = [
    { name: sw.xName, label: `${sw.xName}${sw.x.length > 0 ? '' : ' (not set)'}`, available: sw.x.length > 0 },
    { name: sw.yName, label: `${sw.yName}${sw.y !== null && sw.y.length > 0 ? '' : ' (not set)'}`, available: sw.y !== null && sw.y.length > 0 },
  ];

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
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">if</span>
              <ConditionChainEditor
                chain={rc.conditions}
                onChange={(chain) => updateCondition(i, { conditions: chain })}
                variant="reroll"
                availableVars={availableVars}
              />
            </div>
            <div class="mt-2 flex items-center gap-2 flex-wrap">
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">then</span>
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
              <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">max times</span>
              <TextField
                ariaLabel="Repeat count"
                type="number"
                min={1}
                max={99}
                value={rc.repeat}
                onInput={(v) => updateCondition(i, { repeat: Number(v) || 1 })}
                className="w-16"
              />
              <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">tag as</span>
              <TextField
                ariaLabel="Tag as"
                value={rc.tagAs}
                placeholder="inherit"
                maxLength={30}
                onInput={(v) => updateCondition(i, { tagAs: v })}
                className="w-32"
              />
              {showRerollComments.value && (
                <TextField
                  ariaLabel="Comment"
                  value={rc.comment}
                  placeholder="Comment (optional)"
                  maxLength={100}
                  onInput={(v) => updateCondition(i, { comment: v })}
                  className="flex-1 min-w-[180px]"
                />
              )}
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
