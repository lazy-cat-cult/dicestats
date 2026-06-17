import type { MatchSetCount, OutcomeResult, SimResult } from '@/types';

const Z_95 = 1.96;

export function wilsonCI(count: number, total: number, z: number = Z_95): { lo: number; hi: number } {
  if (total <= 0) return { lo: 0, hi: 0 };
  const p = count / total;
  const denom = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return {
    lo: Math.max(0, (centre - margin) / denom),
    hi: Math.min(1, (centre + margin) / denom),
  };
}

export interface DistributionSummary {
  p05: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean: number;
  stdDev: number;
  skewness: number;
}

export function distributionStats(distribution: Record<number, number>): DistributionSummary {
  const keys = Object.keys(distribution).map(Number).filter((k) => Number.isFinite(k));
  if (keys.length === 0) {
    return { p05: 0, p25: 0, p50: 0, p75: 0, p95: 0, mean: 0, stdDev: 0, skewness: 0 };
  }

  const total = keys.reduce((s, k) => s + (distribution[k] ?? 0), 0);
  if (total <= 0) {
    const k0 = keys[0] ?? 0;
    return { p05: k0, p25: k0, p50: k0, p75: k0, p95: k0, mean: k0, stdDev: 0, skewness: 0 };
  }

  const sortedKeys = [...keys].sort((a, b) => a - b);
  const cum: number[] = [];
  let acc = 0;
  for (const k of sortedKeys) {
    acc += distribution[k] ?? 0;
    cum.push(acc);
  }
  const quantile = (q: number): number => {
    const target = q * total;
    for (let i = 0; i < sortedKeys.length; i++) {
      if ((cum[i] ?? 0) >= target) return sortedKeys[i] ?? 0;
    }
    return sortedKeys[sortedKeys.length - 1] ?? 0;
  };

  const mean = keys.reduce((s, k) => s + k * (distribution[k] ?? 0), 0) / total;
  const variance = keys.reduce((s, k) => s + (k - mean) * (k - mean) * (distribution[k] ?? 0), 0) / total;
  const stdDev = Math.sqrt(variance);
  const skewness = stdDev > 0
    ? keys.reduce((s, k) => s + Math.pow((k - mean) / stdDev, 3) * (distribution[k] ?? 0), 0) / total
    : 0;

  return {
    p05: quantile(0.05),
    p25: quantile(0.25),
    p50: quantile(0.5),
    p75: quantile(0.75),
    p95: quantile(0.95),
    mean,
    stdDev,
    skewness,
  };
}

export function shannonEntropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

export function effectiveOutcomes(probs: number[]): number {
  return Math.pow(2, shannonEntropy(probs));
}

function paramValuesForSweep(results: SimResult[]): number[] {
  return results.map((r) => {
    const eq = r.label.indexOf('=');
    if (eq < 0) return 0;
    const n = Number(r.label.slice(eq + 1));
    return Number.isFinite(n) ? n : 0;
  });
}

export function marginalEffect(results: SimResult[], outcomeLabel: string, paramValues?: number[]): number {
  if (results.length < 2) return 0;
  const values = paramValues ?? paramValuesForSweep(results);
  const probs = results.map((r) => r.outcomes.find((o) => o.label === outcomeLabel)?.probability ?? 0);
  let totalDelta = 0;
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    const dv = values[i] - values[i - 1];
    if (dv === 0) continue;
    totalDelta += (probs[i] - probs[i - 1]) / dv;
    count++;
  }
  return count === 0 ? 0 : totalDelta / count;
}

export function breakEven(results: SimResult[], outcomeLabel: string, threshold: number = 0.5, paramValues?: number[]): number | null {
  if (results.length < 2) return null;
  const values = paramValues ?? paramValuesForSweep(results);
  const probs = results.map((r) => r.outcomes.find((o) => o.label === outcomeLabel)?.probability ?? 0);

  for (let i = 1; i < values.length; i++) {
    const p0 = probs[i - 1] ?? 0;
    const p1 = probs[i] ?? 0;
    if ((p0 - threshold) * (p1 - threshold) <= 0 && p0 !== p1) {
      const t = (threshold - p0) / (p1 - p0);
      return values[i - 1] + t * (values[i] - values[i - 1]);
    }
  }
  return null;
}

export function topMatchSets(matchSets: MatchSetCount[], n: number = 10): MatchSetCount[] {
  return [...matchSets].sort((a, b) => b.count - a.count).slice(0, n);
}

export function lift(outcomeA: OutcomeResult, outcomeB: OutcomeResult, coCount: number, total: number): number | null {
  if (total <= 0) return null;
  const pA = outcomeA.probability;
  const pB = outcomeB.probability;
  if (pA <= 0 || pB <= 0) return null;
  const pAB = coCount / total;
  return pAB / (pA * pB);
}
