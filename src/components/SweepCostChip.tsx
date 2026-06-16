import { totalIterations, confirmedHighCost } from '@/state/app-state';
import { Button, Pill } from '@/components/ui';

interface SweepCostChipProps {
  onConfirmHighCost: () => void;
}

export function SweepCostChip({ onConfirmHighCost }: SweepCostChipProps) {
  const total = totalIterations.value;
  const sims = Math.round(total / 1_000_000);
  const isOver50M = total > 50_000_000;
  const isConfirmed = confirmedHighCost.value;

  if (sims === 0) {
    return (
      <div class="border border-dashed border-rule px-3 py-2.5 text-center">
        <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
          Single simulation · 1,000,000 rolls
        </p>
      </div>
    );
  }

  const variant = isOver50M ? 'accent' : 'default';

  return (
    <div class={`border px-3 py-2.5 flex items-center gap-3 ${isOver50M && !isConfirmed ? 'border-billiard' : 'border-rule'} bg-paper-deep/40`}>
      <Pill variant={variant}>
        {isOver50M ? '⚠ ' : ''}{sims} simulation{sims === 1 ? '' : 's'} · {total.toLocaleString()} rolls
      </Pill>
      <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
        Total computational cost
      </span>
      {isOver50M && !isConfirmed && (
        <Button variant="primary" size="sm" onClick={onConfirmHighCost} className="ml-auto">
          Confirm run
        </Button>
      )}
    </div>
  );
}
