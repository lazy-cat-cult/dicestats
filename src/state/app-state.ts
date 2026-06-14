import { signal, computed } from '@preact/signals';
import type { DicePool, Outcome, Parameter, RerollCondition, NamedValue } from '@/types';
import { PRESETS } from '@/domain/presets';

function defaultPool(): DicePool {
  return {
    terms: [{ id: crypto.randomUUID(), count: 1, sides: 20, tag: '' }],
  };
}

export const dicePool = signal<DicePool>(defaultPool());
export const rerollConditions = signal<RerollCondition[]>([]);
export const pipeline = signal<NamedValue[]>([]);
export const outcomes = signal<Outcome[]>([]);
export const parameters = signal<Parameter[]>([]);
export const isSimulating = signal(false);
export const simProgress = signal({ completed: 0, total: 0 });

export function resetToPreset(presetId: string) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  dicePool.value = { ...preset.pool, terms: preset.pool.terms.map((t) => ({ ...t })) };
  rerollConditions.value = preset.rerollConditions.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } }));
  pipeline.value = preset.pipeline.map((p) => ({ ...p }));
  outcomes.value = preset.outcomes.map((o) => ({ ...o, conditions: [...o.conditions] }));
  parameters.value = preset.parameters?.map((p) => ({ ...p })) ?? [];
}

export function resetToDefaults() {
  dicePool.value = defaultPool();
  rerollConditions.value = [];
  pipeline.value = [];
  outcomes.value = [];
  parameters.value = [];
}

const TAG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function getTagColor(tag: string): string {
  if (!tag) return '#6b7280';
  const existingTags = [...new Set(dicePool.value.terms.map((t) => t.tag).filter(Boolean))];
  const index = existingTags.indexOf(tag);
  return TAG_COLORS[index % TAG_COLORS.length] ?? '#6b7280';
}

export const dicePoolNotation = computed(() => {
  const pool = dicePool.value;
  return pool.terms
    .map((t) => {
      let s = `${t.count}d${t.sides}`;
      if (t.tag) s += ` \u25CF${t.tag}`;
      return s;
    })
    .join(' + ');
});