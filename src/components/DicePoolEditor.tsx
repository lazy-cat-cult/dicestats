import { dicePool, dicePoolNotation, getTagColor } from '@/state/app-state';
import type { DicePool, DiceTerm } from '@/types';

const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];

export function DicePoolEditor() {
  const pool = dicePool.value;

  function updatePool(partial: Partial<DicePool>) {
    dicePool.value = { ...dicePool.value, ...partial };
  }

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

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Dice Pool</h2>

      <div class="mb-2 px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-600">
        {dicePoolNotation.value}
      </div>

      {pool.terms.map((term, i) => (
        <div key={term.id} class="flex items-center gap-2 mb-3 flex-wrap">
          <input
            type="number"
            min={1}
            max={99}
            value={term.count}
            class="w-16 px-2 py-1 border rounded text-center"
            onInput={(e) => updateTerm(i, { count: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })}
          />
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
      ))}

      <button
        class="text-sm text-indigo-600 hover:text-indigo-800 mb-4"
        onClick={addTerm}
      >
        + Add die
      </button>
    </div>
  );
}