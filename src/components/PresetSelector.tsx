import { allPresets, applyPresetConfig } from '@/state/app-state';
import { resetUiForPresetApply } from '@/app';
import { PRESETS } from '@/domain/presets';
import { Pill } from '@/components/ui';

export function PresetSelector() {
  function applyPreset(id: string) {
    const preset = allPresets.value.find((p) => p.id === id);
    if (!preset) return;

    resetUiForPresetApply();
    applyPresetConfig(preset);
  }

  return (
    <div class="border-b border-rule bg-paper">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute shrink-0">
          Presets
        </span>
        <div class="flex-1 overflow-x-auto -mx-1 px-1">
          <div class="flex items-center gap-1.5 min-w-min">
            {allPresets.value.map((preset) => {
              const isUser = !PRESETS.some((p) => p.id === preset.id);
              return (
                <Pill
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  title={isUser ? 'Loaded from file' : preset.name}
                >
                  {preset.name}
                  {isUser && <span aria-hidden="true" class="text-billiard">·</span>}
                </Pill>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
