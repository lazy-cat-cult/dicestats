import type { SimResult } from '@/types';
import { formatPercent } from '@/utils/format';

interface ResultViewProps {
  results: SimResult[];
}

export function ResultView({ results }: ResultViewProps) {
  if (!results || results.length === 0) {
    return <div class="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute py-3">No results.</div>;
  }

  const hasParams = results.length > 1 || (results.length === 1 && results[0].label);

  return (
    <div>
      <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mb-2">
        Simulation · {(results[0]?.totalRolls ?? 0).toLocaleString()} rolls
      </p>

      {hasParams ? <ParamResults results={results} /> : <SingleResult result={results[0]} />}
    </div>
  );
}

function SingleResult({ result }: { result: SimResult }) {
  return (
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-rule">
          <th class="text-left py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Outcome</th>
          <th class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Probability</th>
          <th class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Count</th>
        </tr>
      </thead>
      <tbody>
        {result.outcomes.map((o) => (
          <tr key={o.label} class="border-b border-rule/60">
            <td class="py-2 font-mono text-[12px] text-ink uppercase tracking-[0.06em]">{o.label}</td>
            <td class="py-2 font-mono tabular text-[13px] text-ink text-right">{formatPercent(o.probability)}</td>
            <td class="py-2 font-mono tabular text-[12px] text-ink-mute text-right">{o.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ParamResults({ results }: { results: SimResult[] }) {
  const outcomeLabels = results[0]?.outcomes.map((o) => o.label) ?? [];

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const before = r.label.indexOf('=');
    if (before < 0) continue;
    const head = r.label.slice(0, before);
    if (!seen.has(head)) {
      seen.add(head);
      headers.push(head);
    }
  }

  return (
    <div>
      {headers.length > 0 && (
        <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mb-2">
          {headers.map((h) => `Sweep ${h} ∈ {${results.filter((r) => r.label.startsWith(h + '=')).map((r) => r.label.slice(h.length + 1)).join(', ')}}`).join('; ')}
        </p>
      )}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-rule">
              <th class="text-left py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">Parameter</th>
              {outcomeLabels.map((label) => (
                <th key={label} class="text-right py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-normal">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.label} class="border-b border-rule/60">
                <td class="py-2 font-mono tabular text-[12px] text-ink">{r.label}</td>
                {r.outcomes.map((o) => (
                  <td key={o.label} class="py-2 font-mono tabular text-[12px] text-ink text-right">{formatPercent(o.probability)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
