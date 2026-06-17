import type { SimResult } from '@/types';
import { formatPercent } from '@/utils/format';
import { filterOutcomes } from '@/utils/outcomes';
import { ParameterChart } from '@/components/DistributionChart';

interface ResultViewProps {
  results: SimResult[];
}

function hasYSweep(results: SimResult[]): boolean {
  return results.some((r) => r.sweepY !== null && r.sweepY !== undefined);
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

export function ResultView({ results }: ResultViewProps) {
  if (!results || results.length === 0) {
    return <div class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute py-3">No results.</div>;
  }

  const ySweep = hasYSweep(results);
  const yValues = ySweep ? getYValues(results) : [];
  const xValues = getXValues(results);
  const hasParams = results.length > 1 || (results.length === 1 && results[0].label);
  const firstTotal = results[0]?.totalRolls ?? 0;

  if (ySweep && yValues.length > 0) {
    return (
      <div class="space-y-8">
        <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          Simulation · {firstTotal.toLocaleString()} rolls per value
        </p>
        {yValues.map((y) => {
          const groupResults = results.filter((r) => r.sweepY === y);
          return (
            <div key={y}>
              <div class="border border-rule bg-paper-deep/20 p-3">
                <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-gold-deep mb-2">
                  Y = {y}
                </p>
                <YGroupTable groupResults={groupResults} />
              </div>
              <div class="mt-3">
                <ParameterChart results={groupResults} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mb-2">
        Simulation · {firstTotal.toLocaleString()} rolls
      </p>

      {hasParams ? <ParamResults results={results} xValues={xValues} /> : <SingleResult result={results[0]} />}
    </div>
  );
}

function YGroupTable({ groupResults }: { groupResults: SimResult[] }) {
  const outcomeLabels = filterOutcomes(groupResults[0]?.outcomes ?? []).map((o) => o.label);
  return (
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-rule">
            <th class="text-left py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">X</th>
            {outcomeLabels.map((label) => (
              <th key={label} class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupResults.map((r) => (
            <tr key={r.label} class="border-b border-rule/60">
              <td class="py-2 font-mono tabular text-[12px] text-ink">{r.sweepX !== null && r.sweepX !== undefined ? `X = ${r.sweepX}` : r.label}</td>
              {filterOutcomes(r.outcomes).map((o) => (
                <td key={o.label} class="py-2 font-mono tabular text-[12px] text-ink text-right">{formatPercent(o.probability)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SingleResult({ result }: { result: SimResult }) {
  const visibleOutcomes = filterOutcomes(result.outcomes);
  const sumProb = visibleOutcomes.reduce((s, o) => s + o.probability, 0);
  const hasOverlaps = result.overlaps.length > 0;
  return (
    <div>
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-rule">
            <th class="text-left py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Outcome</th>
            <th class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Probability</th>
            <th class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Count</th>
          </tr>
        </thead>
        <tbody>
          {visibleOutcomes.map((o) => (
            <tr key={o.label} class="border-b border-rule/60">
              <td class="py-2 font-mono text-[12px] text-ink uppercase tracking-[0.06em]">{o.label}</td>
              <td class="py-2 font-mono tabular text-[13px] text-ink text-right">{formatPercent(o.probability)}</td>
              <td class="py-2 font-mono tabular text-[12px] text-ink-mute text-right">{o.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasOverlaps && (
        <p class="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
          Overlapping — probabilities sum to {formatPercent(sumProb)}: {result.overlaps.map((ov) => `${ov.outcomes[0]} & ${ov.outcomes[1]} (${formatPercent(ov.probability)})`).join('; ')}
        </p>
      )}
    </div>
  );
}

function ParamResults({ results, xValues }: { results: SimResult[]; xValues: number[] }) {
  const outcomeLabels = filterOutcomes(results[0]?.outcomes ?? []).map((o) => o.label);

  const anyOverlaps = results.some((r) => r.overlaps.length > 0);
  const firstWithOverlaps = results.find((r) => r.overlaps.length > 0);

  return (
    <div>
      <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mb-2">
        X ∈ {xValues.length > 0 ? `{${xValues.join(', ')}}` : '∅'}
      </p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-rule">
              <th class="text-left py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">X</th>
              {outcomeLabels.map((label) => (
                <th key={label} class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.label} class="border-b border-rule/60">
                <td class="py-2 font-mono tabular text-[12px] text-ink">{r.sweepX !== null && r.sweepX !== undefined ? `X = ${r.sweepX}` : r.label}</td>
                {filterOutcomes(r.outcomes).map((o) => (
                  <td key={o.label} class="py-2 font-mono tabular text-[12px] text-ink text-right">{formatPercent(o.probability)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anyOverlaps && firstWithOverlaps && (
        <p class="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
          Overlapping — sum {formatPercent(filterOutcomes(firstWithOverlaps.outcomes).reduce((s, o) => s + o.probability, 0))}: {firstWithOverlaps.overlaps.map((ov) => `${ov.outcomes[0]} & ${ov.outcomes[1]} (${formatPercent(ov.probability)})`).join('; ')}
        </p>
      )}
    </div>
  );
}