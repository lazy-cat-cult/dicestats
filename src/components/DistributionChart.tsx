import type { SimResult } from '@/types';
import { useEffect, useRef } from 'preact/hooks';

interface OutcomeChartProps {
  result: SimResult;
}

export function OutcomeChart({ result }: OutcomeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;

    import('chart.js/auto').then(({ Chart }) => {
      if (destroyed) return;

      const labels = result.outcomes.map((o) => o.label);
      const probabilities = result.outcomes.map((o) => o.probability);

      const colors = [
        'rgba(99, 102, 241, 0.7)',
        'rgba(234, 179, 8, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(14, 165, 233, 0.7)',
        'rgba(249, 115, 22, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(20, 184, 166, 0.7)',
        'rgba(107, 114, 128, 0.7)',
      ];

      const existingChart = Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();

      new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Probability',
              data: probabilities,
              backgroundColor: labels.map((_, i) => colors[i % colors.length]),
              borderColor: labels.map((_, i) => colors[i % colors.length].replace('0.7', '1')),
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${((ctx.parsed.y ?? 0) * 100).toFixed(2)}%`,
              },
            },
          },
          scales: {
            y: {
              title: { display: true, text: 'Probability' },
              beginAtZero: true,
              max: 1,
              ticks: {
                callback: (v: number | string) => `${(Number(v) * 100).toFixed(0)}%`,
              },
            },
          },
        },
      });
    });

    return () => { destroyed = true; };
  }, [result]);

  return (
    <div class="relative" style={{ height: '300px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

interface ParameterChartProps {
  results: SimResult[];
}

export function ParameterChart({ results }: ParameterChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || results.length === 0) return;

    let destroyed = false;

    import('chart.js/auto').then(({ Chart }) => {
      if (destroyed) return;

      const outcomeLabels = results[0].outcomes.map((o) => o.label);
      const paramLabels = results.map((r) => r.label);

      const colors = [
        'rgba(99, 102, 241, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
      ];

      const datasets = outcomeLabels.map((label, i) => ({
        label,
        data: results.map((r) => {
          const outcome = r.outcomes.find((o) => o.label === label);
          return outcome ? outcome.probability : 0;
        }),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length].replace('0.8', '0.2'),
        borderWidth: 2,
        fill: false,
        tension: 0.2,
      }));

      const existingChart = Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();

      new Chart(canvas, {
        type: 'line',
        data: { labels: paramLabels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${((ctx.parsed?.y ?? 0) * 100).toFixed(2)}%`,
              },
            },
          },
          scales: {
            y: {
              title: { display: true, text: 'Probability' },
              ticks: {
                callback: (v: number | string) => `${(Number(v) * 100).toFixed(0)}%`,
              },
            },
          },
        },
      });
    });

    return () => { destroyed = true; };
  }, [results]);

  return (
    <div class="relative" style={{ height: '300px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}