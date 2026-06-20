import { useEffect, useRef, useState } from 'preact/hooks';
import {
  allPresets,
  applyPresetConfig,
  currentPresetName,
  myPresets,
  favoriteIds,
  setCurrentPresetName,
  lastAppliedPresetId,
  resetToDefaults,
  mergeOrStagePreset,
} from '@/state/app-state';
import { dicePool, rerollConditions, pipeline, outcomes, sweep } from '@/state/app-state';
import { FEATURED_PRESET_IDS, PRESETS } from '@/domain/presets';
import { resetUiForPresetApply, loadError } from '@/app';
import { Pill, Button } from '@/components/ui';
import { PresetLibraryModal } from '@/components/PresetLibraryModal';
import { PresetSaveDialog } from '@/components/PresetSaveDialog';
import {
  readYamlFile,
  importPresetFromYamlText,
  saveCurrentAsYaml,
} from '@/state/persistence';
import { buildShareUrl } from '@/utils/share';
import { addOrUpdateMyPreset, loadMyPresets } from '@/state/my-presets';
import type { PresetConfig } from '@/types';

export function PresetSelector() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveConflict, setSaveConflict] = useState<{ message: string; actions: { label: string; action: () => void }[] } | null>(null);

  useEffect(() => {
    if (!isEditingName) return;
    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingName) setIsEditingName(false);
  }, [currentPresetName.value]);

  function startEditingName() {
    setNameDraft(currentPresetName.value ?? '');
    setIsEditingName(true);
  }

  function commitName() {
    setCurrentPresetName(nameDraft);
    setIsEditingName(false);
  }

  function cancelNameEdit() {
    setNameDraft(currentPresetName.value ?? '');
    setIsEditingName(false);
  }

  function applyPreset(id: string) {
    const preset = allPresets.value.find((p) => p.id === id);
    if (!preset) return;
    resetUiForPresetApply();
    applyPresetConfig(preset);
  }

  function handleNew() {
    resetUiForPresetApply();
    resetToDefaults();
  }

  function handleExport() {
    loadError.value = null;
    void saveCurrentAsYaml(currentPresetName.value ?? '');
  }

  async function handleImportFile(e: Event) {
    loadError.value = null;
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const text = await readYamlFile(file);
      const config = importPresetFromYamlText(text);
      resetUiForPresetApply();
      mergeOrStagePreset(config);
      applyPresetConfig(config);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load file';
      loadError.value = message.replace(/^Preset error: /, '').replace(/^YAML error at \d+:\d+: /, 'YAML: ');
    }
  }

  async function handleShareUrl() {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      copyFallback(url);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  function copyFallback(text: string) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function savePreset(name: string): boolean {
    const id = lastAppliedPresetId.value && !PRESETS.some((p) => p.id === lastAppliedPresetId.value)
      ? lastAppliedPresetId.value
      : crypto.randomUUID();
    const config: PresetConfig = {
      id,
      name,
      pool: dicePool.value,
      rerollConditions: rerollConditions.value,
      pipeline: pipeline.value,
      outcomes: outcomes.value,
      sweep: sweep.value,
    };
    const result = addOrUpdateMyPreset(config);
    if (result === 'limit_reached') return false;
    setCurrentPresetName(name);
    lastAppliedPresetId.value = id;
    myPresets.value = loadMyPresets();
    return true;
  }

  function handleSave() {
    loadError.value = null;
    const name = currentPresetName.value;
    const laId = lastAppliedPresetId.value;

    if (!name) {
      setSaveConflict(null);
      setShowSaveDialog(true);
      return;
    }

    if (laId) {
      const isStd = PRESETS.some((p) => p.id === laId);
      if (isStd) {
        const stdName = PRESETS.find((p) => p.id === laId)?.name;
        if (name === stdName) {
          setSaveConflict({
            message: `${name} is a standard preset. Save as copy?`,
            actions: [
              { label: 'Save as Copy', action: () => { doSaveAsCopy(); setShowSaveDialog(false); setSaveConflict(null); } },
              { label: 'Cancel', action: () => { setShowSaveDialog(false); setSaveConflict(null); } },
            ],
          });
          setShowSaveDialog(true);
          return;
        }
      }
    }

    doSaveDirect(name);
  }

  function doSaveDirect(name: string) {
    const ok = savePreset(name);
    if (!ok) {
      loadError.value = 'My Presets limit reached (100). Delete unused presets to make room.';
      return;
    }
    setShowSaveDialog(false);
    setSaveConflict(null);
  }

  function doSaveAsCopy() {
    const name = currentPresetName.value || 'Untitled';
    const ok = savePreset(name);
    if (!ok) {
      loadError.value = 'My Presets limit reached (100). Delete unused presets to make room.';
    }
  }

  function handleSaveDialogSave(name: string) {
    doSaveDirect(name);
  }

  function handleSaveDialogCancel() {
    setShowSaveDialog(false);
    setSaveConflict(null);
  }

  const myPresetsList = [...myPresets.value]
    .sort((a, b) => {
      const aFav = favoriteIds.value.has(a.id);
      const bFav = favoriteIds.value.has(b.id);
      if (aFav !== bFav) return aFav ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 4);

  const featured = FEATURED_PRESET_IDS
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const displayName = currentPresetName.value ?? '';
  const hasName = displayName.length > 0;
  const atLimit = myPresets.value.length >= 100;
  const laId = lastAppliedPresetId.value;

  return (
    <div class="border-b border-rule bg-paper">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex flex-col gap-2">
        <div class="flex items-center gap-4">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute shrink-0">
            Presets
          </span>
          <div class="flex-1 overflow-x-auto -mx-1 px-1">
            <div class="flex items-center gap-1.5 min-w-min">
              {myPresetsList.length > 0 ? myPresetsList.map((preset) => (
                <Pill
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  title={preset.name}
                >
                  {favoriteIds.value.has(preset.id) && <span aria-hidden="true">⭐</span>}
                  {preset.name}
                  <span aria-hidden="true" class="text-billiard">·</span>
                </Pill>
              )) : (
                <span class="font-mono text-[12px] text-ink-mute italic px-1">No saved presets</span>
              )}
              {featured.map((preset) => (
                <Pill
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  title={preset.name}
                >
                  {preset.name}
                </Pill>
              ))}
              <Pill
                variant="accent"
                onClick={() => setLibraryOpen(true)}
                title="Browse all presets"
                ariaLabel="Open all presets library"
              >
                All ▾
              </Pill>
            </div>
          </div>
          {loadError.value && (
            <span class="hidden sm:inline font-mono text-[11px] text-gold-soft max-w-xs truncate shrink-0" title={loadError.value}>
              {loadError.value}
            </span>
          )}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute shrink-0">
            Name
          </span>
          {isEditingName ? (
            <div class="flex items-stretch border border-rule bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)] transition-all min-w-0 flex-1 max-w-[240px]">
              <input
                ref={editInputRef}
                type="text"
                value={nameDraft}
                placeholder="Preset name"
                aria-label="Preset name"
                class="w-full bg-transparent px-2 py-1 text-[12px] font-mono tabular text-ink outline-none placeholder:text-ink-mute min-w-0"
                onInput={(e) => setNameDraft((e.currentTarget as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitName(); }
                  else if (e.key === 'Escape') { e.preventDefault(); cancelNameEdit(); }
                }}
              />
              <button type="button" onClick={commitName} aria-label="Save preset name" class="px-2 font-mono text-[13px] text-billiard hover:text-billiard-deep border-l border-rule shrink-0" title="Save (Enter)">✓</button>
              <button type="button" onClick={cancelNameEdit} aria-label="Cancel preset name edit" class="px-2 font-mono text-[13px] text-ink-mute hover:text-billiard-deep border-l border-rule shrink-0" title="Cancel (Esc)">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingName}
              aria-label={hasName ? `Edit preset name: ${displayName}` : 'Set preset name'}
              title={hasName ? `Edit preset name (${displayName})` : 'Set preset name'}
              class={`group inline-flex items-center gap-1.5 px-2 py-1 border border-transparent hover:border-rule transition-colors min-w-0 max-w-[200px] ${hasName ? 'text-ink' : 'text-ink-mute'}`}
            >
              <span class="font-mono tabular text-[12px] truncate">{hasName ? displayName : 'Preset name'}</span>
              <span aria-hidden="true" class="font-mono text-[12px] text-ink-mute group-hover:text-billiard shrink-0">✎</span>
            </button>
          )}
          <div class="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleNew} ariaLabel="Clear all configuration fields" className="border-gold/50 text-ink hover:border-billiard hover:text-billiard">
              New
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport} ariaLabel="Export current configuration as YAML" className="border-gold/50 text-ink hover:border-billiard hover:text-billiard">
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} ariaLabel="Import configuration from YAML file" className="border-gold/50 text-ink hover:border-billiard hover:text-billiard">
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={atLimit && !laId}
              ariaLabel="Save current configuration to My Presets"
              className="border-gold/50 text-ink hover:border-billiard hover:text-billiard"
              title={atLimit && !laId ? 'My Presets limit reached (100). Delete unused presets to make room.' : 'Save to My Presets'}
            >
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShareUrl} ariaLabel="Copy share URL to clipboard" className="border-gold/50 text-ink hover:border-billiard hover:text-billiard">
              {shareCopied ? 'Copied!' : 'Share URL'}
            </Button>
          </div>
        </div>
        {(showSaveDialog || saveConflict) && (
          <div class="w-full max-w-md">
            {saveConflict ? (
              <PresetSaveDialog
                onSave={handleSaveDialogSave}
                onCancel={handleSaveDialogCancel}
                defaultName={currentPresetName.value ?? ''}
                conflictMessage={saveConflict.message}
                conflictActions={saveConflict.actions}
              />
            ) : (
              <PresetSaveDialog
                onSave={handleSaveDialogSave}
                onCancel={handleSaveDialogCancel}
              />
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          class="hidden"
          onChange={handleImportFile}
        />
      </div>
      <PresetLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onApply={applyPreset}
      />
    </div>
  );
}
