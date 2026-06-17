import { useEffect, useRef, useState } from 'preact/hooks';
import type { SimResult } from '@/types';
import { filterOutcomes } from '@/utils/outcomes';
import { formatPercent, formatRange, formatDelta } from '@/utils/format';
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
import { OutcomeChart } from '@/components/DistributionChart';

interface ResultDetailsModalProps {
  results: SimResult[];
  onClose: () => void;
}

function getXValues(results: SimResult[]): number[] {
  const seen = new Set<number>();
  for (const r of results) {
    if (r.sweepX !== null && r.sweepX !== undefined) seen.add(r.sweepX);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

function getYValues(results: SimResult[]): number[] {
  const seen = new Set<number>();
  for (const r of results) {
    if (r.sweepY !== null && r.sweepY !== undefined) seen.add(r.sweepY);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

export function ResultDetailsModal({ results, onClose }: ResultDetailsModalProps) {
  const [selectedY, setSelectedY] = useState(0);
  const [selectedX, setSelectedX] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!results || results.length === 0) return null;

  const yValues = getYValues(results);
  const hasY = yValues.length > 0;
  const focusedY = hasY ? yValues[Math.min(selectedY, yValues.length - 1)] ?? yValues[0] : null;
  const yGroup = hasY ? results.filter((r) => r.sweepY === focusedY) : results;
  const xValues = getXValues(yGroup);
  const focusedX = xValues[Math.min(selectedX, xValues.length - 1)] ?? xValues[0];
  const focusedResults = hasY ? yGroup.filter((r) => r.sweepX === focusedX) : (xValues.length > 0 ? yGroup.filter((r) => r.sweepX === focusedX) : yGroup);
  const focused = focusedResults[0] ?? results[0];

  const visibleOutcomes = filterOutcomes(focused.outcomes);
  const dist = distributionStats(focused.distribution);
  const probs = visibleOutcomes.map((o) => o.probability);
  const entropy = shannonEntropy(probs);
  const effective = effectiveOutcomes(probs);
  const overlaps = focused.overlaps;
  const topSets = topMatchSets(focused.matchSets, 10);
  const paramValues = xValues;

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-ink/70 backdrop-blur-sm overflow-y-auto"
      onClick={onBackdrop}
      role="presentation"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
        class="relative w-full max-w-5xl bg-paper border-2 border-billiard shadow-[0_6px_0_0_var(--color-billiard-deep)] my-6"
      >
        <header class="flex items-start justify-between gap-4 px-7 py-5 border-b-2 border-billiard">
          <div>
            <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-1.5">
              Detail
            </p>
            <h2 id="details-modal-title" class="font-display text-[2.25rem] leading-none text-ink tracking-wider">
              Details &amp; Statistics
            </h2>
            <p class="font-mono text-[12px] text-ink-soft mt-2">
              {focused.totalRolls.toLocaleString()} rolls · {visibleOutcomes.length} outcomes
              {hasY ? ` · Y = ${focusedY}` : ''}
              {xValues.length > 0 ? ` · X = ${focusedX}` : ''}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            class="-mt-1 -mr-1 inline-flex items-center justify-center w-10 h-10 text-ink-soft hover:text-billiard focus-visible:outline-2 focus-visible:outline-billiard focus-visible:outline-offset-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" class="w-7 h-7" aria-hidden="true">
              <path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none" />
            </svg>
          </button>
        </header>

        <div class="px-7 py-6 space-y-8 max-h-[calc(90vh-9rem)] overflow-y-auto overscroll-contain">
          {hasY && (
            <section>
              <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-2">
                Sweep Y
              </p>
              <div class="flex flex-wrap gap-1.5">
                {yValues.map((y, i) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setSelectedY(i); setSelectedX(0); }}
                    aria-pressed={i === selectedY}
                    class={`px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] border transition-colors ${
                      i === selectedY
                        ? 'border-billiard bg-billiard text-paper'
                        : 'border-rule text-ink hover:border-billiard hover:text-billiard'
                    }`}
                  >
                    Y = {y}
                  </button>
                ))}
              </div>
            </section>
          )}

          {xValues.length > 1 && (
            <section>
              <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-2">
                Sweep X
              </p>
              <div class="flex flex-wrap gap-1.5">
                {xValues.map((x, i) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setSelectedX(i)}
                    aria-pressed={i === selectedX}
                    class={`px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] border transition-colors ${
                      i === selectedX
                        ? 'border-billiard bg-billiard text-paper'
                        : 'border-rule text-ink hover:border-billiard hover:text-billiard'
                    }`}
                  >
                    X = {x}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-2">
              Outcome Probability
            </p>
            <div style={{ height: '480px' }} class="border border-rule">
              <OutcomeChart result={focused} height={480} />
            </div>
          </section>

          <section>
            <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-3">
              Distribution Shape
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <StatCell label="P05" value={dist.p05.toString()} />
              <StatCell label="P25" value={dist.p25.toString()} />
              <StatCell label="P50 (median)" value={dist.p50.toString()} />
              <StatCell label="P75" value={dist.p75.toString()} />
              <StatCell label="P95" value={dist.p95.toString()} />
              <StatCell label="Mean" value={formatNumber(dist.mean)} />
              <StatCell label="Std Dev" value={formatNumber(dist.stdDev)} />
              <StatCell label="Skewness" value={formatNumber(dist.skewness)} />
            </div>
          </section>

          <section>
            <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-3">
              Outcome Probabilities with 95% Wilson CI
            </p>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="border-b-2 border-billiard">
                    <th scope="col" class="text-left py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Outcome</th>
                    <th scope="col" class="text-right py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Probability</th>
                    <th scope="col" class="text-right py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Count</th>
                    <th scope="col" class="text-right py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOutcomes.map((o) => {
                    const ci = wilsonCI(o.count, focused.totalRolls);
                    return (
                      <tr key={o.label} class="border-b border-rule/60">
                        <td class="py-2.5 font-mono text-[13px] text-ink uppercase tracking-[0.06em]">{o.label}</td>
                        <td class="py-2.5 font-mono tabular text-[14px] text-ink text-right">{formatPercent(o.probability)}</td>
                        <td class="py-2.5 font-mono tabular text-[13px] text-ink-soft text-right">{o.count.toLocaleString()}</td>
                        <td class="py-2.5 font-mono tabular text-[13px] text-ink-soft text-right">{formatRange([ci.lo, ci.hi])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleOutcomes.reduce((s, o) => s + o.probability, 0) > 1.0001 && (
              <p class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
                Overlapping — probabilities sum to {formatPercent(visibleOutcomes.reduce((s, o) => s + o.probability, 0))}
              </p>
            )}
          </section>

          {xValues.length > 1 && (
            <section>
              <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-3">
                Sensitivity per Outcome
              </p>
              <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="border-b-2 border-billiard">
                      <th scope="col" class="text-left py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Outcome</th>
                      <th scope="col" class="text-right py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Marginal Effect / +1</th>
                      <th scope="col" class="text-right py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Break-Even (P = 50%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOutcomes.map((o) => {
                      const me = marginalEffect(yGroup, o.label, paramValues);
                      const be = breakEven(yGroup, o.label, 0.5, paramValues);
                      return (
                        <tr key={o.label} class="border-b border-rule/60">
                          <td class="py-2.5 font-mono text-[13px] text-ink uppercase tracking-[0.06em]">{o.label}</td>
                          <td class="py-2.5 font-mono tabular text-[14px] text-ink text-right">{formatDelta(me)}</td>
                          <td class="py-2.5 font-mono tabular text-[14px] text-ink-soft text-right">
                            {be === null ? '—' : be.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p class="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                Marginal effect is the average per-unit change in probability across consecutive sweep values. Break-even is the interpolated parameter value at which the outcome first reaches 50%.
              </p>
            </section>
          )}

          <section>
            <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-deep mb-3">
              Multi-Label Co-occurrence
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft mb-2">
                  Outcome Entropy
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <StatCell label="Shannon H (bits)" value={formatNumber(entropy)} />
                  <StatCell label="Effective Outcomes" value={formatNumber(effective)} />
                </div>
                <p class="mt-3 font-mono text-[12px] text-ink-soft leading-relaxed">
                  Effective outcomes is 2<sup>H</sup>. A value near 1 means the system is effectively binary; a value near the outcome count means the categories are well separated.
                </p>
              </div>
              <div>
                <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft mb-2">
                  Pairwise Overlaps (Lift)
                </p>
                {overlaps.length === 0 ? (
                  <p class="font-mono text-[12px] text-ink-mute italic">
                    No outcomes co-occur — every roll matches at most one outcome.
                  </p>
                ) : (
                  <div class="space-y-1.5 max-h-48 overflow-y-auto">
                    {overlaps.slice(0, 8).map((ov) => {
                      const a = focused.outcomes.find((o) => o.label === ov.outcomes[0]);
                      const b = focused.outcomes.find((o) => o.label === ov.outcomes[1]);
                      if (!a || !b) return null;
                      const l = lift(a, b, ov.count, focused.totalRolls);
                      return (
                        <div key={`${ov.outcomes[0]}||${ov.outcomes[1]}`} class="flex items-center justify-between font-mono text-[12px] tabular">
                          <span class="text-ink">{ov.outcomes[0]} & {ov.outcomes[1]}</span>
                          <span class="text-ink-soft">
                            {formatPercent(ov.probability)}
                            {l !== null && (
                              <span class={`ml-2 ${l > 1.05 ? 'text-billiard-deep' : l < 0.95 ? 'text-billiard-deep' : 'text-ink-mute'}`}>
                                lift {formatNumber(l, 2)}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div class="mt-6">
              <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft mb-2">
                Top Match-Sets
              </p>
              {topSets.length === 0 ? (
                <p class="font-mono text-[12px] text-ink-mute italic">No match-sets recorded.</p>
              ) : (
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="border-b-2 border-billiard">
                        <th scope="col" class="text-left py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Match-Set</th>
                        <th scope="col" class="text-right py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Count</th>
                        <th scope="col" class="text-right py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft font-normal">Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSets.map((ms) => (
                        <tr key={ms.outcomes.join('|')} class="border-b border-rule/60">
                          <td class="py-2 font-mono text-[13px] text-ink">
                            {ms.outcomes.map((o, i) => (
                              <span key={o}>
                                {i > 0 && <span class="text-ink-mute"> & </span>}
                                <span class="uppercase tracking-[0.06em]">{o}</span>
                              </span>
                            ))}
                          </td>
                          <td class="py-2 font-mono tabular text-[13px] text-ink-soft text-right">{ms.count.toLocaleString()}</td>
                          <td class="py-2 font-mono tabular text-[14px] text-ink text-right">{formatPercent(ms.probability)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer class="px-7 py-4 border-t border-rule font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Monte Carlo · {focused.totalRolls.toLocaleString()} iterations · {visibleOutcomes.length} outcomes
          {hasY ? ` · ${yValues.length} Y values` : ''}
          {xValues.length > 1 ? ` · ${xValues.length} X values` : ''}
        </footer>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div class="border border-rule bg-paper-soft/40 px-3 py-2">
      <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <p class="font-mono tabular text-[16px] text-ink mt-0.5">{value}</p>
    </div>
  );
}

function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}
