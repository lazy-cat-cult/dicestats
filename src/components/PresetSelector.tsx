import { allPresets, applyPresetConfig } from '@/state/app-state';
import { resetUiForPresetApply } from '@/app';
import { PRESETS } from '@/domain/presets';

export function PresetSelector() {
  function applyPreset(id: string) {
    const preset = allPresets.value.find((p) => p.id === id);
    if (!preset) return;

    resetUiForPresetApply();
    applyPresetConfig(preset);
  }

  return (
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-600 mb-2">Presets</h3>
      <div class="flex flex-wrap gap-2">
        {allPresets.value.map((preset) => {
          const isUser = !PRESETS.some((p) => p.id === preset.id);
          return (
            <button
              key={preset.id}
              class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              onClick={() => applyPreset(preset.id)}
            >
              {preset.name}
              {isUser && <span class="ml-1 text-indigo-400" title="Loaded from file">\u2022</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
