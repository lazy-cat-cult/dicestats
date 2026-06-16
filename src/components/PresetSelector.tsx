import { useRef, useState } from 'preact/hooks';
import {
  allPresets,
  applyPresetConfig,
  mergeOrStagePreset,
  parameters,
  userPresets,
} from '@/state/app-state';
import { resetUiForPresetApply, loadError } from '@/app';
import { FEATURED_PRESET_IDS, PRESETS } from '@/domain/presets';
import { Pill, Button } from '@/components/ui';
import { PresetLibraryModal } from '@/components/PresetLibraryModal';
import {
  exportCurrentAsYaml,
  downloadYamlFile,
  readYamlFile,
  importPresetFromYamlText,
} from '@/state/persistence';

export function PresetSelector() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  function applyPreset(id: string) {
    const preset = allPresets.value.find((p) => p.id === id);
    if (!preset) return;
    resetUiForPresetApply();
    applyPresetConfig(preset);
  }

  function handleSave() {
    loadError.value = null;
    const nameFromParams = parameters.value[0]?.label;
    const name = nameFromParams || 'Dice Roll';
    const { filename, text } = exportCurrentAsYaml(name);
    downloadYamlFile(filename, text);
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
