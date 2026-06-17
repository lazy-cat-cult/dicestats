import { describe, it, expect } from 'vitest';
import { PRESETS } from '@/domain/presets';
import {
  parsePreset,
  parsePresetFile,
  serializePreset,
  exportConfigAsYaml,
  filenameForName,
  PresetError,
  YamlError,
} from '@/utils/yaml';
import type { PresetConfig, NamedValue, Parameter } from '@/types';

function normalizeIds(config: PresetConfig): PresetConfig {
  const allOutcomeIds = config.outcomes.map(() => 'NORMALIZED');
  const allTermIds = config.pool.terms.map(() => 'NORMALIZED');
  const allPipelineIds = config.pipeline.map(() => 'NORMALIZED');
  const outcomeIdSet = new Set(config.outcomes.map((o) => o.id));
  const termIdSet = new Set(config.pool.terms.map((t) => t.id));
  const pipelineIdSet = new Set(config.pipeline.map((p) => p.id));

  const newPipeline = config.pipeline.map((p, i) => {
    const base: NamedValue = {
      id: allPipelineIds[i]!,
      name: p.name,
      source: p.source,
      op: p.op,
      comment: p.comment,
    } as NamedValue;
    if (pipelineIdSet.has(p.source)) {
      const idx = config.pipeline.findIndex((pp) => pp.id === p.source);
      base.source = allPipelineIds[idx]!;
    }
    if (typeof p.op === 'object' && p.op !== null && 'fn' in p.op) {
      const op = p.op as { operand?: string; source2?: string };
      if (op.operand === 'named' && op.source2 && pipelineIdSet.has(op.source2)) {
        const idx = config.pipeline.findIndex((pp) => pp.id === op.source2);
        (base as { op: unknown }).op = { ...(p.op as object), source2: allPipelineIds[idx]! };
      }
    }
    return base;
  });

  const newOutcomes = config.outcomes.map((o, i) => ({
    ...o,
    id: allOutcomeIds[i]!,
    conditions: o.conditions.map((c) => {
      if (c.source === 'rolled') return c;
      if (outcomeIdSet.has(c.source)) {
        const idx = config.outcomes.findIndex((oo) => oo.id === c.source);
        return { ...c, source: allOutcomeIds[idx]! };
      }
      if (pipelineIdSet.has(c.source)) {
        const idx = config.pipeline.findIndex((pp) => pp.id === c.source);
        return { ...c, source: allPipelineIds[idx]! };
      }
      return c;
    }),
  }));

  const newParams = config.parameters?.map((p) => {
    const cleaned: Parameter = {
      id: 'NORMALIZED',
      label: p.label,
      values: [...p.values],
      target: p.target,
      targetTermId: p.targetTermId,
      targetOutcomeId: p.targetOutcomeId,
      targetPipelineId: p.targetPipelineId,
    };
    delete (cleaned as unknown as { onName?: string | null }).onName;
    delete (cleaned as unknown as { _resolvedName?: string })._resolvedName;
    if (p.targetTermId && termIdSet.has(p.targetTermId)) {
      const idx = config.pool.terms.findIndex((t) => t.id === p.targetTermId);
      cleaned.targetTermId = allTermIds[idx]!;
    }
    if (p.targetOutcomeId && outcomeIdSet.has(p.targetOutcomeId)) {
      const idx = config.outcomes.findIndex((o) => o.id === p.targetOutcomeId);
      cleaned.targetOutcomeId = allOutcomeIds[idx]!;
    }
    if (p.targetPipelineId && pipelineIdSet.has(p.targetPipelineId)) {
      const idx = config.pipeline.findIndex((pp) => pp.id === p.targetPipelineId);
      cleaned.targetPipelineId = allPipelineIds[idx]!;
    }
    return cleaned;
  });

  return {
    id: 'NORMALIZED',
    name: config.name,
    pool: {
      terms: config.pool.terms.map((t, i) => ({ ...t, id: allTermIds[i]! })),
    },
    rerollConditions: config.rerollConditions.map((r) => ({ ...r, id: 'NORMALIZED' })),
    pipeline: newPipeline,
    outcomes: newOutcomes,
    parameters: newParams,
  };
}

describe('yaml serializer pseudolanguage', () => {
  it('round-trips every built-in preset', () => {
    for (const preset of PRESETS) {
      const text = serializePreset(preset);
      const parsed = parsePreset(text);
      expect(normalizeIds(parsed)).toEqual(normalizeIds(preset));
    }
  });

  it('filenameForName slugifies', () => {
    expect(filenameForName('D&D 5e — d20')).toBe('d-d-5e-d20.yaml');
    expect(filenameForName('')).toBe('dice-pool.yaml');
  });

  it('exportConfigAsYaml uses provided name', () => {
    const config = { ...PRESETS[0]! };
    const text = exportConfigAsYaml('Custom', config);
    expect(text).toContain('name: Custom');
  });
});

describe('yaml pool parser', () => {
  it('parses simple pool', () => {
    const cfg = parsePreset('name: Test\npool: 1d20\noutcomes:\n  - Hit when rolled >= 10\n');
    expect(cfg.pool.terms).toHaveLength(1);
    expect(cfg.pool.terms[0]?.count).toBe(1);
    expect(cfg.pool.terms[0]?.sides).toBe(20);
    expect(cfg.pool.terms[0]?.tag).toBe('');
  });

  it('parses pool as YAML list with comments', () => {
    const cfg = parsePreset([
      'name: T',
      'pool:',
      '  - 3d10<normal>  # non-hunger dice',
      '  - 2d10<hunger>',
      'outcomes:',
      '  - F when rolled >= 0',
    ].join('\n'));
    expect(cfg.pool.terms).toHaveLength(2);
    expect(cfg.pool.terms[0]?.tag).toBe('normal');
    expect(cfg.pool.terms[0]?.comment).toBe('non-hunger dice');
    expect(cfg.pool.terms[1]?.tag).toBe('hunger');
    expect(cfg.pool.terms[1]?.comment).toBe('');
  });

  it('parses inline string pool for backwards compat', () => {
    const cfg = parsePreset('name: T\npool: 1d20 + 2d6\noutcomes:\n  - F when rolled >= 0\n');
    expect(cfg.pool.terms).toHaveLength(2);
    expect(cfg.pool.terms[0]?.sides).toBe(20);
    expect(cfg.pool.terms[1]?.sides).toBe(6);
  });

  it('parses tagged multi-term pool', () => {
    const cfg = parsePreset('name: T\npool: 3d10<normal> + 2d10<hunger>\noutcomes:\n  - F when rolled >= 0\n');
    expect(cfg.pool.terms).toHaveLength(2);
    expect(cfg.pool.terms[0]?.tag).toBe('normal');
    expect(cfg.pool.terms[1]?.tag).toBe('hunger');
  });

  it('rejects malformed die notation', () => {
    expect(() => parsePreset('name: T\npool: 1x20\noutcomes:\n  - F when rolled >= 0\n')).toThrow(PresetError);
  });
});

describe('yaml reroll parser', () => {
  it('parses simple explode with max', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10',
      'reroll:',
      '  - explode when face = max up to 5 times',
      'outcomes:',
      '  - F when rolled >= 0',
    ].join('\n'));
    expect(cfg.rerollConditions).toHaveLength(1);
    expect(cfg.rerollConditions[0]?.action).toBe('explode');
    expect(cfg.rerollConditions[0]?.repeat).toBe(5);
    expect(cfg.rerollConditions[0]?.conditions.clauses[0]?.value).toBe('max_value');
  });

  it('parses multi-clause reroll', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10<hunger>',
      'reroll:',
      '  - reroll when tag = hunger and face <= 1',
      'outcomes:',
      '  - F when rolled >= 0',
    ].join('\n'));
    const rc = cfg.rerollConditions[0]!;
    expect(rc.conditions.clauses).toHaveLength(2);
    expect(rc.conditions.clauses[0]?.field).toBe('tag');
    expect(rc.conditions.clauses[1]?.field).toBe('face');
  });
});

describe('yaml pipeline parser', () => {
  it('parses unary scalar fn', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d20',
      'pipeline:',
      '  - best = max rolled',
      '  - total = sum rolled',
      '  - cnt = count rolled',
      'outcomes:',
      '  - F when best >= 0',
    ].join('\n'));
    expect(cfg.pipeline[0]?.op).toBe('max');
    expect(cfg.pipeline[1]?.op).toBe('sum');
    expect(cfg.pipeline[2]?.op).toBe('count');
  });

  it('parses filter', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10',
      'pipeline:',
      '  - hits = filter rolled where face >= 5',
      'outcomes:',
      '  - F when hits >= 0',
    ].join('\n'));
    const p = cfg.pipeline[0]!;
    if (typeof p.op === 'object' && p.op.fn === 'filter') {
      expect(p.op.conditions.clauses[0]?.value).toBe(5);
    } else {
      expect.fail('expected filter op');
    }
  });

  it('parses two-arg max/min', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10<a> + 1d10<b>',
      'pipeline:',
      '  - va = max rolled',
      '  - vb = max va',
      '  - best = max(va, vb)',
      'outcomes:',
      '  - F when best >= 0',
    ].join('\n'));
    const best = cfg.pipeline[2]!;
    if (typeof best.op === 'object' && best.op.fn === 'max' && best.op.operand === 'named') {
      expect(best.op.source2).toBe('vb');
    } else {
      expect.fail('expected named max');
    }
  });

  it('parses ceil/floor', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10',
      'pipeline:',
      '  - x = ceil rolled',
      '  - y = floor x',
      'outcomes:',
      '  - F when y >= 0',
    ].join('\n'));
    expect((cfg.pipeline[0]?.op as { fn: string }).fn).toBe('ceil');
    expect((cfg.pipeline[1]?.op as { fn: string }).fn).toBe('floor');
  });

  it('parses binary operator forms', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10',
      'pipeline:',
      '  - a = sum rolled',
      '  - b = sum rolled',
      '  - c = a + b',
      '  - d = a - b',
      '  - e = a * b',
      '  - f = a / b',
      'outcomes:',
      '  - F when c >= 0',
    ].join('\n'));
    expect((cfg.pipeline[2]?.op as { fn: string }).fn).toBe('add');
    expect((cfg.pipeline[3]?.op as { fn: string }).fn).toBe('subtract');
    expect((cfg.pipeline[4]?.op as { fn: string }).fn).toBe('multiply');
    expect((cfg.pipeline[5]?.op as { fn: string }).fn).toBe('divide');
  });
});

describe('yaml outcome parser', () => {
  it('parses scalar condition', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d20',
      'pipeline:',
      '  - total = sum rolled',
      'outcomes:',
      '  - Hit when total >= 15',
    ].join('\n'));
    expect(cfg.outcomes[0]?.conditions[0]?.op).toBe('>=');
  });

  it('parses dice-pool condition', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 5d6',
      'outcomes:',
      '  - 1+ hits when any rolled >= 5',
      '  - No hits when none rolled >= 5',
    ].join('\n'));
    const c0 = cfg.outcomes[0]?.conditions[0];
    expect(c0?.op).toBe('any');
  });

  it('parses range condition with two clauses', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 2d6',
      'pipeline:',
      '  - total = sum rolled',
      'outcomes:',
      '  - Partial when total >= 7 and total <= 9',
    ].join('\n'));
    expect(cfg.outcomes[0]?.conditions).toHaveLength(2);
  });
});

describe('yaml parameter parser', () => {
  it('parses pool.count default', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 5d6',
      'outcomes:',
      '  - F when rolled >= 0',
      'parameters:',
      '  - Dice count = [1, 2, 3] over pool.count',
    ].join('\n'));
    const p = cfg.parameters![0]!;
    expect(p.target).toBe('pool.count');
    expect(p.targetTermId).toBe(cfg.pool.terms[0]!.id);
  });

  it('requires on for multi-term pool', () => {
    expect(() => parsePreset([
      'name: T',
      'pool: 1d10<a> + 1d10<b>',
      'outcomes:',
      '  - F when rolled >= 0',
      'parameters:',
      '  - X = [1, 2] over pool.count',
    ].join('\n'))).toThrow(/requires/);
  });

  it('resolves on by tag', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d10<a> + 1d10<b>',
      'outcomes:',
      '  - F when rolled >= 0',
      'parameters:',
      '  - X = [1, 2] over pool.count on a',
    ].join('\n'));
    const term = cfg.pool.terms.find((t) => t.tag === 'a')!;
    expect(cfg.parameters![0]?.targetTermId).toBe(term.id);
  });

  it('parses outcome.value with on', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d20',
      'outcomes:',
      '  - Hit when rolled >= 15',
      'parameters:',
      '  - DC = [5, 10] over outcome.value on Hit',
    ].join('\n'));
    expect(cfg.parameters![0]?.targetOutcomeId).toBe(cfg.outcomes[0]!.id);
  });
});

describe('yaml error handling', () => {
  it('errors on unknown step reference', () => {
    expect(() => parsePreset([
      'name: T',
      'pool: 1d20',
      'outcomes:',
      '  - F when no_such_step >= 0',
    ].join('\n'))).toThrow(/unknown source/);
  });

  it('errors on unknown reroll field', () => {
    expect(() => parsePreset([
      'name: T',
      'pool: 1d20',
      'reroll:',
      '  - explode when color = red',
      'outcomes:',
      '  - F when rolled >= 0',
    ].join('\n'))).toThrow(PresetError);
  });

  it('yaml parse error includes line info', () => {
    expect(() => parsePreset('name: Test\npool: 1d20\n  - bad indent\n')).toThrow(YamlError);
  });
});

describe('yaml bundle file', () => {
  it('parses a presets: list and applies the first', () => {
    const list = parsePresetFile([
      'presets:',
      '  - name: A',
      '    pool: 1d20',
      '    outcomes:',
      '      - Hit when rolled >= 10',
      '  - name: B',
      '    pool: 2d6',
      '    outcomes:',
      '      - Roll when rolled >= 7',
    ].join('\n'));
    expect(list).toHaveLength(2);
    expect(list[0]?.name).toBe('A');
    expect(list[1]?.name).toBe('B');
  });
});

describe('yaml outcome parsing', () => {
  it('parses outcomes without default markers', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d20',
      'outcomes:',
      '  - A when rolled >= 10',
      '  - B when rolled < 10',
    ].join('\n'));
    expect(cfg.outcomes).toHaveLength(2);
  });
});

describe('yaml inline comments', () => {
  it('round-trips comments on pipeline, outcome, and reroll', () => {
    const cfg = parsePreset([
      'name: T',
      'pool:',
      '  - 1d20  # the d20',
      'reroll:',
      '  - explode when face = max up to 5 times  # on max',
      'pipeline:',
      '  - total = sum rolled  # sum all',
      'outcomes:',
      '  - Hit when total >= 15  # threshold',
      '  - Miss when total < 15  # catch-all',
    ].join('\n'));
    expect(cfg.pool.terms[0]?.comment).toBe('the d20');
    expect(cfg.rerollConditions[0]?.comment).toBe('on max');
    expect(cfg.pipeline[0]?.comment).toBe('sum all');
    expect(cfg.outcomes[0]?.comment).toBe('threshold');
    expect(cfg.outcomes[1]?.comment).toBe('catch-all');

    const text = serializePreset(cfg);
    expect(text).toMatch(/# the d20/);
    expect(text).toMatch(/# on max/);
    expect(text).toMatch(/# sum all/);
    expect(text).toMatch(/# threshold/);
    expect(text).toMatch(/# catch-all/);
  });

  it('omits comment on round-trip when none was set', () => {
    const cfg = parsePreset([
      'name: T',
      'pool: 1d20',
      'outcomes:',
      '  - Hit when rolled >= 15',
    ].join('\n'));
    const text = serializePreset(cfg);
    expect(text).not.toMatch(/#/);
  });
});

describe('yaml daggerheart template', () => {
  const daggerheartYaml = [
    'name: Daggerheart',
    'pool:',
    '  - 1d12<hope>',
    '  - 1d12<fear>',
    'pipeline:',
    '  - hope_face = filter rolled where tag = hope',
    '  - fear_face = filter rolled where tag = fear',
    '  - hope_value = max hope_face',
    '  - fear_value = max fear_face',
    '  - delta = hope_value - fear_value',
    '  - total = sum rolled',
    '  - total_mod = total + 0',
    'outcomes:',
    '  - Critical Success when delta = 0',
    '  - Success when total_mod >= 15 and delta = 0',
    '  - Failure when total_mod < 15',
    '  - Success with Hope when delta > 0 and total_mod >= 15',
    '  - Success with Fear when delta < 0 and total_mod >= 15',
    '  - Failure with Hope when delta >= 0 and total_mod < 15',
    '  - Failure with Fear when delta < 0 and total_mod < 15',
    'parameters:',
    '  - Modifier = [-2, -1, 0, 1, 2, 3, 4, 5] over pipeline.literal',
  ].join('\n');

  it('parses without error', () => {
    expect(() => parsePreset(daggerheartYaml)).not.toThrow();
  });

  it('has correct pool (1d12<hope>, 1d12<fear>)', () => {
    const cfg = parsePreset(daggerheartYaml);
    expect(cfg.name).toBe('Daggerheart');
    expect(cfg.pool.terms).toHaveLength(2);
    expect(cfg.pool.terms[0]?.sides).toBe(12);
    expect(cfg.pool.terms[0]?.tag).toBe('hope');
    expect(cfg.pool.terms[1]?.sides).toBe(12);
    expect(cfg.pool.terms[1]?.tag).toBe('fear');
  });

  it('pipeline includes total_mod with literal operand', () => {
    const cfg = parsePreset(daggerheartYaml);
    const totalMod = cfg.pipeline.find((p) => p.name === 'total_mod');
    expect(totalMod).toBeDefined();
    expect(totalMod?.source).toBe('total');
    const op = totalMod?.op as { fn: string; operand: string; value: number };
    expect(op.fn).toBe('add');
    expect(op.operand).toBe('literal');
    expect(op.value).toBe(0);
  });

  it('parameter resolves to total_mod pipeline step', () => {
    const cfg = parsePreset(daggerheartYaml);
    expect(cfg.parameters).toHaveLength(1);
    const p = cfg.parameters![0]!;
    expect(p.label).toBe('Modifier');
    expect(p.target).toBe('pipeline.literal');
    expect(p.values).toEqual([-2, -1, 0, 1, 2, 3, 4, 5]);
    const totalMod = cfg.pipeline.find((pp) => pp.name === 'total_mod');
    expect(p.targetPipelineId).toBe(totalMod?.id);
  });

  it('round-trips through serializer', () => {
    const cfg = parsePreset(daggerheartYaml);
    const reserialized = serializePreset(cfg);
    const reparsed = parsePreset(reserialized);
    expect(normalizeIds(reparsed)).toEqual(normalizeIds(cfg));
  });
});
