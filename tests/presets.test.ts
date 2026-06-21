import { describe, it, expect } from 'vitest';
import { PRESETS, getPreset } from '@/domain/presets';

describe('PRESETS', () => {
  it('has D&D preset', () => {
    const dnd = PRESETS.find((p) => p.name === 'D&D 5e');
    expect(dnd).toBeDefined();
    expect(dnd!.name).toContain('D&D');
    expect(dnd!.pool.terms[0]!.sides).toEqual({ kind: 'literal', value: 20 });
  });

  it('has PbtA preset', () => {
    const pbta = PRESETS.find((p) => p.name === 'PbtA');
    expect(pbta).toBeDefined();
    expect(pbta!.pool.terms[0]!.sides).toEqual({ kind: 'literal', value: 6 });
    expect(pbta!.pool.terms[0]!.count).toEqual({ kind: 'literal', value: 2 });
    expect(pbta!.outcomes.length).toBeGreaterThanOrEqual(2);
  });

  it('has advantage preset with max pipeline', () => {
    const adv = PRESETS.find((p) => p.name === 'D&D 5e - Advantage');
    expect(adv).toBeDefined();
    expect(adv!.pipeline.length).toBeGreaterThan(0);
    const maxStep = adv!.pipeline[0]!;
    expect(maxStep.name).toBe('rolled_value');
    expect(maxStep.op).toBe('max');
  });

  it('has Shadowrun preset with dice conditions', () => {
    const sr = getPreset('shadowrun-xd6');
    expect(sr).toBeDefined();
    expect(sr!.outcomes.length).toBeGreaterThanOrEqual(2);
    const hitOutcome = sr!.outcomes.find((o) => o.name === '1+ hits');
    expect(hitOutcome).toBeDefined();
    expect(hitOutcome!.conditions[0]).toEqual({ source: 'rolled', op: 'any', subCondition: '>=', value: { kind: 'literal', value: 5 } });
  });

  it('has Vampire V5 preset', () => {
    const v = getPreset('vampire-v5');
    expect(v).toBeDefined();
    expect(v!.pool.terms.some((t) => t.tag === 'hunger')).toBe(true);
    expect(v!.pipeline.length).toBeGreaterThan(3);
  });

  it('has Daggerheart preset', () => {
    const dh = PRESETS.find((p) => p.name === 'Daggerheart');
    expect(dh).toBeDefined();
    expect(dh!.pool.terms).toHaveLength(2);
    expect(dh!.pool.terms.some((t) => t.tag === 'hope')).toBe(true);
    expect(dh!.pool.terms.some((t) => t.tag === 'fear')).toBe(true);
    expect(dh!.outcomes.length).toBeGreaterThanOrEqual(3);
  });

  it('has Cyberpunk RED preset', () => {
    const cp = PRESETS.find((p) => p.name === 'Cyberpunk RED');
    expect(cp).toBeDefined();
    expect(cp!.pool.terms.some((t) => t.tag === 'main')).toBe(true);
    expect(cp!.pool.terms.some((t) => t.tag === 'crit')).toBe(true);
    expect(cp!.sweep.x.length).toBeGreaterThan(0);
  });

  it('has Blades in the Dark preset with critical detection', () => {
    const b = PRESETS.find((p) => p.name === 'Blades in the Dark');
    expect(b).toBeDefined();
    expect(b!.pool.terms[0]!.sides).toEqual({ kind: 'literal', value: 6 });
    const crit = b!.outcomes.find((o) => o.name === 'Critical');
    expect(crit).toBeDefined();
    expect(b!.sweep.x.length).toBeGreaterThan(0);
  });

  it('has Savage Worlds preset with trait and wild dice', () => {
    const sw = getPreset('savage-worlds');
    expect(sw).toBeDefined();
    expect(sw!.pool.terms.some((t) => t.tag === 'trait')).toBe(true);
    expect(sw!.pool.terms.some((t) => t.tag === 'wild')).toBe(true);
    expect(sw!.rerollConditions.length).toBeGreaterThan(0);
    expect(sw!.rerollConditions[0]!.action).toBe('explode');
    expect(sw!.sweep.x.length).toBeGreaterThan(0);
  });

  it('all presets have valid pools', () => {
    for (const preset of PRESETS) {
      expect(preset.pool.terms.length).toBeGreaterThan(0);
      for (const term of preset.pool.terms) {
        const sidesVal = term.sides.kind === 'literal' ? term.sides.value : 1;
        const countVal = term.count.kind === 'literal' ? term.count.value : 1;
        expect(sidesVal).toBeGreaterThan(0);
        expect(countVal).toBeGreaterThan(0);
        expect(term.id).toBeTruthy();
      }
    }
  });

  it('all presets have at least one outcome', () => {
    for (const preset of PRESETS) {
      expect(preset.outcomes.length).toBeGreaterThan(0);
    }
  });

  it('no preset has modifier or keep on pool', () => {
    for (const preset of PRESETS) {
      expect('keep' in preset.pool).toBe(false);
      for (const term of preset.pool.terms) {
        expect('modifier' in term).toBe(false);
      }
    }
  });

  it('every condition has a source field (per-condition source)', () => {
    for (const preset of PRESETS) {
      for (const outcome of preset.outcomes) {
        for (const cond of outcome.conditions) {
          expect(typeof (cond as { source?: string }).source).toBe('string');
        }
      }
    }
  });
});
