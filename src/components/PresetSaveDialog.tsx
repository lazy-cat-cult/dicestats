import { useState, useRef, useEffect } from 'preact/hooks';

interface PresetSaveDialogProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  defaultName?: string;
  conflictMessage?: string;
  conflictActions?: { label: string; action: () => void }[];
}

export function PresetSaveDialog({ onSave, onCancel, defaultName = '', conflictMessage, conflictActions }: PresetSaveDialogProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault();
      onSave(name.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  if (conflictMessage) {
    return (
      <div class="flex items-center gap-2 py-1">
        <span class="font-mono text-[11px] text-ink-soft shrink-0">{conflictMessage}</span>
        <div class="flex items-center gap-1 shrink-0">
          {conflictActions?.map((a) => (
            <button
              type="button"
              onClick={a.action}
              class="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] border border-rule text-ink hover:border-billiard hover:text-billiard transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div class="flex items-stretch border border-rule bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)] transition-all">
      <input
        ref={inputRef}
        type="text"
        value={name}
        placeholder="My Preset"
        aria-label="Preset name for saving"
        class="w-full bg-transparent px-2 py-1 text-[12px] font-mono tabular text-ink outline-none placeholder:text-ink-mute min-w-0"
        onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        onClick={() => name.trim() && onSave(name.trim())}
        disabled={!name.trim()}
        aria-label="Save preset"
        class="px-2 font-mono text-[13px] text-billiard hover:text-billiard-deep border-l border-rule shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Save (Enter)"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel save"
        class="px-2 font-mono text-[13px] text-ink-mute hover:text-billiard-deep border-l border-rule shrink-0"
        title="Cancel (Esc)"
      >
        ✕
      </button>
    </div>
  );
}
