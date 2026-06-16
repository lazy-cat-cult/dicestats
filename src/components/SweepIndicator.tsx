import { formatSweepRange } from '@/utils/format';
import { hashIdToColor } from '@/state/app-state';
import { Pill } from '@/components/ui';

interface SweepIndicatorProps {
  parameterId: string;
  label: string;
  values: number[];
  onJump?: () => void;
}

export function SweepIndicator({ parameterId, label, values, onJump }: SweepIndicatorProps) {
  const text = `↻ ${label} ${formatSweepRange(values)}`;
  const color = hashIdToColor(parameterId);
  const ariaLabel = `Swept by ${label} over ${formatSweepRange(values)}.`;
  if (onJump) {
    return (
      <button
        type="button"
        class="inline-flex items-center focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={onJump}
      >
        <Pill>
          <span style={{ color }}>{text}</span>
        </Pill>
      </button>
    );
  }
  return (
    <span role="status" aria-label={ariaLabel} title={ariaLabel}>
      <Pill>
        <span style={{ color }}>{text}</span>
      </Pill>
    </span>
  );
}
