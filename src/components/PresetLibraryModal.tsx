import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { myPresets, favoriteIds, toggleFavorite } from '@/state/app-state';
import { PRESETS } from '@/domain/presets';
import { exprToString } from '@/utils/expression';
import type { PresetConfig } from '@/types';
import { MyPresetsContextMenu } from '@/components/MyPresetsContextMenu';
import { copyMyPreset, copyStandardToMyPresets, removeMyPreset, renameMyPreset, loadMyPresets } from '@/state/my-presets';

interface PresetLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (presetId: string) => void;
}

type Tab = 'all' | 'my' | 'favorites';

function poolNotation(preset: PresetConfig): string {
  return preset.pool.terms
    .map((t) => {
      let s = `${exprToString(t.count)}d${exprToString(t.sides)}`;
      if (t.tag) s += ` <${t.tag}>`;
      return s;
    })
    .join(', ');
}

export function PresetLibraryModal({ open, onClose, onApply }: PresetLibraryModalProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [contextMenuPresetId, setContextMenuPresetId] = useState<string | null>(null);
  const [contextMenuRect, setContextMenuRect] = useState<DOMRect | undefined>();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const myList = myPresets.value;
  const allList = useMemo(() => {
    const ordered = [...myList, ...PRESETS];
    return ordered;
  }, [myList]);

  const trimmed = query.trim().toLowerCase();

  const filteredByTab = useMemo(() => {
    let source: PresetConfig[];
    if (tab === 'my') {
      source = myList;
    } else if (tab === 'favorites') {
      source = allList.filter((p) => favoriteIds.value.has(p.id));
    } else {
      source = allList;
    }
    if (!trimmed) return source;
    return source.filter((p) => p.name.toLowerCase().includes(trimmed));
  }, [tab, trimmed, allList, myList]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTab('all');
      setContextMenuPresetId(null);
      setRenamingId(null);
      setDeleteConfirmId(null);
      setCopyFeedback(null);
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
        if (contextMenuPresetId) { setContextMenuPresetId(null); return; }
        if (renamingId) { setRenamingId(null); return; }
        if (deleteConfirmId) { setDeleteConfirmId(null); return; }
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && dialogRef.current && !contextMenuPresetId && !renamingId && !deleteConfirmId) {
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
  }, [open, onClose, contextMenuPresetId, renamingId, deleteConfirmId]);

  if (!open) return null;

  function isUser(id: string): boolean {
    return !PRESETS.some((p) => p.id === id);
  }

  function handleApply(id: string) {
    onApply(id);
    onClose();
  }

  function handleContextMenu(id: string, e: MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuPresetId(id);
    setContextMenuRect(rect);
  }

  function handleRenameStart(id: string) {
    const preset = myList.find((p) => p.id === id);
    if (!preset) return;
    setRenamingId(id);
    setRenameDraft(preset.name);
  }

  function handleRenameCommit() {
    if (!renamingId || !renameDraft.trim()) return;
    renameMyPreset(renamingId, renameDraft.trim());
    myPresets.value = loadMyPresets();
    setRenamingId(null);
  }

  function handleCopy(id: string) {
    const isStd = PRESETS.some((p) => p.id === id);
    const result = isStd ? copyStandardToMyPresets(id) : copyMyPreset(id);
    if (result === 'limit_reached') {
      setCopyFeedback('Limit reached (100). Delete unused presets.');
      setTimeout(() => setCopyFeedback(null), 2000);
    } else {
      myPresets.value = loadMyPresets();
      setCopyFeedback(isStd ? `Copied to My Presets` : `Copied as (copy)`);
      setTimeout(() => setCopyFeedback(null), 1500);
    }
  }

  function handleDeleteConfirm(id: string) {
    removeMyPreset(id);
    myPresets.value = loadMyPresets();
    setDeleteConfirmId(null);
  }

  const myCount = myList.length;
  const favCount = allList.filter((p) => favoriteIds.value.has(p.id)).length;

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
          <p class="font-display text-[14px] text-ink">Preset Library</p>
          <button
            type="button"
            onClick={onClose}
            class="text-ink-mute hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" class="w-3.5 h-3.5" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" fill="none" /></svg>
          </button>
        </header>
        <div class="flex border-b border-rule shrink-0">
          {([
            { id: 'all' as Tab, label: 'All' },
            { id: 'my' as Tab, label: `My Presets (${myCount})` },
            { id: 'favorites' as Tab, label: `Favorites (${favCount})` },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setQuery(''); setContextMenuPresetId(null); }}
              class={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                tab === t.id
                  ? 'text-billiard border-b-2 border-billiard bg-billiard-soft/10'
                  : 'text-ink-mute hover:text-ink border-b-2 border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
        {copyFeedback && (
          <div class="px-4 py-1.5 bg-billiard-soft/20 border-b border-rule">
            <p class="font-mono text-[11px] text-billiard">{copyFeedback}</p>
          </div>
        )}
        <div class="flex-1 overflow-y-auto">
          {filteredByTab.length === 0 ? (
            <p class="px-4 py-6 font-mono text-[12px] text-ink-mute text-center">
              {trimmed ? 'No presets match' : tab === 'my' ? 'No saved presets' : 'No favorited presets'}
            </p>
          ) : (
            <ul class="divide-y divide-rule-soft">
              {filteredByTab.map((preset) => {
                const user = isUser(preset.id);
                const isFav = favoriteIds.value.has(preset.id);
                const isRenaming = renamingId === preset.id;
                const isDeleting = deleteConfirmId === preset.id;

                return (
                  <li key={preset.id}>
                    <div class="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(preset.id)}
                        class="px-2 flex items-center justify-center text-ink-mute hover:text-gold transition-colors shrink-0"
                        aria-label={isFav ? `Unfavorite ${preset.name}` : `Favorite ${preset.name}`}
                        title={isFav ? 'Unfavorite' : 'Favorite'}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>
                      <div class="flex-1 min-w-0">
                        {isDeleting ? (
                          <div class="flex items-center gap-2 px-3 py-2">
                            <span class="font-mono text-[11px] text-ink-soft">Delete {preset.name}?</span>
                            <button type="button" onClick={() => handleDeleteConfirm(preset.id)} class="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] border border-billiard text-billiard hover:bg-billiard/10">Delete</button>
                            <button type="button" onClick={() => setDeleteConfirmId(null)} class="px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] border border-rule text-ink-mute hover:text-ink">Cancel</button>
                          </div>
                        ) : isRenaming ? (
                          <div class="flex items-stretch px-3 py-1.5 gap-1">
                            <input
                              type="text"
                              value={renameDraft}
                              aria-label="Rename preset"
                              class="flex-1 min-w-0 px-1.5 py-0.5 border border-rule bg-paper text-[12px] font-mono tabular text-ink outline-none focus:border-billiard"
                              onInput={(e) => setRenameDraft((e.currentTarget as HTMLInputElement).value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleRenameCommit(); }
                                else if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); }
                              }}
                              autoFocus
                            />
                            <button type="button" onClick={handleRenameCommit} class="px-1.5 font-mono text-[12px] text-billiard">✓</button>
                            <button type="button" onClick={() => setRenamingId(null)} class="px-1.5 font-mono text-[12px] text-ink-mute">✕</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApply(preset.id)}
                            class="w-full text-left px-3 py-2 hover:bg-paper-deep/40 focus:bg-paper-deep/40 focus:outline-none transition-colors"
                          >
                            <span class="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.06em] text-ink">
                              {preset.name}
                              {user && <span aria-hidden="true" class="text-billiard">·</span>}
                            </span>
                            <span class="block mt-0.5 font-mono tabular text-[11px] text-ink-mute">
                              {poolNotation(preset)}
                            </span>
                          </button>
                        )}
                      </div>
                      {!isRenaming && !isDeleting && user && (
                        <button
                          type="button"
                          onClick={(e) => handleContextMenu(preset.id, e)}
                          class="px-2 flex items-center justify-center text-ink-mute hover:text-ink transition-colors shrink-0"
                          aria-label={`Actions for ${preset.name}`}
                          title="Actions"
                        >
                          <span class="font-mono text-[14px] leading-none">⋯</span>
                        </button>
                      )}
                      {!isRenaming && !isDeleting && !user && (
                        <button
                          type="button"
                          onClick={() => handleCopy(preset.id)}
                          class="px-2 flex items-center justify-center text-ink-mute hover:text-billiard transition-colors shrink-0 font-mono text-[9px] uppercase tracking-[0.12em]"
                          aria-label={`Copy ${preset.name} to My Presets`}
                          title="Copy to My Presets"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <MyPresetsContextMenu
        open={contextMenuPresetId !== null}
        onClose={() => setContextMenuPresetId(null)}
        onRename={() => { if (contextMenuPresetId) handleRenameStart(contextMenuPresetId); }}
        onCopy={() => { if (contextMenuPresetId) handleCopy(contextMenuPresetId); }}
        onDelete={() => { if (contextMenuPresetId) setDeleteConfirmId(contextMenuPresetId); setContextMenuPresetId(null); }}
        triggerRect={contextMenuRect}
      />
    </div>,
    document.body
  );
}
