import { useState } from 'preact/hooks';
import { dicePool, dicePoolNotation, getTagColor, sweep, showPoolComments } from '@/state/app-state';
import { ExprInput } from '@/components/ExprInput';
import { Button, IconButton, Select, TextField } from '@/components/ui';
import type { DiceTerm, Expr } from '@/types';
import { literalExpr } from '@/utils/expression';

const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];

export function DicePoolEditor() {
  const pool = dicePool.value;
  const sw = sweep.value;
  const availableVars = { x: sw.x.length > 0, y: sw.y !== null && sw.y.length > 0 };
  const [customSides, setCustomSides] = useState<Set<number>>(new Set());

  function updateTerm(index: number, partial: Partial<DiceTerm>) {
    const terms = dicePool.value.terms.map((t, i) => (i === index ? { ...t, ...partial } : { ...t }));
    dicePool.value = { ...dicePool.value, terms };
  }

  function addTerm() {
    dicePool.value = {
      ...dicePool.value,
      terms: [...dicePool.value.terms, { id: crypto.randomUUID(), count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' }],
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
          const tagColor = term.tag ? getTagColor(term.tag) : null;
          const countValue = term.count;
          const sidesValue = term.sides;
          const sidesIsLiteral = sidesValue.kind === 'literal';
          const sidesNum = sidesIsLiteral ? sidesValue.value : null;
          const isStandardDie = sidesIsLiteral && sidesNum !== null && DIE_SIDES.includes(sidesNum);
          const isCustom = customSides.has(i);
          return (
            <div
              key={term.id}
              id={`dice-term-row-${term.id}`}
              class="group relative border border-rule bg-paper-deep/30 px-3 py-2.5 flex flex-wrap items-center gap-2"
              style={tagColor ? { borderLeftWidth: '3px', borderLeftColor: tagColor } : undefined}
            >
              <ExprInput
                value={countValue}
                onChange={(expr: Expr) => updateTerm(i, { count: expr })}
                ariaLabel="Dice count"
                availableVars={availableVars}
                className="w-28"
              />

              <span class="font-mono text-[12px] text-ink-mute">d</span>

              <Select
                ariaLabel="Dice sides"
                value={isStandardDie && !isCustom ? String(sidesNum!) : 'custom'}
                onChange={(v) => {
                  if (v === 'custom') {
                    const next = new Set(customSides);
                    next.add(i);
                    setCustomSides(next);
                  } else {
                    const next = new Set(customSides);
                    next.delete(i);
                    setCustomSides(next);
                    updateTerm(i, { sides: literalExpr(Number(v)) });
                  }
                }}
                className="w-20"
                options={[
                  ...DIE_SIDES.map((s) => ({ value: String(s), label: String(s) })),
                  { value: 'custom', label: 'custom' },
                ]}
              />

              {(!isStandardDie || isCustom) && (
                <ExprInput
                  value={sidesValue}
                  onChange={(expr: Expr) => updateTerm(i, { sides: expr })}
                  ariaLabel="Dice sides"
                  availableVars={availableVars}
                  className="w-28"
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

              {showPoolComments.value && (
                <TextField
                  ariaLabel="Comment"
                  value={term.comment}
                  placeholder="Comment (optional)"
                  onInput={(v) => updateTerm(i, { comment: v })}
                  className="flex-1 min-w-[160px]"
                />
              )}

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
    </div>
  );
}
