import { describe, it, expect } from 'vitest';
import type { MatchSetCount, OutcomeResult, SimResult } from '@/types';
import {
  wilsonCI,
  distributionStats,
  shannonEntropy,
  effectiveOutcomes,
  marginalEffect,
  breakEven,
  topMatchSets,
  lift,
} from '@/domain/stats';

describe('wilsonCI', () => {
  it('returns approximate [0.469, 0.531] for 500/1000', () => {
    const ci = wilsonCI(500, 1000);
    expect(ci.lo).toBeCloseTo(0.469, 2);
    expect(ci.hi).toBeCloseTo(0.531, 2);
  });

  it('returns lo = 0 for zero count', () => {
    const ci = wilsonCI(0, 1000);
    expect(ci.lo).toBe(0);
  });

  it('returns hi = 1 for total count', () => {
    const ci = wilsonCI(1000, 1000);
    expect(ci.hi).toBe(1);
  });

  it('returns [0, 0] for total = 0', () => {
    const ci = wilsonCI(0, 0);
    expect(ci.lo).toBe(0);
    expect(ci.hi).toBe(0);
  });
});

describe('distributionStats', () => {
  it('returns all percentiles in range for uniform d6', () => {
    const dist: Record<number, number> = { 1: 1000, 2: 1000, 3: 1000, 4: 1000, 5: 1000, 6: 1000 };
    const s = distributionStats(dist);
    expect(s.p25).toBeGreaterThanOrEqual(2);
    expect(s.p25).toBeLessThanOrEqual(3);
    expect(s.p50).toBeGreaterThanOrEqual(3);
    expect(s.p50).toBeLessThanOrEqual(4);
    expect(s.p75).toBeGreaterThanOrEqual(4);
    expect(s.p75).toBeLessThanOrEqual(5);
    expect(s.mean).toBeCloseTo(3.5, 1);
  });

  it('returns zero stats for empty distribution', () => {
    const s = distributionStats({});
    expect(s.mean).toBe(0);
    expect(s.stdDev).toBe(0);
  });

  it('handles a single-value distribution', () => {
    const s = distributionStats({ 17: 1_000_000 });
    expect(s.mean).toBe(17);
    expect(s.p50).toBe(17);
    expect(s.stdDev).toBe(0);
    expect(s.skewness).toBe(0);
  });
});

describe('shannonEntropy / effectiveOutcomes', () => {
  it('returns 2 for a uniform 4-way distribution', () => {
    expect(shannonEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(2, 10);
  });

  it('returns 0 for a single-outcome distribution', () => {
    expect(shannonEntropy([1, 0, 0, 0])).toBe(0);
    expect(effectiveOutcomes([1, 0, 0, 0])).toBe(1);
  });

  it('effectiveOutcomes equals 2^H', () => {
    const p = [0.5, 0.25, 0.125, 0.125];
    expect(effectiveOutcomes(p)).toBeCloseTo(Math.pow(2, shannonEntropy(p)), 10);
  });
});

function makeResult(label: string, probs: Record<string, number>): SimResult {
  const outcomes: OutcomeResult[] = Object.entries(probs).map(([l, p]) => ({
    label: l,
    probability: p,
    count: Math.round(p * 1_000_000),
  }));
  return {
    label,
    outcomes,
    overlaps: [],
    matchSets: [],
    totalRolls: 1_000_000,
    distribution: { 10: 1_000_000 },
  };
}

describe('marginalEffect', () => {
  it('returns 0.10 for a linear sweep', () => {
    const results = [0, 1, 2, 3, 4].map((v) => makeResult(`Mod=${v}`, { Hit: 0.30 + 0.10 * v }));
    const me = marginalEffect(results, 'Hit', [0, 1, 2, 3, 4]);
    expect(me).toBeCloseTo(0.10, 6);
  });

  it('returns 0 for a single-result input', () => {
    const results = [makeResult('', { Hit: 0.5 })];
    expect(marginalEffect(results, 'Hit')).toBe(0);
  });
});

describe('breakEven', () => {
  it('returns interpolated value at exact crossing', () => {
    const results = [0, 1, 2].map((v) => makeResult(`Mod=${v}`, { Hit: 0.40 + 0.10 * v }));
    expect(breakEven(results, 'Hit', 0.5, [0, 1, 2])).toBe(1);
  });

  it('returns null when threshold is never crossed', () => {
    const results = [0, 1, 2].map((v) => makeResult(`Mod=${v}`, { Hit: 0.10 + 0.05 * v }));
    expect(breakEven(results, 'Hit', 0.5, [0, 1, 2])).toBeNull();
  });
});

describe('topMatchSets', () => {
  it('returns at most n entries sorted by descending count', () => {
    const sets: MatchSetCount[] = Array.from({ length: 50 }, (_, i) => ({
      outcomes: [`O${i}`],
      count: 50 - i,
      probability: (50 - i) / 1_000_000,
    }));
    const top = topMatchSets(sets, 10);
    expect(top).toHaveLength(10);
    for (let i = 1; i < top.length; i++) {
      expect((top[i - 1]?.count ?? 0) >= (top[i]?.count ?? 0)).toBe(true);
    }
  });
});

describe('lift', () => {
  it('returns 1 for independent outcomes', () => {
    const a: OutcomeResult = { label: 'A', probability: 0.5, count: 500_000 };
    const b: OutcomeResult = { label: 'B', probability: 0.5, count: 500_000 };
    expect(lift(a, b, 250_000, 1_000_000)).toBeCloseTo(1, 6);
  });

  it('returns 2 for perfectly co-occurring outcomes', () => {
    const a: OutcomeResult = { label: 'A', probability: 0.5, count: 500_000 };
    const b: OutcomeResult = { label: 'B', probability: 0.5, count: 500_000 };
    expect(lift(a, b, 500_000, 1_000_000)).toBeCloseTo(2, 6);
  });

  it('returns null when either probability is zero', () => {
    const a: OutcomeResult = { label: 'A', probability: 0, count: 0 };
    const b: OutcomeResult = { label: 'B', probability: 0.5, count: 500_000 };
    expect(lift(a, b, 0, 1_000_000)).toBeNull();
  });
});
