import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashIdToColor, totalIterations, dicePoolNotation, existingTags, showComments } from '@/state/app-state';
import { sweep, dicePool, resetToDefaults, applyPresetConfig, currentPresetName, setCurrentPresetName } from '@/state/app-state';
import { PRESETS } from '@/domain/presets';
import { literalExpr } from '@/utils/expression';

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

describe('totalIterations', () => {
  it('returns 1,000,000 with no sweep', () => {
    resetToDefaults();
    expect(totalIterations.value).toBe(1_000_000);
  });

  it('multiplies value counts and then by 1,000,000', () => {
    resetToDefaults();
    sweep.value = { x: [1, 2, 3], y: [10, 20] };
    expect(totalIterations.value).toBe(3 * 2 * 1_000_000);
  });
});

describe('dicePoolNotation with sweeps', () => {
  it('shows the unswept notation when there is no sweep', () => {
    resetToDefaults();
    expect(dicePoolNotation.value).toBe('1d20');
  });

  it('renders a swept count as a range', () => {
    resetToDefaults();
    const term = dicePool.value.terms[0]!;
    dicePool.value = {
      terms: [{ ...term, count: { kind: 'ref', name: 'X' } }],
    };
    sweep.value = { x: [1, 2, 3, 4, 5], y: null };
    expect(dicePoolNotation.value).toBe('1..5d20');
  });

  it('renders a swept sides as a range', () => {
    resetToDefaults();
    const term = dicePool.value.terms[0]!;
    dicePool.value = {
      terms: [{ ...term, sides: { kind: 'ref', name: 'X' } }],
    };
    sweep.value = { x: [4, 6, 8], y: null };
    expect(dicePoolNotation.value).toBe('1d{4, 6, 8}');
  });
});

describe('existingTags', () => {
  it('returns the unique sorted non-empty tags from the pool', () => {
    resetToDefaults();
    dicePool.value = { terms: [
      { id: 't1', count: literalExpr(1), sides: literalExpr(6), tag: 'normal', comment: '' },
      { id: 't2', count: literalExpr(1), sides: literalExpr(10), tag: 'hunger', comment: '' },
      { id: 't3', count: literalExpr(1), sides: literalExpr(6), tag: 'normal', comment: '' },
      { id: 't4', count: literalExpr(1), sides: literalExpr(6), tag: '', comment: '' },
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
    const preset = PRESETS[0]!;
    applyPresetConfig(preset);
    expect(currentPresetName.value).toBe(preset.name);
  });

  it('is updated when a different preset is applied', () => {
    const preset1 = PRESETS[0]!;
    const preset2 = PRESETS[1]!;
    applyPresetConfig(preset1);
    expect(currentPresetName.value).toBe(preset1.name);
    applyPresetConfig(preset2);
    expect(currentPresetName.value).toBe(preset2.name);
  });

  it('is cleared when resetToDefaults is called', () => {
    const preset = PRESETS[0]!;
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
