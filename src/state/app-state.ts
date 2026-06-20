import { signal, computed, effect } from '@preact/signals';
import type { DicePool, Outcome, PresetConfig, RerollCondition, NamedValue, SweepParameters, Expr, SampleTrace, SavedConfig, MyPreset } from '@/types';
import { exprToString } from '@/utils/expression';
import { PRESETS } from '@/domain/presets';
import { loadUiPrefs, saveUiPrefs } from '@/state/persistence';
import { loadMyPresets, saveMyPresets, loadFavorites, saveFavorites, toggleFavorite as toggleFavoriteId } from '@/state/my-presets';

function defaultPool(): DicePool {
  return {
    terms: [{ id: crypto.randomUUID(), count: { kind: 'literal', value: 1 }, sides: { kind: 'literal', value: 20 }, tag: '', comment: '' }],
  };
}

function defaultSweep(): SweepParameters {
  return { x: [], y: null };
}

export const dicePool = signal<DicePool>(defaultPool());
export const rerollConditions = signal<RerollCondition[]>([]);
export const pipeline = signal<NamedValue[]>([]);
export const outcomes = signal<Outcome[]>([]);
export const sweep = signal<SweepParameters>(defaultSweep());
export const isSimulating = signal(false);
export const simProgress = signal({ completed: 0, total: 0 });

export const sampleMode = signal<'idle' | 'sampling' | 'result'>('idle');
export const sampleTrace = signal<SampleTrace | null>(null);
export const sampleX = signal<number | null>(null);
export const sampleY = signal<number | null>(null);

export function resetSampleMode() {
  sampleMode.value = 'idle';
  sampleTrace.value = null;
  sampleX.value = null;
  sampleY.value = null;
}

export function resetToPreset(presetId: string) {
  const preset = allPresets.value.find((p) => p.id === presetId);
  if (!preset) return;
  applyPresetConfig(preset);
}

export function mergeOrStagePreset(config: PresetConfig): 'merged' | 'staged' {
  const idx = PRESETS.findIndex((p) => p.name === config.name);
  if (idx >= 0) {
    PRESETS[idx] = { ...config, id: PRESETS[idx]!.id };
    return 'merged';
  }
  const myIdx = myPresets.value.findIndex((p) => p.name === config.name);
  if (myIdx >= 0) {
    const existing = myPresets.value[myIdx]!;
    myPresets.value = myPresets.value.map((p) => (p.id === existing.id ? { ...config, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() } as MyPreset : p));
    return 'staged';
  }
  const newPreset = { ...config, id: config.id || crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as MyPreset;
  myPresets.value = [newPreset, ...myPresets.value];
  return 'staged';
}

export function resetToDefaults() {
  dicePool.value = defaultPool();
  rerollConditions.value = [];
  pipeline.value = [];
  outcomes.value = [];
  sweep.value = defaultSweep();
  currentPresetName.value = null;
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

export const totalIterations = computed<number>(() => {
  const xCount = Math.max(1, sweep.value.x.length);
  const yCount = sweep.value.y ? Math.max(1, sweep.value.y.length) : 1;
  return xCount * yCount * 1_000_000;
});

export const sweepSimCount = computed<number>(() => {
  const xCount = Math.max(1, sweep.value.x.length);
  const yCount = sweep.value.y ? Math.max(1, sweep.value.y.length) : 1;
  return xCount * yCount;
});

export const confirmedHighCost = signal<boolean>(false);
export const highlightTargetId = signal<string | null>(null);
export const highlightTargetKind = signal<'term' | 'outcome' | 'pipeline' | null>(null);

export const myPresets = signal<MyPreset[]>(loadMyPresets());
export const allPresets = computed<PresetConfig[]>(() => [...myPresets.value, ...PRESETS]);
export const favoriteIds = signal<Set<string>>(loadFavorites());
export const lastAppliedPresetId = signal<string | null>(null);
export const currentPresetName = signal<string | null>(null);

export function setCurrentPresetName(name: string | null): void {
  currentPresetName.value = name === '' ? null : name;
}

export function applyPresetConfig(preset: PresetConfig) {
  dicePool.value = { ...preset.pool, terms: preset.pool.terms.map((t) => ({ ...t, count: t.count, sides: t.sides })) };
  rerollConditions.value = preset.rerollConditions.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } }));
  pipeline.value = preset.pipeline.map((p) => ({ ...p }));
  outcomes.value = preset.outcomes.map((o) => ({ ...o, conditions: [...o.conditions] }));
  sweep.value = {
    x: [...preset.sweep.x],
    y: preset.sweep.y ? [...preset.sweep.y] : null,
  };
  currentPresetName.value = preset.name;
  lastAppliedPresetId.value = preset.id;
}

export function resetUiForPresetApply() {
  confirmedHighCost.value = false;
  highlightTargetId.value = null;
  highlightTargetKind.value = null;
}

export const showComments = signal<boolean>(loadUiPrefs().showComments);

export const showPoolComments = signal<boolean>(loadUiPrefs().showPoolComments);
export const showRerollComments = signal<boolean>(loadUiPrefs().showRerollComments);
export const showOutcomeComments = signal<boolean>(loadUiPrefs().showOutcomeComments);

export const existingTags = computed<string[]>(() => {
  const set = new Set<string>();
  for (const t of dicePool.value.terms) if (t.tag) set.add(t.tag);
  for (const rc of rerollConditions.value) if (rc.tagAs) set.add(rc.tagAs);
  return Array.from(set).sort();
});

let lastSweepFingerprint = '';
effect(() => {
  const fingerprint = JSON.stringify(sweep.value);
  if (lastSweepFingerprint && lastSweepFingerprint !== fingerprint) {
    if (confirmedHighCost.value) confirmedHighCost.value = false;
  }
  lastSweepFingerprint = fingerprint;
});

effect(() => {
  saveUiPrefs({
    showComments: showComments.value,
    showPoolComments: showPoolComments.value,
    showRerollComments: showRerollComments.value,
    showOutcomeComments: showOutcomeComments.value,
  });
});

export const configDirty = signal<boolean>(false);

function debouncedPersist<T>(getSnapshot: () => T, persist: (v: T) => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => persist(getSnapshot()), ms);
  };
}

const flushMyPresets = debouncedPersist(() => myPresets.value, saveMyPresets, 300);
const flushFavorites = debouncedPersist(() => favoriteIds.value, saveFavorites, 300);

effect(() => { void myPresets.value; flushMyPresets(); });
effect(() => { void favoriteIds.value; flushFavorites(); });

let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;
export function flushPendingPresetWrites(): void {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  saveMyPresets(myPresets.value);
  saveFavorites(favoriteIds.value);
}

export function toggleFavorite(id: string): void {
  favoriteIds.value = toggleFavoriteId(id, favoriteIds.value);
}

let lastConfigFingerprint = '';
effect(() => {
  const fp = JSON.stringify({
    pool: dicePool.value,
    reroll: rerollConditions.value,
    pipeline: pipeline.value,
    outcomes: outcomes.value,
    sweep: sweep.value,
  });
  if (lastConfigFingerprint && lastConfigFingerprint !== fp) {
    configDirty.value = true;
  }
  lastConfigFingerprint = fp;
});

export const previewVars = computed<{ x?: number; y?: number }>(() => {
  const sw = sweep.value;
  return {
    x: sw.x[0],
    y: sw.y ? sw.y[0] : undefined,
  };
});

function formatExprForNotation(expr: Expr, sw: SweepParameters): string {
  if (expr.kind === 'literal') return String(expr.value);
  if (expr.kind === 'ref') {
    const values = expr.name === 'Y' && sw.y ? sw.y : sw.x;
    if (values.length === 0) return expr.name;
    if (values.length === 1) return String(values[0]!);
    const min = values[0]!;
    const max = values[values.length - 1]!;
    const isConsecutive = values.every((v, i) => v === min + i);
    if (isConsecutive) return `${min}..${max}`;
    return `{${values.join(', ')}}`;
  }
  return exprToString(expr);
}

export function buildSavedConfig(): SavedConfig {
  return {
    version: 9,
    pool: dicePool.value,
    rerollConditions: rerollConditions.value,
    pipeline: pipeline.value,
    outcomes: outcomes.value,
    sweep: sweep.value,
  };
}

export const dicePoolNotation = computed(() => {
  const pool = dicePool.value;
  const sw = sweep.value;
  return pool.terms
    .map((t) => {
      const cPart = formatExprForNotation(t.count, sw);
      const sPart = formatExprForNotation(t.sides, sw);
      let s = `${cPart}d${sPart}`;
      if (t.tag) s += ` <${t.tag}>`;
      return s;
    })
    .join(', ');
});
