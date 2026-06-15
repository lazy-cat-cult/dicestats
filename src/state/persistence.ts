import type { SavedConfig } from '@/types';
import type { DicePool, Outcome, Parameter, RerollCondition, NamedValue } from '@/types';
import { dicePool, outcomes, parameters, rerollConditions, pipeline } from './app-state';

const STORAGE_KEY = 'dice-calc-config';

export function saveConfig() {
  const config: SavedConfig = {
version: 5,
    pool: dicePool.value,
    rerollConditions: rerollConditions.value,
    pipeline: pipeline.value,
    outcomes: outcomes.value,
    parameters: parameters.value,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
  }
}

export function loadConfig(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const config = JSON.parse(raw);
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
  }
}

function migrateOutcomeConditions(outcomes: any[]): any[] {
  return outcomes.map((o: any) => ({
    ...o,
    conditions: (o.conditions || []).map((c: any) => {
      if (c === 'none?') {
        return { op: 'none', subCondition: '>=', value: 0 };
      }
      if (c === 'any?') {
        return { op: 'any', subCondition: '>=', value: 0 };
      }
      if (typeof c === 'object' && c.op === 'all?') {
        return { op: 'all', subCondition: c.subCondition, value: c.value };
      }
      return c;
    }),
  }));
}

function migrateConfig(config: any): SavedConfig {
  if (config.version === 5) {
    return config as SavedConfig;
  }

  if (config.version === 4) {
    const outcomes: Outcome[] = migrateOutcomeConditions(config.outcomes || []);
    config.outcomes = outcomes;
    config.version = 5;
    return config as SavedConfig;
  }

  if (config.version === 3) {
    const pipeline: NamedValue[] = (config.pipeline || []).map((nv: any) => {
      const op = nv.op;
      if (typeof op === 'object' && op !== null && 'fn' in op) {
        if (op.fn === 'keep_highest') {
          return { ...nv, op: 'max' as const };
        }
        if (op.fn === 'keep_lowest') {
          return { ...nv, op: 'min' as const };
        }
      }
      return nv;
    });
    config.pipeline = pipeline;
    config.version = 4;
    return config as SavedConfig;
  }

  const hasOldPool = !!config.pool;
  const pool: DicePool = hasOldPool ? {
    terms: (config.pool.terms || []).map((t: any) => ({
      id: t.id || crypto.randomUUID(),
      count: t.count ?? 1,
      sides: t.sides ?? 6,
      tag: t.tag ?? '',
    })),
  } : { terms: [{ id: crypto.randomUUID(), count: 1, sides: 20, tag: '' }] };

  const rerollConditions: RerollCondition[] = config.rerollConditions || [];

  let pipeline: NamedValue[] = config.pipeline || [];

  let keptStepName: string | null = null;

  if (hasOldPool) {
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

    const totalModifier = (config.pool.terms || []).reduce((s: number, t: any) => s + (t.modifier ?? 0), 0);
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

  let outcomes: Outcome[];
  if (config.outcomes && config.outcomes.length > 0 && config.outcomes[0].kind) {
    outcomes = config.outcomes.map((o: any, i: number) => {
      if (o.kind === 'threshold') {
        return {
          id: o.id || crypto.randomUUID(),
          name: o.label || `Outcome ${i + 1}`,
          source: 'rolled',
          conditions: [{ op: o.comparison === '==' ? '=' : o.comparison, value: o.value }],
          connector: 'and',
          comment: '',
          isDefault: false,
        } as Outcome;
      }
      if (o.kind === 'pool_success') {
        return {
          id: o.id || crypto.randomUUID(),
          name: o.label || `Outcome ${i + 1}`,
          source: 'rolled',
          conditions: [{ op: '>=' as const, value: o.threshold || 1 }],
          connector: 'and' as const,
          comment: '',
          isDefault: false,
        } as Outcome;
      }
      return o;
    });
  } else {
    outcomes = (config.outcomes || []).map((o: any) => o);
  }

  if (hasOldPool && config.pool.keep && outcomes.length > 0 && keptStepName) {
    for (const o of outcomes) {
      if (o.source === 'rolled') {
        o.source = keptStepName;
      }
    }
  }

  const parameters: Parameter[] = (config.parameters || []).map((p: any) => {
    let target = p.target || 'outcome.value';
    if (p.applyTo === 'modifier') target = 'pipeline.literal';
    if (p.applyTo === 'count') target = 'pool.count';
    if (p.target === 'pool.modifier') target = 'pipeline.literal';

    return {
      id: p.id || crypto.randomUUID(),
      label: p.label || 'X',
      values: p.values || [1, 2, 3],
      target: target as any,
      targetTermId: p.targetTermId || (p.targetTermIndex !== undefined ? pool.terms[p.targetTermIndex]?.id : undefined),
      targetOutcomeId: p.targetOutcomeId || (p.targetOutcomeIndex !== undefined ? outcomes[p.targetOutcomeIndex]?.id : undefined),
      targetPipelineId: undefined,
    };
  });

  return { version: 4, pool, rerollConditions, pipeline, outcomes, parameters };
}