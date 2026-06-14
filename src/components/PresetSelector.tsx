import { PRESETS } from '@/domain/presets';
import { dicePool, rerollConditions, pipeline, outcomes, parameters } from '@/state/app-state';

export function PresetSelector() {
  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    dicePool.value = { ...preset.pool, terms: preset.pool.terms.map((t) => ({ ...t })) };
    rerollConditions.value = preset.rerollConditions.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } }));
    pipeline.value = preset.pipeline.map((p) => ({ ...p }));
    outcomes.value = preset.outcomes.map((o) => ({ ...o, conditions: [...o.conditions] }));
    parameters.value = preset.parameters?.map((p) => ({ ...p })) ?? [];
  }

  return (
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-600 mb-2">Presets</h3>
      <div class="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            onClick={() => applyPreset(preset.id)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}