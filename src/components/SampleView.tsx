import type { SampleTrace, DiceTerm } from '@/types';
import { Button } from '@/components/ui';

interface SampleViewProps {
  trace: SampleTrace;
  diceTerms: DiceTerm[];
  onFaceChange: (termIndex: number, dieIndex: number, newFace: number) => void;
  onSweepChange: (x?: number, y?: number) => void;
  onRollAgain: () => void;
  sampleX: number | null;
  sampleY: number | null;
}

function vectorDisplay(value: { face: number; tag: string }[]): string {
  return value.map((d) => d.tag ? `${d.face} (${d.tag})` : String(d.face)).join(', ');
}

export function SampleView({ trace, diceTerms, onFaceChange, onSweepChange, onRollAgain, sampleX, sampleY }: SampleViewProps) {
  const hasSweep = trace.sweepX !== null || trace.sweepY !== null;

  return (
    <div class="border border-rule bg-paper divide-y divide-rule">
      <div class="px-4 py-3 flex items-center justify-between">
        <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep">Sample</p>
        <Button variant="ghost" size="sm" onClick={onRollAgain} ariaLabel="Roll new random sample">
          Roll Again
        </Button>
      </div>

      <div class="px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-2">Dice Pool</p>
        {diceTerms.map((term, ti) => {
          const diceForTerm = trace.diceDetails.filter((d) => d.termIndex === ti);
          if (diceForTerm.length === 0) return null;
          const sides = typeof term.sides === 'object' && 'value' in term.sides
            ? (term.sides as { kind: 'literal'; value: number }).value
            : 20;
          return (
            <div key={term.id} class="mb-3 last:mb-0 border-l-2 border-gold pl-3">
              <p class="font-mono text-[12px] text-ink mb-1.5">
                d{sides}{term.tag ? ` <${term.tag}>` : ''}
              </p>
              {diceForTerm.map((die, di) => (
                <div key={di} class="mb-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[11px] text-ink-soft w-4 shrink-0">#{di + 1}</span>
                    <input
                      type="number"
                      min={1}
                      max={sides}
                      value={die.originalFace}
                      class="w-16 px-2 py-1 text-[13px] font-mono tabular text-ink bg-paper border border-rule focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-billiard)] outline-none"
                      aria-label={`Die ${di + 1} face value`}
                      onBlur={(e) => {
                        const v = parseInt((e.target as HTMLInputElement).value, 10);
                        if (!isNaN(v) && v !== die.originalFace) {
                          onFaceChange(ti, di, Math.max(1, Math.min(sides, v)));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          target.blur();
                        }
                      }}
                    />
                    {die.tag && (
                      <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">{die.tag}</span>
                    )}
                  </div>
                  {die.rerollEvents.length > 0 ? (
                    <div class="ml-6 mt-0.5 space-y-0.5">
                      {die.rerollEvents.map((ev, ei) => (
                        <p key={ei} class="font-mono text-[11px] text-ink-soft">
                          ↳ {ev.action} (cond #{ev.conditionIndex}): {ev.oldFace} → {ev.newFace}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p class="ml-6 mt-0.5 font-mono text-[11px] text-ink-mute">↳ no rerolls</p>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {hasSweep && (
        <div class="px-4 py-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-2">Sweep</p>
          <div class="flex gap-3">
            {sampleX !== null && (
              <div class="flex items-center gap-2">
                <label class="font-mono text-[11px] text-ink-soft">X:</label>
                <input
                  type="number"
                  value={sampleX}
                  class="w-16 px-2 py-1 text-[13px] font-mono tabular text-ink bg-paper border border-rule focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-billiard)] outline-none"
                  aria-label="Sweep X value"
                  onBlur={(e) => {
                    const v = parseInt((e.target as HTMLInputElement).value, 10);
                    if (!isNaN(v)) onSweepChange(v, sampleY ?? undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            )}
            {sampleY !== null && (
              <div class="flex items-center gap-2">
                <label class="font-mono text-[11px] text-ink-soft">Y:</label>
                <input
                  type="number"
                  value={sampleY}
                  class="w-16 px-2 py-1 text-[13px] font-mono tabular text-ink bg-paper border border-rule focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-billiard)] outline-none"
                  aria-label="Sweep Y value"
                  onBlur={(e) => {
                    const v = parseInt((e.target as HTMLInputElement).value, 10);
                    if (!isNaN(v)) onSweepChange(sampleX ?? undefined, v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div class="px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-2">Resolution Pipeline</p>
        <div class="space-y-1">
          {trace.pipeline.map((pv, i) => (
            <div key={i} class="flex items-start gap-2 py-0.5">
              <span class={`font-mono text-[12px] ${pv.type === 'vector' ? 'text-ink-mute' : 'text-ink'} shrink-0`}>
                {pv.name === 'rolled' ? '[ rolled ]' : pv.type === 'vector' ? `[ ${pv.name} ]` : pv.name}
              </span>
              <span class="font-mono text-[10px] text-ink-soft mx-1">=</span>
              <span class="font-mono tabular text-[13px] text-ink">
                {pv.type === 'vector'
                  ? `[ ${vectorDisplay(pv.value as { face: number; tag: string }[])} ]`
                  : String(pv.value as number)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div class="px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-2">Outcomes</p>
        <div class="space-y-1">
          {trace.outcomes.map((om, i) => (
            <div
              key={i}
              class={`flex items-center gap-2 py-1 px-2 border-l-2 ${om.matched ? 'border-billiard bg-billiard-soft/20' : 'border-rule'}`}
            >
              <span class={`font-mono text-[12px] uppercase tracking-[0.06em] ${om.matched ? 'text-billiard' : 'text-ink-mute'}`}>
                {om.name === 'Not matched' ? 'Not Matched' : om.name}
              </span>
              {om.matched ? (
                <span class="font-mono text-[10px] text-billiard">✓ matched</span>
              ) : (
                <span class="font-mono text-[10px] text-ink-mute">✗ not matched</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
