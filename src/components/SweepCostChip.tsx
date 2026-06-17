import { totalIterations, sweep, confirmedHighCost } from '@/state/app-state';
import { Button, Pill } from '@/components/ui';

interface SweepCostChipProps {
  onConfirmHighCost: () => void;
}

export function SweepCostChip({ onConfirmHighCost }: SweepCostChipProps) {
  const total = totalIterations.value;
  const sw = sweep.value;
  const xCount = sw.x.length;
  const yList = sw.y;
  const yCount = yList ? yList.length : 0;
  const yActive = yCount > 0;
  const xActive = xCount > 0;
  const sweepActive = xActive || yActive;
  const isOver50M = total > 50_000_000;
  const isConfirmed = confirmedHighCost.value;

  if (!sweepActive) {
    return (
      <div class="border border-dashed border-rule px-3 py-2.5 text-center">
        <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
          Single simulation · 1,000,000 rolls
        </p>
      </div>
    );
  }

  const sims = Math.round(total / 1_000_000);
  const label = yActive
    ? `${yCount} × ${xCount} simulation${sims === 1 ? '' : 's'} · ${total.toLocaleString()} rolls`
    : `${xCount} simulation${xCount === 1 ? '' : 's'} · ${total.toLocaleString()} rolls`;
  const variant = isOver50M ? 'accent' : 'default';

  return (
    <div class={`border px-3 py-2.5 flex items-center gap-3 ${isOver50M && !isConfirmed ? 'border-billiard' : 'border-rule'} bg-paper-deep/40`}>
      <Pill variant={variant}>
        {isOver50M ? '⚠ ' : ''}{label}
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
