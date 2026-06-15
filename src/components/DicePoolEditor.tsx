import { useState, useRef } from 'preact/hooks';
import { dicePool, dicePoolNotation, getTagColor, activeSweepsByTarget, parameters, highlightTargetId, highlightTargetKind } from '@/state/app-state';
import type { DiceTerm, Parameter } from '@/types';
import { SweepIndicator } from '@/components/SweepIndicator';
import { SweepPopover } from '@/components/SweepPopover';

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updateTerm(index: number, partial: Partial<DiceTerm>) {
    const terms = dicePool.value.terms.map((t, i) => (i === index ? { ...t, ...partial } : { ...t }));
    dicePool.value = { ...dicePool.value, terms };
  }

  function addTerm() {
    dicePool.value = {
      ...dicePool.value,
      terms: [...dicePool.value.terms, { id: crypto.randomUUID(), count: 1, sides: 6, tag: '' }],
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

  function jumpToTerm(termId: string) {
    highlightTargetId.value = termId;
    highlightTargetKind.value = 'term';
    const el = document.getElementById(`dice-term-row-${termId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('outline', 'outline-2', 'outline-offset-2', 'outline-blue-500', 'animate-pulse');
    setTimeout(() => {
      el?.classList.remove('outline', 'outline-2', 'outline-offset-2', 'outline-blue-500', 'animate-pulse');
      highlightTargetId.value = null;
      highlightTargetKind.value = null;
    }, 500);
  }

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Dice Pool</h2>

      <div class="mb-2 px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-600">
        {dicePoolNotation.value}
      </div>

      {pool.terms.map((term, i) => {
        const countParam = sweeps.get(`pool.count:${term.id}`);
        const sidesParam = sweeps.get(`pool.sides:${term.id}`);

        return (
          <div key={term.id} id={`dice-term-row-${term.id}`} class="flex items-center gap-2 mb-3 flex-wrap">
            <input
              type="number"
              min={1}
              max={99}
              value={term.count}
              class="w-16 px-2 py-1 border rounded text-center"
              onInput={(e) => updateTerm(i, { count: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })}
            />
            {!countParam && paramsCount < 3 && (
              <button
                ref={i === 0 ? buttonRef : undefined}
                type="button"
                class="text-xs text-indigo-600 hover:text-indigo-800 px-1"
                onClick={() => setPopover({ field: 'count', termId: term.id })}
                aria-label="Add sweep to dice count"
              >
                + Sweep
              </button>
            )}
            {countParam && (
              <SweepIndicator
                parameterId={countParam.id}
                label={countParam.label}
                values={countParam.values}
                onJump={() => jumpToTerm(term.id)}
              />
            )}

            <span class="text-gray-600">d</span>
            <select
              value={DIE_SIDES.includes(term.sides) ? term.sides : 'custom'}
              class="px-2 py-1 border rounded"
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                if (val !== 'custom') {
                  updateTerm(i, { sides: Number(val) });
                }
              }}
            >
              {DIE_SIDES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="custom">custom</option>
            </select>
            {!DIE_SIDES.includes(term.sides) && (
              <input
                type="number"
                min={1}
                max={999}
                value={term.sides}
                class="w-16 px-2 py-1 border rounded text-center"
                onInput={(e) => updateTerm(i, { sides: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })}
              />
            )}
            {!sidesParam && paramsCount < 3 && (
              <button
                type="button"
                class="text-xs text-indigo-600 hover:text-indigo-800 px-1"
                onClick={() => setPopover({ field: 'sides', termId: term.id })}
                aria-label="Add sweep to dice sides"
              >
                + Sweep
              </button>
            )}
            {sidesParam && (
              <SweepIndicator
                parameterId={sidesParam.id}
                label={sidesParam.label}
                values={sidesParam.values}
                onJump={() => jumpToTerm(term.id)}
              />
            )}

            <input
              type="text"
              value={term.tag}
              placeholder="tag"
              maxLength={30}
              class="w-20 px-2 py-1 border rounded text-sm"
              style={term.tag ? { borderColor: getTagColor(term.tag) } : {}}
              onInput={(e) => updateTerm(i, { tag: (e.target as HTMLInputElement).value })}
            />
            {pool.terms.length > 1 && (
              <button
                class="text-red-400 hover:text-red-600 text-lg px-1"
                onClick={() => removeTerm(i)}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      <button
        class="text-sm text-indigo-600 hover:text-indigo-800 mb-4"
        onClick={addTerm}
      >
        + Add die
      </button>

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
