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

  it('has Shadowrun preset with pipeline', () => {
    const sr = getPreset('shadowrun-xd6');
    expect(sr).toBeDefined();
    expect(sr!.pipeline.length).toBeGreaterThan(0);
    expect(sr!.pipeline[0].name).toBe('hits');
  });

  it('has Vampire V5 preset', () => {
    const v = getPreset('vampire-v5');
    expect(v).toBeDefined();
    expect(v!.pool.terms.some((t) => t.tag === 'hunger')).toBe(true);
    expect(v!.pipeline.length).toBeGreaterThan(3);
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