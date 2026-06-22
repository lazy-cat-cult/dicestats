import { useRef, useEffect } from 'preact/hooks';

interface MyPresetsContextMenuProps {
  open: boolean;
  onClose: () => void;
  onRename: () => void;
  onCopy: () => void;
  onDelete: () => void;
  triggerRect?: DOMRect;
}

export function MyPresetsContextMenu({ open, onClose, onRename, onCopy, onDelete, triggerRect }: MyPresetsContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const style: Record<string, string> = {};
  if (triggerRect) {
    style.left = `${Math.min(triggerRect.left, window.innerWidth - 140)}px`;
    style.top = `${triggerRect.bottom + 4}px`;
  }

  return (
    <div
      ref={menuRef}
      class="fixed z-50 bg-paper border border-rule shadow-[4px_4px_0_0_var(--color-gold)] min-w-[140px] py-1"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => { onRename(); onClose(); }}
        class="w-full text-left px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink hover:bg-paper-deep/40 transition-colors"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => { onCopy(); onClose(); }}
        class="w-full text-left px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink hover:bg-paper-deep/40 transition-colors"
      >
        Copy
      </button>
      <button
        type="button"
        onClick={() => { onDelete(); onClose(); }}
        class="w-full text-left px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-billiard-deep hover:bg-paper-deep/40 transition-colors"
      >
        Delete
      </button>
    </div>
  );
}
