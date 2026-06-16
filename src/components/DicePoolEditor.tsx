import { useState } from 'preact/hooks';
import {
  dicePool,
  dicePoolNotation,
  getTagColor,
  activeSweepsByTarget,
  parameters,
} from '@/state/app-state';
import type { DiceTerm, Parameter } from '@/types';
import { SweepIndicator } from '@/components/SweepIndicator';
import { SweepPopover } from '@/components/SweepPopover';
import { Button, IconButton, Select, TextField } from '@/components/ui';

const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];

interface PopoverState {
  field: 'count' | 'sides';
  termId: string;
}

export function DicePoolEditor() {
  const pool = dicePool.value;
  const sweeps = activeSweepsByTarget.value;
  const paramsCount = parameters.value.length;
  const [popover, setPopover] = useState<PopoverState | null>(null);

  function updateTerm(index: number, partial: Partial<DiceTerm>) {
    const terms = dicePool.value.terms.map((t, i) => (i === index ? { ...t, ...partial } : { ...t }));
    dicePool.value = { ...dicePool.value, terms };
  }

  function addTerm() {
    dicePool.value = {
      ...dicePool.value,
      terms: [...dicePool.value.terms, { id: crypto.randomUUID(), count: 1, sides: 6, tag: '', comment: '' }],
    };
  }

  function removeTerm(index: number) {
    if (dicePool.value.terms.length <= 1) return;
    dicePool.value = {
      ...dicePool.value,
      terms: dicePool.value.terms.filter((_, i) => i !== index),
    };
  }

  function createSweep(field: 'count' | 'sides', termId: string, label: string, values: number[]) {
    const newParam: Parameter = {
      id: crypto.randomUUID(),
      label,
      values,
      target: field === 'count' ? 'pool.count' : 'pool.sides',
      targetTermId: termId,
    };
    parameters.value = [...parameters.value, newParam];
    setPopover(null);
  }

  return (
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          Notation
        </span>
        <code class="font-mono tabular text-[13px] text-ink px-2 py-1 border border-rule bg-paper-deep/40">
          {dicePoolNotation.value}
        </code>
      </div>

      <div class="space-y-2">
        {pool.terms.map((term, i) => {
          const countParam = sweeps.get(`pool.count:${term.id}`);
          const sidesParam = sweeps.get(`pool.sides:${term.id}`);
          const tagColor = term.tag ? getTagColor(term.tag) : null;
          return (
            <div
              key={term.id}
              id={`dice-term-row-${term.id}`}
              class="group relative border border-rule bg-paper-deep/30 px-3 py-2.5 flex flex-wrap items-center gap-2"
              style={tagColor ? { borderLeftWidth: '3px', borderLeftColor: tagColor } : undefined}
            >
              <TextField
                ariaLabel="Dice count"
                type="number"
                min={1}
                max={99}
                value={term.count}
                onInput={(v) => updateTerm(i, { count: Math.max(1, Number(v) || 1) })}
                className="w-16"
                mono
              />
              {!countParam && paramsCount < 3 && (
                <Button variant="quiet" size="sm" onClick={() => setPopover({ field: 'count', termId: term.id })} ariaLabel="Add sweep to dice count">
                  ↻ Sweep
                </Button>
              )}
              {countParam && (
                <SweepIndicator
                  parameterId={countParam.id}
                  label={countParam.label}
                  values={countParam.values}
                />
              )}

              <span class="font-mono text-[12px] text-ink-mute">d</span>

              <Select
                ariaLabel="Dice sides"
                value={DIE_SIDES.includes(term.sides) ? String(term.sides) : 'custom'}
                onChange={(v) => {
                  if (v !== 'custom') updateTerm(i, { sides: Number(v) });
                }}
                className="w-20"
                mono
                options={[
                  ...DIE_SIDES.map((s) => ({ value: String(s), label: String(s) })),
                  { value: 'custom', label: '…' },
                ]}
              />
              {!DIE_SIDES.includes(term.sides) && (
                <TextField
                  ariaLabel="Custom dice sides"
                  type="number"
                  min={1}
                  max={999}
                  value={term.sides}
                  onInput={(v) => updateTerm(i, { sides: Math.max(1, Number(v) || 1) })}
                  className="w-16"
                  mono
                />
              )}
              {!sidesParam && paramsCount < 3 && (
                <Button variant="quiet" size="sm" onClick={() => setPopover({ field: 'sides', termId: term.id })} ariaLabel="Add sweep to dice sides">
                  ↻ Sweep
                </Button>
              )}
              {sidesParam && (
                <SweepIndicator
                  parameterId={sidesParam.id}
                  label={sidesParam.label}
                  values={sidesParam.values}
                />
              )}

              <TextField
                ariaLabel="Tag for grouping"
                type="text"
                value={term.tag}
                placeholder="tag"
                maxLength={30}
                onInput={(v) => updateTerm(i, { tag: v })}
                className="w-24"
              />

              {pool.terms.length > 1 && (
                <div class="ml-auto">
                  <IconButton onClick={() => removeTerm(i)} ariaLabel="Remove this die" variant="danger">
                    <svg viewBox="0 0 12 12" class="w-3 h-3" aria-hidden="true">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" />
                    </svg>
                  </IconButton>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div class="mt-3">
        <Button variant="ghost" size="sm" onClick={addTerm}>
          + Add die
        </Button>
      </div>

      {popover && (
        <SweepPopover
          open={true}
          defaultLabel={popover.field === 'count' ? 'Count' : 'Sides'}
          defaultValues={popover.field === 'count' ? '1, 2, 3, 4, 5' : '4, 6, 8, 10, 12, 20'}
          maxSimulationsReached={paramsCount >= 3}
          onCreate={(label, values) => createSweep(popover.field, popover.termId, label, values)}
          onCancel={() => setPopover(null)}
        />
      )}
    </div>
  );
}
