import { formatSweepRange } from '@/utils/format';
import { hashIdToColor } from '@/state/app-state';

interface SweepIndicatorProps {
  parameterId: string;
  label: string;
  values: number[];
  onJump?: () => void;
}

export function SweepIndicator({ parameterId, label, values, onJump }: SweepIndicatorProps) {
  const text = `\u21BB ${label} ${formatSweepRange(values)}`;
  const color = hashIdToColor(parameterId);
  const ariaLabel = `Swept by ${label} over ${formatSweepRange(values)}.`;
  if (onJump) {
    return (
      <button
        type="button"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs italic underline decoration-dotted min-h-[44px] sm:min-h-0"
        style={{ color }}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={onJump}
      >
        <span class="sm:hidden">{`\u21BB`}</span>
        <span class="hidden sm:inline">{text}</span>
      </button>
    );
  }
  return (
    <span
      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs italic underline decoration-dotted"
      style={{ color }}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span class="sm:hidden">{`\u21BB`}</span>
      <span class="hidden sm:inline">{text}</span>
    </span>
  );
}
