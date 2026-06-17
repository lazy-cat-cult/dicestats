import { useEffect, useRef, useState } from 'preact/hooks';
import {
  allPresets,
  applyPresetConfig,
  currentPresetName,
  mergeOrStagePreset,
  setCurrentPresetName,
  userPresets,
} from '@/state/app-state';
import { resetUiForPresetApply, loadError } from '@/app';
import { FEATURED_PRESET_IDS, PRESETS } from '@/domain/presets';
import { Pill, Button } from '@/components/ui';
import { PresetLibraryModal } from '@/components/PresetLibraryModal';
import {
  readYamlFile,
  importPresetFromYamlText,
  saveCurrentAsYaml,
} from '@/state/persistence';

export function PresetSelector() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

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

  function handleSave() {
    loadError.value = null;
    void saveCurrentAsYaml(currentPresetName.value ?? '');
  }

  async function handleLoadFile(e: Event) {
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

  const featured = FEATURED_PRESET_IDS
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const displayName = currentPresetName.value ?? '';
  const hasName = displayName.length > 0;

  return (
    <div class="border-b border-rule bg-paper">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute shrink-0">
          Presets
        </span>
        <div class="flex-1 overflow-x-auto -mx-1 px-1">
          <div class="flex items-center gap-1.5 min-w-min">
            {userPresets.value.map((preset) => (
              <Pill
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                title="Loaded from file"
              >
                {preset.name}
                <span aria-hidden="true" class="text-billiard">·</span>
              </Pill>
            ))}
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
              All Presets ▾
            </Pill>
          </div>
        </div>
        {loadError.value && (
          <span class="hidden sm:inline font-mono text-[11px] text-gold-soft max-w-xs truncate shrink-0" title={loadError.value}>
            {loadError.value}
          </span>
        )}
        <div class="flex items-center gap-1 shrink-0 min-w-0 max-w-[280px]">
          <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute shrink-0">
            Name
          </span>
          {isEditingName ? (
            <div class="flex items-stretch border border-rule bg-paper focus-within:border-billiard focus-within:shadow-[0_0_0_1px_var(--color-billiard)] transition-all min-w-0 flex-1">
              <input
                ref={editInputRef}
                type="text"
                value={nameDraft}
                placeholder="Preset name"
                aria-label="Preset name"
                class="w-full bg-transparent px-2 py-1 text-[12px] font-mono tabular text-ink outline-none placeholder:text-ink-mute min-w-0"
                onInput={(e) => setNameDraft((e.currentTarget as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitName();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelNameEdit();
                  }
                }}
              />
              <button
                type="button"
                onClick={commitName}
                aria-label="Save preset name"
                class="px-2 font-mono text-[13px] text-billiard hover:text-billiard-deep border-l border-rule shrink-0"
                title="Save (Enter)"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={cancelNameEdit}
                aria-label="Cancel preset name edit"
                class="px-2 font-mono text-[13px] text-ink-mute hover:text-billiard-deep border-l border-rule shrink-0"
                title="Cancel (Esc)"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingName}
              aria-label={hasName ? `Edit preset name: ${displayName}` : 'Set preset name'}
              title={hasName ? `Edit preset name (${displayName})` : 'Set preset name'}
              class={`group inline-flex items-center gap-1.5 px-2 py-1 border border-transparent hover:border-rule transition-colors min-w-0 max-w-full ${hasName ? 'text-ink' : 'text-ink-mute'}`}
            >
              <span class="font-mono tabular text-[12px] truncate">
                {hasName ? displayName : 'Preset name'}
              </span>
              <span aria-hidden="true" class="font-mono text-[12px] text-ink-mute group-hover:text-billiard shrink-0">✎</span>
            </button>
          )}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleSave} ariaLabel="Save current configuration as YAML" className="border-gold/50 text-ink hover:border-billiard hover:text-billiard">
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} ariaLabel="Load configuration from YAML file" className="border-gold/50 text-ink hover:border-billiard hover:text-billiard">
            Load
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            class="hidden"
            onChange={handleLoadFile}
          />
        </div>
      </div>
      <PresetLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onApply={applyPreset}
      />
    </div>
  );
}
