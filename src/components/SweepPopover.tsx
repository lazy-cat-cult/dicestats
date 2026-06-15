import { useState, useRef, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';

export interface SweepPopoverProps {
  open: boolean;
  defaultLabel: string;
  defaultValues: string;
  maxSimulationsReached: boolean;
  onCreate: (label: string, values: number[]) => void;
  onCancel: () => void;
}

function parseValuesLocal(raw: string): number[] {
  const results: number[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const rangeMatch = trimmed.match(/^(-?\d+)\.\.(-?\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start <= end) {
        for (let i = start; i <= end; i++) results.push(i);
      } else {
        for (let i = end; i <= start; i++) results.push(i);
      }
    } else {
      const num = Number(trimmed);
      if (!isNaN(num)) results.push(num);
    }
  }
  return results;
}

export function SweepPopover({ open, defaultLabel, defaultValues, maxSimulationsReached, onCreate, onCancel }: SweepPopoverProps) {
  const [label, setLabel] = useState(defaultLabel);
  const [valuesRaw, setValuesRaw] = useState(defaultValues);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setLabel(defaultLabel);
      setValuesRaw(defaultValues);
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => firstInputRef.current?.focus());
    } else {
      previouslyFocused.current?.focus();
    }
  }, [open, defaultLabel, defaultValues]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const parsed = parseValuesLocal(valuesRaw);
  const simCount = parsed.length;
  const rolls = simCount * 1_000_000;

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (parsed.length === 0) return;
    onCreate(label.trim() || 'Sweep', parsed);
  }

  const positionStyle: Record<string, string> = { position: 'fixed' };
  if (typeof window !== 'undefined' && window.innerWidth < 480) {
    positionStyle.left = '0';
    positionStyle.right = '0';
    positionStyle.bottom = '0';
    positionStyle.top = 'auto';
  } else {
    positionStyle.top = '50%';
    positionStyle.left = '50%';
    positionStyle.transform = 'translate(-50%, -50%)';
  }

  return createPortal(
    <div class="fixed inset-0 z-50 bg-black/30" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Add sweep"
        class="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm"
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} class="space-y-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1" for="sweep-popover-label">Label</label>
            <input
              id="sweep-popover-label"
              ref={firstInputRef}
              type="text"
              value={label}
              class="w-full px-2 py-2 border rounded text-sm min-h-[44px]"
              onInput={(e) => setLabel((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1" for="sweep-popover-values">Values (comma-separated, or range like 1..5)</label>
            <input
              id="sweep-popover-values"
              type="text"
              value={valuesRaw}
              class="w-full px-2 py-2 border rounded text-sm min-h-[44px]"
              onInput={(e) => setValuesRaw((e.target as HTMLInputElement).value)}
            />
            <p class="text-xs text-gray-500 mt-1">
              {simCount > 0
                ? `\u2192 ${simCount} simulation${simCount === 1 ? '' : 's'} \u00B7 ${rolls.toLocaleString()} rolls`
                : 'Enter at least one value'}
            </p>
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              class="px-3 py-2 text-sm border rounded min-h-[44px] min-w-[44px]"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-3 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-40 min-h-[44px] min-w-[44px]"
              disabled={simCount === 0 || maxSimulationsReached}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
