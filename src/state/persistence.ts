import type { SavedConfig, DicePool, Outcome, Parameter, RerollCondition, NamedValue, ParameterTarget, OutcomeCondition, PresetConfig } from '@/types';
import { dicePool, outcomes, parameters, rerollConditions, pipeline, configDirty } from './app-state';
import { exportConfigAsYaml, parsePreset, filenameForName } from '@/utils/yaml';

const STORAGE_KEY = 'dice-calc-config';
const UI_PREFS_KEY = 'dice-calc-ui';

interface UiPrefs {
  showComments: boolean;
}

export function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { showComments: false };
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return { showComments: parsed.showComments === true };
  } catch {
    return { showComments: false };
  }
}

export function saveUiPrefs(prefs: UiPrefs): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
}

interface V1Outcome {
  id?: string;
  label?: string;
  kind?: 'threshold' | 'pool_success' | string;
  comparison?: string;
  value?: number;
  threshold?: number;
  source?: string;
  conditions?: unknown[];
  connector?: 'and' | 'or';
  comment?: string;
}

interface V1Term {
  id?: string;
  count?: number;
  sides?: number;
  tag?: string;
  modifier?: number;
}

interface V1Keep {
  kind: 'highest' | 'lowest';
  count?: number;
}

interface V1Pool {
  terms?: V1Term[];
  keep?: V1Keep;
}

interface V1Parameter {
  id?: string;
  label?: string;
  values?: number[];
  target?: string;
  applyTo?: string;
  targetTermId?: string;
  targetTermIndex?: number;
  targetOutcomeId?: string;
  targetOutcomeIndex?: number;
}

interface V1Config {
  version: number;
  pool?: V1Pool;
  rerollConditions?: RerollCondition[];
  pipeline?: NamedValue[];
  outcomes?: V1Outcome[];
  parameters?: V1Parameter[];
}

interface V3Config {
  version: number;
  outcomes?: Array<{ conditions?: unknown[] } & Record<string, unknown>>;
  pipeline?: NamedValue[];
  pool?: V1Pool;
  rerollConditions?: RerollCondition[];
  parameters?: V1Parameter[];
}

export function saveConfig() {
  const config: SavedConfig = {
    version: 7,
    pool: dicePool.value,
    rerollConditions: rerollConditions.value,
    pipeline: pipeline.value,
    outcomes: outcomes.value,
    parameters: parameters.value,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    configDirty.value = false;
  } catch {
    return;
  }
}

export function loadConfig(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const config = JSON.parse(raw) as V1Config;
    const migrated = migrateConfig(config);
    dicePool.value = migrated.pool;
    rerollConditions.value = migrated.rerollConditions;
    pipeline.value = migrated.pipeline;
    outcomes.value = migrated.outcomes;
    parameters.value = migrated.parameters ?? [];
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
    parameters: parameters.value,
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

export async function readYamlFile(file: File): Promise<string> {
  return await file.text();
}

function migrateOutcomeConditions(outcomes: V1Outcome[]): V1Outcome[] {
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

function migrateConfig(config: V1Config): SavedConfig {
  if (config.version === 7) {
    return config as unknown as SavedConfig;
  }

  if (config.version === 6) {
    const v6 = config as unknown as { pool?: DicePool; rerollConditions?: RerollCondition[]; pipeline?: NamedValue[]; outcomes?: Array<Outcome & { isDefault?: boolean }>; parameters?: Parameter[] };
    const strippedOutcomes: Outcome[] = (v6.outcomes || []).map((o) => {
      const { isDefault: _, ...rest } = o as Outcome & { isDefault?: boolean };
      return rest;
    });
    return {
      version: 7,
      pool: v6.pool ?? { terms: [{ id: crypto.randomUUID(), count: 1, sides: 20, tag: '', comment: '' }] },
      rerollConditions: v6.rerollConditions || [],
      pipeline: v6.pipeline || [],
      outcomes: strippedOutcomes,
      parameters: v6.parameters ?? [],
    };
  }

  if (config.version === 5) {
    interface V5Outcome {
      id?: string;
      name: string;
      source?: string;
      conditions?: OutcomeCondition[];
      connector?: 'and' | 'or';
      comment?: string;
      isDefault?: boolean;
    }
    const v5 = config as unknown as { pool?: DicePool; rerollConditions?: RerollCondition[]; pipeline?: NamedValue[]; outcomes?: V5Outcome[]; parameters?: Parameter[] };
    const migratedOutcomes: Outcome[] = (v5.outcomes || []).map((o) => {
      const src = o.source ?? 'rolled';
      const conditions: OutcomeCondition[] = (o.conditions || []).map((c) => {
        if (c && typeof c === 'object' && 'source' in (c as object)) return c as OutcomeCondition;
        return { ...(c as object), source: src } as OutcomeCondition;
      });
      const { isDefault: _, ...rest } = {
        id: o.id || crypto.randomUUID(),
        name: o.name,
        conditions,
        connector: o.connector ?? 'and',
        comment: o.comment ?? '',
        isDefault: o.isDefault ?? false,
      };
      return rest as Outcome;
    });
    return {
      version: 7,
      pool: (v5.pool as DicePool) ?? { terms: [{ id: crypto.randomUUID(), count: 1, sides: 20, tag: '', comment: '' }] },
      rerollConditions: v5.rerollConditions || [],
      pipeline: v5.pipeline || [],
      outcomes: migratedOutcomes,
      parameters: v5.parameters ?? [],
    };
  }

  if (config.version === 4) {
    const migratedOutcomes = migrateOutcomeConditions(config.outcomes || []);
    const strippedOutcomes = (migratedOutcomes as unknown as Array<Outcome & { isDefault?: boolean }>).map((o) => {
      const { isDefault: _, ...rest } = o;
      return rest;
    });
    return {
      version: 7,
      pool: (config as V1Config).pool as unknown as DicePool,
      rerollConditions: config.rerollConditions || [],
      pipeline: config.pipeline || [],
      outcomes: strippedOutcomes as unknown as Outcome[],
      parameters: config.parameters as unknown as Parameter[] ?? [],
    };
  }

  if (config.version === 3) {
    const v3 = config as unknown as V3Config;
    const migratedPipeline: NamedValue[] = (v3.pipeline || []).map((nv) => {
      const op = nv.op;
      if (typeof op === 'object' && op !== null && 'fn' in op) {
        const fn = (op as { fn: string }).fn;
        if (fn === 'keep_highest') {
          return { ...nv, op: 'max' as const };
        }
        if (fn === 'keep_lowest') {
          return { ...nv, op: 'min' as const };
        }
      }
      return nv;
    });
    return {
      version: 7,
      pool: (v3.pool as unknown as DicePool) ?? { terms: [{ id: crypto.randomUUID(), count: 1, sides: 20, tag: '', comment: '' }] },
      rerollConditions: v3.rerollConditions || [],
      pipeline: migratedPipeline,
      outcomes: ((v3.outcomes as unknown as Outcome[]) || []).map((o) => {
        const { isDefault: _, ...rest } = o as Outcome & { isDefault?: boolean };
        return rest;
      }),
      parameters: v3.parameters as unknown as Parameter[] ?? [],
    };
  }

  const hasOldPool = !!config.pool;
  const pool: DicePool = hasOldPool && config.pool ? {
    terms: (config.pool.terms || []).map((t) => ({
      id: t.id || crypto.randomUUID(),
      count: t.count ?? 1,
      sides: t.sides ?? 6,
      tag: t.tag ?? '',
      comment: '',
    })),
  } : { terms: [{ id: crypto.randomUUID(), count: 1, sides: 20, tag: '', comment: '' }] };

  const rerollConditions: RerollCondition[] = config.rerollConditions || [];

  let pipeline: NamedValue[] = config.pipeline || [];

  let keptStepName: string | null = null;

  if (hasOldPool && config.pool) {
    const oldKeep = config.pool.keep;
    if (oldKeep) {
      const isHighest = oldKeep.kind === 'highest';
      const keepCount: number = oldKeep.count ?? 1;
      if (keepCount === 1) {
        pipeline = [
          {
            id: crypto.randomUUID(),
            name: isHighest ? 'best' : 'worst',
            source: 'rolled',
            op: isHighest ? 'max' as const : 'min' as const,
            comment: '',
          },
          ...pipeline,
        ];
        keptStepName = isHighest ? 'best' : 'worst';
      }
    }

    const totalModifier = (config.pool.terms || []).reduce((s, t) => s + (t.modifier ?? 0), 0);
    if (totalModifier !== 0) {
      const lastVectorSource = keptStepName ?? 'rolled';
      const sumName = keptStepName ? 'kept_sum' : 'total';
      pipeline = [
        ...pipeline,
        {
          id: crypto.randomUUID(),
          name: sumName,
          source: lastVectorSource,
          op: 'sum' as const,
          comment: '',
        },
        {
          id: crypto.randomUUID(),
          name: 'with_mod',
          source: sumName,
          op: { fn: 'add' as const, operand: 'literal' as const, value: totalModifier },
          comment: '',
        },
      ];
    }
  }

  let v4Outcomes: Array<{ id?: string; name: string; source: string; conditions: OutcomeCondition[]; connector: 'and' | 'or'; comment: string }>;
  if (config.outcomes && config.outcomes.length > 0 && config.outcomes[0].kind) {
    v4Outcomes = config.outcomes.map((o, i) => {
      if (o.kind === 'threshold') {
        return {
          id: o.id || crypto.randomUUID(),
          name: o.label || `Outcome ${i + 1}`,
          source: 'rolled',
          conditions: [{ op: o.comparison === '==' ? '=' : o.comparison, value: o.value }] as unknown as OutcomeCondition[],
          connector: 'and' as const,
          comment: '',
        };
      }
      if (o.kind === 'pool_success') {
        return {
          id: o.id || crypto.randomUUID(),
          name: o.label || `Outcome ${i + 1}`,
          source: 'rolled',
          conditions: [{ op: '>=' as const, value: o.threshold || 1 }] as unknown as OutcomeCondition[],
          connector: 'and' as const,
          comment: '',
        };
      }
      return o as unknown as { id?: string; name: string; source: string; conditions: OutcomeCondition[]; connector: 'and' | 'or'; comment: string };
    });
  } else {
    v4Outcomes = (config.outcomes || []) as unknown as typeof v4Outcomes;
  }

  if (hasOldPool && config.pool?.keep && v4Outcomes.length > 0 && keptStepName) {
    for (const o of v4Outcomes) {
      if (o.source === 'rolled') {
        o.source = keptStepName;
      }
    }
  }

  const parameters: Parameter[] = (config.parameters || []).map((p) => {
    let target: ParameterTarget = p.target as ParameterTarget || 'outcome.value';
    if (p.applyTo === 'modifier') target = 'pipeline.literal';
    if (p.applyTo === 'count') target = 'pool.count';
    if (p.target === 'pool.modifier') target = 'pipeline.literal';

    return {
      id: p.id || crypto.randomUUID(),
      label: p.label || 'X',
      values: p.values || [1, 2, 3],
      target,
      targetTermId: p.targetTermId || (p.targetTermIndex !== undefined ? pool.terms[p.targetTermIndex]?.id : undefined),
      targetOutcomeId: p.targetOutcomeId || (p.targetOutcomeIndex !== undefined ? v4Outcomes[p.targetOutcomeIndex]?.id : undefined),
      targetPipelineId: undefined,
    };
  });

  const v4Config = { version: 4, pool, rerollConditions, pipeline, outcomes: v4Outcomes, parameters };
  return migrateConfig(v4Config as V1Config);
}