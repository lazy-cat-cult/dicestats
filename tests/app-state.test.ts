import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashIdToColor, activeSweepsByTarget, totalIterations, dicePoolNotation, existingTags, showComments } from '@/state/app-state';
import { parameters, dicePool, resetToDefaults, applyPresetConfig, currentPresetName, setCurrentPresetName } from '@/state/app-state';
import { PRESETS } from '@/domain/presets';
import type { Parameter } from '@/types';

describe('hashIdToColor', () => {
  it('returns a valid color from the palette for any non-empty id', () => {
    const c = hashIdToColor('abc');
    expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns a stable color for the same id', () => {
    expect(hashIdToColor('parameter-1')).toBe(hashIdToColor('parameter-1'));
  });

  it('returns different colors for different ids in most cases', () => {
    const colors = new Set([
      hashIdToColor('a'),
      hashIdToColor('b'),
      hashIdToColor('c'),
      hashIdToColor('d'),
      hashIdToColor('e'),
      hashIdToColor('f'),
      hashIdToColor('g'),
      hashIdToColor('h'),
    ]);
    expect(colors.size).toBeGreaterThan(1);
  });

  it('returns a fallback for an empty id', () => {
    expect(hashIdToColor('')).toBe('#6b7280');
  });
});

describe('activeSweepsByTarget', () => {
  it('builds a map keyed by target:targetId', () => {
    resetToDefaults();
    const term = dicePool.value.terms[0];
    const p: Parameter = {
      id: 'p1',
      label: 'Count',
      values: [1, 2, 3],
      target: 'pool.count',
      targetTermId: term.id,
    };
    parameters.value = [p];
    const m = activeSweepsByTarget.value;
    expect(m.get(`pool.count:${term.id}`)).toBeDefined();
    expect(m.get(`pool.count:${term.id}`)?.id).toBe('p1');
  });

  it('reacts to parameter list changes', () => {
    resetToDefaults();
    expect(activeSweepsByTarget.value.size).toBe(0);
    const term = dicePool.value.terms[0];
    parameters.value = [
      { id: 'p1', label: 'A', values: [1, 2], target: 'pool.count', targetTermId: term.id },
    ];
    expect(activeSweepsByTarget.value.size).toBe(1);
    parameters.value = [];
    expect(activeSweepsByTarget.value.size).toBe(0);
  });
});

describe('totalIterations', () => {
  it('returns 1,000,000 with no parameters', () => {
    resetToDefaults();
    expect(totalIterations.value).toBe(1_000_000);
  });

  it('multiplies value counts and then by 1,000,000', () => {
    resetToDefaults();
    parameters.value = [
      { id: 'a', label: 'A', values: [1, 2, 3], target: 'pool.count' },
      { id: 'b', label: 'B', values: [10, 20], target: 'pool.count' },
    ];
    expect(totalIterations.value).toBe(3 * 2 * 1_000_000);
  });
});

describe('dicePoolNotation with sweeps', () => {
  it('shows the unswept notation when there are no parameters', () => {
    resetToDefaults();
    expect(dicePoolNotation.value).toBe('1d20');
  });

  it('renders a swept count as a range', () => {
    resetToDefaults();
    const term = dicePool.value.terms[0];
    parameters.value = [
      { id: 'p', label: 'Count', values: [1, 2, 3, 4, 5], target: 'pool.count', targetTermId: term.id },
    ];
    expect(dicePoolNotation.value).toBe('1..5d20');
  });

  it('renders a swept sides as a range', () => {
    resetToDefaults();
    const term = dicePool.value.terms[0];
    parameters.value = [
      { id: 'p', label: 'Sides', values: [4, 6, 8], target: 'pool.sides', targetTermId: term.id },
    ];
    expect(dicePoolNotation.value).toBe('1d{4, 6, 8}');
  });
});

describe('existingTags', () => {
  it('returns the unique sorted non-empty tags from the pool', () => {
    resetToDefaults();
    dicePool.value = { terms: [
      { id: 't1', count: 1, sides: 6, tag: 'normal', comment: '' },
      { id: 't2', count: 1, sides: 10, tag: 'hunger', comment: '' },
      { id: 't3', count: 1, sides: 6, tag: 'normal', comment: '' },
      { id: 't4', count: 1, sides: 6, tag: '', comment: '' },
    ] };
    expect(existingTags.value).toEqual(['hunger', 'normal']);
  });
});

describe('showComments persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('persists changes to localStorage under dice-calc-ui', async () => {
    showComments.value = true;
    await new Promise((r) => setTimeout(r, 0));
    const raw = localStorage.getItem('dice-calc-ui');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).showComments).toBe(true);
  });
});

describe('currentPresetName', () => {
  beforeEach(() => {
    resetToDefaults();
  });

  it('is null after resetToDefaults', () => {
    expect(currentPresetName.value).toBeNull();
  });

  it('is set to preset name when applyPresetConfig is called', () => {
    const preset = PRESETS[0];
    applyPresetConfig(preset);
    expect(currentPresetName.value).toBe(preset.name);
  });

  it('is updated when a different preset is applied', () => {
    const preset1 = PRESETS[0];
    const preset2 = PRESETS[1];
    applyPresetConfig(preset1);
    expect(currentPresetName.value).toBe(preset1.name);
    applyPresetConfig(preset2);
    expect(currentPresetName.value).toBe(preset2.name);
  });

  it('is cleared when resetToDefaults is called', () => {
    const preset = PRESETS[0];
    applyPresetConfig(preset);
    expect(currentPresetName.value).toBe(preset.name);
    resetToDefaults();
    expect(currentPresetName.value).toBeNull();
  });
});

describe('setCurrentPresetName', () => {
  beforeEach(() => {
    resetToDefaults();
  });

  it('sets a non-empty string', () => {
    setCurrentPresetName('My Custom Roll');
    expect(currentPresetName.value).toBe('My Custom Roll');
  });

  it('clears the name when set to null', () => {
    setCurrentPresetName('My Custom Roll');
    setCurrentPresetName(null);
    expect(currentPresetName.value).toBeNull();
  });

  it('coerces an empty string to null', () => {
    setCurrentPresetName('My Custom Roll');
    setCurrentPresetName('');
    expect(currentPresetName.value).toBeNull();
  });
});
