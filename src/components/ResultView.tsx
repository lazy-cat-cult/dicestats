import type { SimResult } from '@/types';
import { formatPercent } from '@/utils/format';

interface ResultViewProps {
  results: SimResult[];
}

export function ResultView({ results }: ResultViewProps) {
  if (!results || results.length === 0) {
    return <div class="text-gray-500 text-center py-8">No results. Run simulation.</div>;
  }

  const hasParams = results.length > 1 || (results.length === 1 && results[0].label);

  return (
    <div>
      <h2 class="text-lg font-semibold mb-4">Results</h2>
      <p class="text-sm text-gray-500 mb-4">
        Simulation: {(results[0]?.totalRolls ?? 0).toLocaleString()} rolls
      </p>

      {hasParams ? (
        <ParamResults results={results} />
      ) : (
        <SingleResult result={results[0]} />
      )}
    </div>
  );
}

function SingleResult({ result }: { result: SimResult }) {
  return (
    <table class="w-full border-collapse mb-4">
      <thead>
        <tr class="border-b border-gray-300">
          <th class="text-left py-2 text-sm text-gray-600">Outcome</th>
          <th class="text-right py-2 text-sm text-gray-600">Probability</th>
          <th class="text-right py-2 text-sm text-gray-600">Count</th>
        </tr>
      </thead>
      <tbody>
        {result.outcomes.map((o) => (
          <tr key={o.label} class="border-b border-gray-100">
            <td class="py-2 text-sm">{o.label}</td>
            <td class="py-2 text-sm text-right font-mono">{formatPercent(o.probability)}</td>
            <td class="py-2 text-sm text-right text-gray-500 font-mono">{o.count.toLocaleString()}</td>
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
        <p class="text-sm text-gray-600 mb-2">
          {headers.map((h) => `Sweep: ${h} \u2208 {${results.filter((r) => r.label.startsWith(h + '=')).map((r) => r.label.slice(h.length + 1)).join(', ')}}`).join('; ')}
        </p>
      )}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse mb-4">
          <thead>
            <tr class="border-b border-gray-300">
              <th class="text-left py-2 text-sm text-gray-600">Parameter</th>
              {outcomeLabels.map((label) => (
                <th key={label} class="text-right py-2 text-sm text-gray-600">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.label} class="border-b border-gray-100">
                <td class="py-2 text-sm font-mono">{r.label}</td>
                {r.outcomes.map((o) => (
                  <td key={o.label} class="py-2 text-sm text-right font-mono">{formatPercent(o.probability)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}