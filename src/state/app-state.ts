import { signal, computed, effect } from '@preact/signals';
import type { DicePool, Outcome, Parameter, RerollCondition, NamedValue } from '@/types';
import { PRESETS } from '@/domain/presets';
import { formatSweepRange } from '@/utils/format';

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

export function hashIdToColor(id: string): string {
  if (!id) return '#6b7280';
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % TAG_COLORS.length;
  return TAG_COLORS[idx];
}

export function getTagColor(tag: string): string {
  if (!tag) return '#6b7280';
  const existingTags = [...new Set(dicePool.value.terms.map((t) => t.tag).filter(Boolean))];
  const index = existingTags.indexOf(tag);
  if (index < 0) return '#6b7280';
  return TAG_COLORS[index % TAG_COLORS.length] ?? '#6b7280';
}

export const activeSweepsByTarget = computed<Map<string, Parameter>>(() => {
  const m = new Map<string, Parameter>();
  for (const p of parameters.value) {
    const key = `${p.target}:${p.targetTermId ?? p.targetOutcomeId ?? p.targetPipelineId ?? ''}`;
    m.set(key, p);
  }
  return m;
});

export const totalIterations = computed<number>(() => {
  const n = parameters.value.reduce((acc, p) => acc * Math.max(1, p.values.length), 1);
  return n * 1_000_000;
});

export const confirmedHighCost = signal<boolean>(false);
export const highlightTargetId = signal<string | null>(null);
export const highlightTargetKind = signal<'term' | 'outcome' | 'pipeline' | null>(null);

let lastParamFingerprint = '';
effect(() => {
  const fingerprint = JSON.stringify(parameters.value);
  if (lastParamFingerprint && lastParamFingerprint !== fingerprint) {
    if (confirmedHighCost.value) confirmedHighCost.value = false;
  }
  lastParamFingerprint = fingerprint;
});

export const dicePoolNotation = computed(() => {
  const pool = dicePool.value;
  const sweeps = activeSweepsByTarget.value;
  return pool.terms
    .map((t) => {
      const countParam = sweeps.get(`pool.count:${t.id}`);
      const sidesParam = sweeps.get(`pool.sides:${t.id}`);
      const countStr = countParam ? formatSweepRange(countParam.values) : String(t.count);
      const sidesStr = sidesParam ? formatSweepRange(sidesParam.values) : String(t.sides);
      let s = `${countStr}d${sidesStr}`;
      if (t.tag) s += ` \u25CF${t.tag}`;
      return s;
    })
    .join(' + ');
});
