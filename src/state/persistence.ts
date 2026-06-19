import type { SavedConfig, DicePool, Outcome, RerollCondition, NamedValue, OutcomeCondition, PresetConfig, SweepParameters, Expr, DiceTerm, ScalarBinaryTerm, ConditionChain } from '@/types';
import { dicePool, outcomes, sweep, rerollConditions, pipeline, configDirty, buildSavedConfig } from './app-state';
import { exportConfigAsYaml, parsePreset, filenameForName } from '@/utils/yaml';
import { literalExpr } from '@/utils/expression';

const STORAGE_KEY = 'dice-calc-config';
const UI_PREFS_KEY = 'dice-calc-ui';

interface UiPrefs {
  showComments: boolean;
  showPoolComments: boolean;
  showRerollComments: boolean;
  showOutcomeComments: boolean;
}

export function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { showComments: false, showPoolComments: false, showRerollComments: false, showOutcomeComments: false };
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      showComments: parsed.showComments === true,
      showPoolComments: parsed.showPoolComments === true,
      showRerollComments: parsed.showRerollComments === true,
      showOutcomeComments: parsed.showOutcomeComments === true,
    };
  } catch {
    return { showComments: false, showPoolComments: false, showRerollComments: false, showOutcomeComments: false };
  }
}

export function saveUiPrefs(prefs: UiPrefs): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
}

interface V7Outcome {
  id?: string;
  name?: string;
  label?: string;
  kind?: 'threshold' | 'pool_success' | string;
  comparison?: string;
  value?: number;
  threshold?: number;
  source?: string;
  conditions?: unknown[];
  connector?: 'and' | 'or';
  comment?: string;
  isDefault?: boolean;
}

interface V7Term {
  id?: string;
  count?: number;
  sides?: number;
  tag?: string;
  modifier?: number;
}

interface V7Parameter {
  id?: string;
  label?: string;
  values?: number[];
  target?: string;
  targetTermId?: string;
  targetOutcomeId?: string;
  targetPipelineId?: string;
}

interface V7Pool {
  terms?: V7Term[];
}

interface V7Config {
  version: number;
  pool?: V7Pool;
  rerollConditions?: RerollCondition[];
  pipeline?: NamedValue[];
  outcomes?: V7Outcome[];
  parameters?: V7Parameter[];
  sweep?: { x: number[]; y: number[] | null };
}

export function saveConfig() {
  const config = buildSavedConfig();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    configDirty.value = false;
  } catch {
    return;
  }
}

function migrateOutcomeConditions(outcomes: V7Outcome[]): V7Outcome[] {
  return outcomes.map((o) => ({
    ...o,
    conditions: (o.conditions || []).map((c: unknown) => {
      if (c === 'none?') {
        return { op: 'none', subCondition: '>=', value: 0 };
      }
      if (c === 'any?') {
        return { op: 'any', subCondition: '>=', value: 0 };
      }
      if (typeof c === 'object' && c !== null && 'op' in c && (c as { op: unknown }).op === 'all?') {
        const ac = c as unknown as { subCondition: unknown; value: unknown };
        return { op: 'all', subCondition: ac.subCondition, value: ac.value };
      }
      return c;
    }) as unknown as OutcomeCondition[],
  }));
}

function literalizeNumberInPool(pool: DicePool): DicePool {
  return {
    terms: pool.terms.map((t: DiceTerm) => ({
      ...t,
      count: typeof t.count === 'number' ? literalExpr(t.count) : t.count,
      sides: typeof t.sides === 'number' ? literalExpr(t.sides) : t.sides,
    })),
  };
}

function literalizePipeline(pipeline: NamedValue[]): NamedValue[] {
  return pipeline.map((nv) => {
    if (typeof nv.op === 'object' && nv.op !== null && 'fn' in nv.op) {
      const op = nv.op as { fn: string; operand?: string; value?: number | Expr; source2?: string; terms?: ScalarBinaryTerm[] };
      if ((op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide') && (op.operand === 'literal' || op.operand === 'val')) {
        if (typeof op.value === 'number') {
          return { ...nv, op: { fn: op.fn, terms: [{ operand: 'val', value: literalExpr(op.value) }] } as NamedValue['op'] } as NamedValue;
        }
      }
      if ((op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide') && (op.operand === 'named' || op.operand === 'ref')) {
        return { ...nv, op: { fn: op.fn, terms: [{ operand: 'ref', source2: op.source2 || '' }] } as NamedValue['op'] } as NamedValue;
      }
    }
    return nv;
  });
}

function literalizeOutcomes(outcomes: Outcome[]): Outcome[] {
  return outcomes.map((o) => ({
    ...o,
    conditions: o.conditions.map((c) => {
      if ('value' in c) {
        const v = (c as Record<string, unknown>).value;
        if (typeof v === 'number') {
          return { ...c, value: literalExpr(v) } as OutcomeCondition;
        }
      }
      return c;
    }),
  }));
}

function migrateV7ToV8(config: V7Config): SavedConfig {
  const rawPool: DicePool = config.pool
    ? { terms: (config.pool.terms || []).map((t) => ({
        id: t.id || crypto.randomUUID(),
        count: typeof t.count === 'number' ? literalExpr(t.count) : literalExpr(1),
        sides: typeof t.sides === 'number' ? literalExpr(t.sides) : literalExpr(6),
        tag: t.tag ?? '',
        comment: '',
      })) }
    : { terms: [{ id: crypto.randomUUID(), count: literalExpr(1), sides: literalExpr(20), tag: '', comment: '' }] };

  const pipeline: NamedValue[] = literalizePipeline(config.pipeline || []);
  const outcomes: Outcome[] = literalizeOutcomes(migrateOutcomeConditions(config.outcomes || []) as unknown as Outcome[]).map((o) => {
    const { isDefault: _ignored, ...rest } = o as Outcome & { isDefault?: boolean };
    return rest;
  });

  const xAccumulator = new Set<number>();
  if (config.sweep && Array.isArray(config.sweep.x)) {
    for (const v of config.sweep.x) if (Number.isFinite(v)) xAccumulator.add(v);
  }
  if (config.parameters) {
    for (const p of config.parameters) {
      if (Array.isArray(p.values)) {
        for (const v of p.values) if (Number.isFinite(v)) xAccumulator.add(v);
      }
    }
    for (const p of config.parameters) {
      if (p.target === 'pool.count' || p.target === 'pool.sides') {
        const term = rawPool.terms.find((t) => t.id === p.targetTermId);
        if (term) {
          term.count = typeof term.count === 'number' ? literalExpr(term.count) : term.count;
          term.sides = typeof term.sides === 'number' ? literalExpr(term.sides) : term.sides;
          if (p.target === 'pool.count') {
            term.count = { kind: 'ref', name: 'X' };
          } else if (p.target === 'pool.sides') {
            term.sides = { kind: 'ref', name: 'X' };
          }
        }
      } else if (p.target === 'outcome.value') {
        const outcome = outcomes.find((o) => o.id === p.targetOutcomeId);
        if (outcome && outcome.conditions.length > 0) {
          const first = outcome.conditions[0]!;
          if ('value' in first) {
            outcome.conditions[0] = { ...first, value: { kind: 'ref', name: 'X' } } as OutcomeCondition;
          }
        }
      } else if (p.target === 'pipeline.literal') {
        const nv = pipeline.find((n) => n.id === p.targetPipelineId);
        if (nv && typeof nv.op === 'object' && nv.op !== null && 'fn' in nv.op) {
          const op = nv.op as { fn: string; operand?: string; terms?: ScalarBinaryTerm[] };
          if ((op.operand === 'literal' || op.operand === 'val') && (op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide')) {
            nv.op = { fn: op.fn, terms: [{ operand: 'val', value: { kind: 'ref', name: 'X' } }] } as NamedValue['op'];
          }
        }
      }
    }
  }

  const xSorted = Array.from(xAccumulator).sort((a, b) => a - b);
  const sweep: SweepParameters = { x: xSorted, y: null };

  return {
    version: 8 as unknown as 9,
    pool: literalizeNumberInPool(rawPool),
    rerollConditions: config.rerollConditions || [],
    pipeline,
    outcomes,
    sweep,
  } as SavedConfig;
}

function migrateV8ToV9(config: SavedConfig): SavedConfig {
  const reroll: RerollCondition[] = (config.rerollConditions || []).map((rc) => ({
    ...rc,
    tagAs: (rc as RerollCondition & { tagAs?: string }).tagAs || '',
    conditions: migrateConditionChain(rc.conditions),
  }));

  const pipe: NamedValue[] = (config.pipeline || []).map((nv) => {
    if (typeof nv.op === 'object' && nv.op !== null && 'fn' in nv.op) {
      const op = nv.op as { fn: string; operand?: string; value?: number | Expr; source2?: string; terms?: ScalarBinaryTerm[]; conditions?: ConditionChain & { connector?: string } };
      if ((op.fn === 'filter' || op.fn === 'remove') && op.conditions) {
        const migratedConditions = migrateConditionChain(op.conditions);
        return { ...nv, op: { ...op, conditions: migratedConditions } as NamedValue['op'] } as NamedValue;
      }
      if ((op.fn === 'add' || op.fn === 'subtract' || op.fn === 'multiply' || op.fn === 'divide') && !op.terms) {
        if (op.operand === 'literal' || op.operand === 'val') {
          return { ...nv, op: { fn: op.fn, terms: [{ operand: 'val', value: op.value || literalExpr(0) }] } as NamedValue['op'] } as NamedValue;
        }
        if (op.operand === 'named' || op.operand === 'ref') {
        return { ...nv, op: { fn: op.fn, terms: [{ operand: 'ref', source2: op.source2 || '' }] } as NamedValue['op'] } as NamedValue;
        }
      }
    }
    return nv;
  });

  const migratedOutcomes: Outcome[] = (config.outcomes || []).map((o) => {
    const oldOutcome = o as Outcome & { connector?: string };
    if (oldOutcome.connectors && oldOutcome.connectors.length > 0) return o;
    const oldConn = oldOutcome.connector || 'and';
    return {
      ...o,
      connectors: o.conditions.length > 1 ? Array(o.conditions.length - 1).fill(oldConn) as ('and' | 'or')[] : [],
    };
  });

  return {
    version: 9,
    pool: config.pool,
    rerollConditions: reroll,
    pipeline: pipe,
    outcomes: migratedOutcomes,
    sweep: config.sweep,
  };
}

function migrateConditionChain(chain: ConditionChain & { connector?: string }): ConditionChain {
  const clauses = chain.clauses.map((clause) => {
    if (clause.field === 'face') {
      const oldValue = clause.value as unknown;
      if (oldValue === 'max_value') {
        return { field: 'face' as const, operator: 'is_max' as const };
      }
      if (oldValue === 'min_value') {
        return { field: 'face' as const, operator: 'is_min' as const };
      }
      if (typeof oldValue === 'number') {
        return { field: 'face' as const, operator: clause.operator, value: literalExpr(oldValue) };
      }
      return { field: 'face' as const, operator: clause.operator, value: oldValue as Expr | undefined };
    }
    return clause;
  });

  if (chain.connectors && chain.connectors.length > 0) {
    return { clauses, connectors: chain.connectors };
  }
  const oldConnector = (chain as { connector?: string }).connector || 'and';
  return { clauses, connectors: clauses.length > 1 ? Array(clauses.length - 1).fill(oldConnector) as ('and' | 'or')[] : [] };
}

function migrateConfig(config: V7Config | SavedConfig): SavedConfig {
  const ver: number = config.version;
  if (ver === 9) {
    return config as SavedConfig;
  }
  if (ver === 8) {
    return migrateV8ToV9(config as SavedConfig);
  }
  if (ver === 7) {
    return migrateV8ToV9(migrateV7ToV8(config as V7Config));
  }
  return migrateV8ToV9(migrateV7ToV8({ ...config, version: 7 } as V7Config));
}

export function loadConfig(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const config = JSON.parse(raw) as V7Config;
    const migrated = migrateConfig(config);
    dicePool.value = migrated.pool;
    rerollConditions.value = migrated.rerollConditions;
    pipeline.value = migrated.pipeline;
    outcomes.value = migrated.outcomes;
    sweep.value = migrated.sweep;
    return true;
  } catch {
    return false;
  }
}

export function clearConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function exportCurrentAsYaml(name: string): { filename: string; text: string } {
  const config: PresetConfig = {
    id: 'current',
    name: name || 'Untitled',
    pool: dicePool.value,
    rerollConditions: rerollConditions.value,
    pipeline: pipeline.value,
    outcomes: outcomes.value,
    sweep: sweep.value,
  };
  const text = exportConfigAsYaml(name, config);
  const filename = filenameForName(name);
  return { filename, text };
}

export function importPresetFromYamlText(text: string): PresetConfig {
  return parsePreset(text);
}

export function downloadYamlFile(filename: string, text: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveCurrentAsYaml(name: string): Promise<void> {
  const exportName = name || 'Dice Roll';
  const { filename, text } = exportCurrentAsYaml(exportName);

  const pickerAvailable = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  if (pickerAvailable) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'YAML preset', accept: { 'text/yaml': ['.yaml'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  downloadYamlFile(filename, text);
}

export async function readYamlFile(file: File): Promise<string> {
  return await file.text();
}
