import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { userPresets } from '@/state/app-state';
import { PRESETS } from '@/domain/presets';
import type { PresetConfig } from '@/types';

interface PresetLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (presetId: string) => void;
}

function poolNotation(preset: PresetConfig): string {
  return preset.pool.terms
    .map((t) => {
      let s = `${t.count}d${t.sides}`;
      if (t.tag) s += ` <${t.tag}>`;
      return s;
    })
    .join(', ');
}

export function PresetLibraryModal({ open, onClose, onApply }: PresetLibraryModalProps) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const userFirst = useMemo(() => [...userPresets.value, ...PRESETS], [userPresets.value]);

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return userFirst;
    return userFirst.filter((p) => p.name.toLowerCase().includes(trimmed));
  }, [trimmed, userFirst]);

  useEffect(() => {
    if (open) {
      setQuery('');
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      previouslyFocused.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
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
  }, [open, onClose]);

  if (!open) return null;

  function isUser(id: string): boolean {
    return !PRESETS.some((p) => p.id === id);
  }

  function handleApply(id: string) {
    onApply(id);
    onClose();
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
    <div class="fixed inset-0 z-50 bg-paper-deep/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="All Presets"
        class="bg-paper border border-ink shadow-[6px_6px_0_0_var(--color-gold)] w-full max-w-md flex flex-col"
        style={{ ...positionStyle, maxHeight: 'min(80vh, 640px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header class="px-4 py-3 border-b border-rule flex items-center justify-between shrink-0">
          <p class="font-display text-[14px] text-ink">All Presets</p>
          <button
            type="button"
            onClick={onClose}
            class="text-ink-mute hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" class="w-3.5 h-3.5" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
          </button>
        </header>
        <div class="px-4 py-3 border-b border-rule shrink-0">
          <label for="preset-library-search" class="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mb-1">
            Search presets
          </label>
          <input
            id="preset-library-search"
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Filter by name"
            aria-label="Search presets"
            class="w-full px-2.5 py-1.5 border border-rule bg-paper text-[13px] font-mono tabular outline-none focus:border-billiard focus:shadow-[0_0_0_1px_var(--color-billiard)] transition-all min-h-[36px]"
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p class="px-4 py-6 font-mono text-[12px] text-ink-mute text-center">No presets match</p>
          ) : (
            <ul class="divide-y divide-rule-soft">
              {filtered.map((preset) => {
                const user = isUser(preset.id);
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      onClick={() => handleApply(preset.id)}
                      class="w-full text-left px-4 py-2.5 hover:bg-paper-deep/40 focus:bg-paper-deep/40 focus:outline-none transition-colors"
                    >
                      <span class="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.06em] text-ink">
                        {preset.name}
                        {user && <span aria-hidden="true" class="text-billiard">·</span>}
                      </span>
                      <span class="block mt-0.5 font-mono tabular text-[11px] text-ink-mute">
                        {poolNotation(preset)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
