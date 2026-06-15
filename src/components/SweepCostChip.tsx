import { totalIterations, confirmedHighCost } from '@/state/app-state';

interface SweepCostChipProps {
  onConfirmHighCost: () => void;
}

export function SweepCostChip({ onConfirmHighCost }: SweepCostChipProps) {
  const total = totalIterations.value;
  const sims = Math.round(total / 1_000_000);
  const isOver10M = total > 10_000_000;
  const isOver50M = total > 50_000_000;
  const isConfirmed = confirmedHighCost.value;

  if (sims === 0) {
    return (
      <div class="text-sm text-gray-500 px-3 py-2 border rounded text-center">
        No sweeps. Run a single simulation.
      </div>
    );
  }

  const colorClass = isOver50M ? 'text-red-600' : isOver10M ? 'text-yellow-600' : 'text-gray-700';
  const ring = isOver50M && !isConfirmed ? 'ring-2 ring-red-600' : '';

  return (
    <div class={`flex items-center justify-center gap-2 px-3 py-2 border rounded bg-gray-50 ${ring}`}>
      <span class={`text-sm font-mono ${colorClass}`}>
        {sims} simulation{sims === 1 ? '' : 's'} · {total.toLocaleString()} rolls
      </span>
      {isOver50M && !isConfirmed && (
        <button
          type="button"
          class="text-xs px-2 py-1 bg-red-600 text-white rounded min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          onClick={onConfirmHighCost}
        >
          Confirm run
        </button>
      )}
    </div>
  );
}
