import { useState, useRef, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { Button } from '@/components/ui';

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
    <div class="fixed inset-0 z-50 bg-paper-deep/40 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Add sweep"
        class="bg-paper border border-ink shadow-[6px_6px_0_0_var(--color-gold)] w-full max-w-sm"
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <header class="px-4 py-3 border-b border-rule flex items-center justify-between">
          <p class="font-display text-[14px] text-ink">Add Sweep</p>
          <button
            type="button"
            onClick={onCancel}
            class="text-ink-mute hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" class="w-3.5 h-3.5" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
          </button>
        </header>
        <form onSubmit={handleSubmit} class="px-4 py-3 space-y-3">
          <div>
            <label for="sweep-popover-label" class="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mb-1">
              Label
            </label>
            <input
              id="sweep-popover-label"
              type="text"
              value={label}
              class="w-full px-2.5 py-1.5 border border-rule bg-paper text-[13px] font-mono outline-none focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-billiard)] transition-all min-h-[36px]"
              onInput={(e) => setLabel((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label for="sweep-popover-values" class="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mb-1">
              Values
            </label>
            <input
              id="sweep-popover-values"
              ref={firstInputRef}
              type="text"
              value={valuesRaw}
              placeholder="1, 2, 3 or 1..5"
              class="w-full px-2.5 py-1.5 border border-rule bg-paper text-[13px] font-mono tabular outline-none focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-gold)] transition-all min-h-[36px]"
              onInput={(e) => setValuesRaw((e.target as HTMLInputElement).value)}
            />
            <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mt-1.5">
              {simCount > 0
                ? `→ ${simCount} simulation${simCount === 1 ? '' : 's'} · ${rolls.toLocaleString()} rolls`
                : 'Enter at least one value'}
            </p>
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="md" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={simCount === 0 || maxSimulationsReached}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
