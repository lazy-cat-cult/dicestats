import { describe, it, expect } from 'vitest';
import { PRESETS, getPreset } from '@/domain/presets';

describe('PRESETS', () => {
  it('has D&D preset', () => {
    const dnd = getPreset('dnd-d20');
    expect(dnd).toBeDefined();
    expect(dnd!.name).toContain('D&D');
    expect(dnd!.pool.terms[0].sides).toBe(20);
  });

  it('has PbtA preset', () => {
    const pbta = getPreset('pbta-2d6');
    expect(pbta).toBeDefined();
    expect(pbta!.pool.terms[0].sides).toBe(6);
    expect(pbta!.pool.terms[0].count).toBe(2);
    expect(pbta!.outcomes.length).toBeGreaterThanOrEqual(2);
  });

  it('has advantage preset with max pipeline', () => {
    const adv = getPreset('dnd-advantage');
    expect(adv).toBeDefined();
    expect(adv!.pipeline.length).toBeGreaterThan(0);
    const maxStep = adv!.pipeline[0];
    expect(maxStep.name).toBe('best');
    expect(maxStep.op).toBe('max');
  });

  it('has Shadowrun preset with dice conditions', () => {
    const sr = getPreset('shadowrun-xd6');
    expect(sr).toBeDefined();
    expect(sr!.outcomes.length).toBeGreaterThanOrEqual(2);
    const hitOutcome = sr!.outcomes.find((o) => o.name === '1+ hits');
    expect(hitOutcome).toBeDefined();
    expect(hitOutcome!.conditions[0]).toEqual({ op: 'any', subCondition: '>=', value: 5 });
  });

  it('has Vampire V5 preset', () => {
    const v = getPreset('vampire-v5');
    expect(v).toBeDefined();
    expect(v!.pool.terms.some((t) => t.tag === 'hunger')).toBe(true);
    expect(v!.pipeline.length).toBeGreaterThan(3);
  });

  it('has Daggerheart Duality preset', () => {
    const dh = getPreset('daggerheart-duality');
    expect(dh).toBeDefined();
    expect(dh!.pool.terms).toHaveLength(2);
    expect(dh!.pool.terms.some((t) => t.tag === 'hope')).toBe(true);
    expect(dh!.pool.terms.some((t) => t.tag === 'fear')).toBe(true);
    expect(dh!.outcomes.length).toBeGreaterThanOrEqual(3);
  });

  it('has Cyberpunk RED check preset', () => {
    const cp = getPreset('cyberpunk-red-check');
    expect(cp).toBeDefined();
    expect(cp!.pool.terms[0].sides).toBe(10);
    expect(cp!.pool.terms[0].count).toBe(2);
    expect(cp!.parameters?.some((p) => p.label === 'DV')).toBe(true);
  });

  it('has Blades in the Dark preset with critical detection', () => {
    const b = getPreset('blades-in-the-dark');
    expect(b).toBeDefined();
    expect(b!.pool.terms[0].sides).toBe(6);
    const crit = b!.outcomes.find((o) => o.name === 'Critical');
    expect(crit).toBeDefined();
    expect(b!.parameters?.some((p) => p.target === 'pool.count')).toBe(true);
  });

  it('has Savage Worlds preset with trait and wild dice', () => {
    const sw = getPreset('savage-worlds');
    expect(sw).toBeDefined();
    expect(sw!.pool.terms.some((t) => t.tag === 'trait')).toBe(true);
    expect(sw!.pool.terms.some((t) => t.tag === 'wild')).toBe(true);
    expect(sw!.rerollConditions.length).toBeGreaterThan(0);
    expect(sw!.rerollConditions[0].action).toBe('explode');
    expect(sw!.parameters?.some((p) => p.target === 'pool.sides')).toBe(true);
  });

  it('all presets have valid pools', () => {
    for (const preset of PRESETS) {
      expect(preset.pool.terms.length).toBeGreaterThan(0);
      for (const term of preset.pool.terms) {
        expect(term.sides).toBeGreaterThan(0);
        expect(term.count).toBeGreaterThan(0);
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
});