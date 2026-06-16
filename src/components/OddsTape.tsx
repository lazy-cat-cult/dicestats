import { Stat } from '@/components/ui';
import { formatPercent } from '@/utils/format';
import type { SimResult } from '@/types';
import { currentPresetName } from '@/state/app-state';

interface OddsTapeProps {
  result: SimResult;
  progress?: { completed: number; total: number } | null;
}

export function OddsTape({ result, progress }: OddsTapeProps) {
  const sorted = [...result.outcomes].sort((a, b) => b.probability - a.probability);
  const head = sorted[0];
  const maxProb = head?.probability ?? 0;
  const total = result.outcomes.length;
  const presetName = currentPresetName.value;

  return (
    <div class="relative bg-paper border border-rule shadow-[0_2px_0_0_var(--color-gold)]">
      <div class="absolute inset-x-0 top-0 h-px bg-billiard" aria-hidden="true" />

      <div class="flex items-end justify-between gap-4 px-5 pt-5 pb-3">
        <div class="min-w-0">
          {presetName && (
            <p class="font-display text-[13px] tracking-[0.14em] text-ink mb-2 truncate" title={presetName}>
              {presetName}
            </p>
          )}
          <div class="flex items-center gap-2 mb-2">
            <span class="h-px w-6 bg-gold" aria-hidden="true" />
            <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep">
              Top Probability
            </p>
          </div>
          <div class="flex items-baseline gap-3">
            <span class="font-display text-[4.5rem] sm:text-[5.5rem] leading-[0.85] text-billiard tabular">
              {head ? formatPercent(head.probability) : '—'}
            </span>
          </div>
          {head && (
            <p class="font-mono text-[12px] uppercase tracking-[0.14em] text-ink mt-2 truncate">
              {head.label}
            </p>
          )}
        </div>
        <div class="flex items-end gap-5 shrink-0 pb-1">
          <Stat label="Outcomes" value={total} />
          <Stat label="Rolls" value={(result.totalRolls ?? 0).toLocaleString()} />
          {progress && progress.total > 0 && (
            <Stat
              label="Progress"
              value={`${Math.round((progress.completed / progress.total) * 100)}%`}
            />
          )}
        </div>
      </div>

      <div class="px-5 pb-5">
        {sorted.map((o, i) => {
          const widthPct = maxProb > 0 ? (o.probability / maxProb) * 100 : 0;
          const isHead = i === 0;
          return (
            <div
              key={o.label}
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 border-t border-rule/60 first:border-t-0 roll-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class={`shrink-0 font-mono text-[10px] tabular w-9 text-right tracking-wider ${
                    isHead ? 'text-gold-deep font-semibold' : 'text-ink-mute'
                  }`}
                >
                  N°{String(i + 1).padStart(2, '0')}
                </span>
                <span
                  class="truncate font-mono text-[12px] uppercase tracking-[0.1em] text-ink"
                  title={o.label}
                >
                  {o.label}
                </span>
                <div class="relative flex-1 h-2.5 bg-paper-soft border border-rule/60">
                  <div
                    class={`absolute inset-y-0 left-0 ${isHead ? 'bg-billiard' : 'bg-ink/35'}`}
                    style={{
                      width: `${widthPct}%`,
                      transformOrigin: 'left center',
                      animation: 'tape-fill 520ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
                    }}
                  />
                </div>
              </div>
              <div class="flex items-baseline gap-3 shrink-0">
                <span class={`font-mono tabular text-[15px] ${isHead ? 'text-billiard' : 'text-ink'}`}>
                  {formatPercent(o.probability)}
                </span>
                <span class="font-mono tabular text-[10px] text-ink-mute w-24 text-right">
                  {o.count.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute py-3">
            No outcomes recorded.
          </p>
        )}
      </div>
    </div>
  );
}
