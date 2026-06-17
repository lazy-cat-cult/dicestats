import type { SimResult } from '@/types';
import { useEffect, useRef } from 'preact/hooks';
import { filterOutcomes } from '@/utils/outcomes';

const INK = '#16241C';
const INK_SOFT = '#5A6B5E';
const BILLIARD = '#2F7A4D';
const GOLD = '#C9A646';
const RULE = '#D6CFB6';
const PAPER = '#FAF8F2';

const PALETTE = [BILLIARD, GOLD, INK, '#A86A3D', '#3F6FA0', '#7A4A8B', '#B86A4D', '#3D7A6F'];

interface OutcomeChartProps {
  result: SimResult;
  height?: number;
}

export function OutcomeChart({ result, height = 260 }: OutcomeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<InstanceType<typeof import('chart.js/auto').Chart> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;

    import('chart.js/auto').then(({ Chart }) => {
      if (destroyed) return;

      const visibleOutcomes = filterOutcomes(result.outcomes);
      const labels = visibleOutcomes.map((o) => o.label);
      const probabilities = visibleOutcomes.map((o) => o.probability);

      const existingChart = Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();

      chartRef.current = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Probability',
              data: probabilities,
              backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length] ?? BILLIARD),
              borderColor: PAPER,
              borderWidth: 0,
              borderRadius: 0,
              barPercentage: 0.7,
              categoryPercentage: 0.85,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 320, easing: 'easeOutCubic' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: PAPER,
              titleColor: INK,
              bodyColor: INK,
              borderColor: GOLD,
              borderWidth: 1,
              titleFont: { family: 'JetBrains Mono', size: 11, weight: 500 },
              bodyFont: { family: 'JetBrains Mono', size: 11 },
              padding: 8,
              displayColors: false,
              callbacks: {
                label: (ctx) => ` ${((ctx.parsed.y ?? 0) * 100).toFixed(2)}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false, color: RULE },
              ticks: {
                color: INK_SOFT,
                font: { family: 'JetBrains Mono', size: 10 },
              },
              border: { color: RULE },
            },
            y: {
              title: { display: false },
              beginAtZero: true,
              max: 1,
              grid: { color: RULE },
              border: { display: false },
              ticks: {
                color: INK_SOFT,
                font: { family: 'JetBrains Mono', size: 10 },
                callback: (v: number | string) => `${(Number(v) * 100).toFixed(0)}%`,
              },
            },
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [result]);

  return (
    <div class="relative" style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

interface ParameterChartProps {
  results: SimResult[];
}

export function ParameterChart({ results }: ParameterChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<InstanceType<typeof import('chart.js/auto').Chart> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || results.length === 0) return;

    let destroyed = false;

    import('chart.js/auto').then(({ Chart }) => {
      if (destroyed) return;

      const visibleOutcomes = filterOutcomes(results[0].outcomes);
      const outcomeLabels = visibleOutcomes.map((o) => o.label);
      const paramLabels = results.map((r) => r.label);

      const datasets = outcomeLabels.map((label, i) => {
        const color = PALETTE[i % PALETTE.length] ?? BILLIARD;
        return {
          label,
          data: results.map((r) => {
            const outcome = r.outcomes.find((o) => o.label === label);
            return outcome ? outcome.probability : 0;
          }),
          borderColor: color,
          backgroundColor: color + '22',
          borderWidth: 2,
          fill: false,
          tension: 0.15,
          pointRadius: 2.5,
          pointHoverRadius: 4,
          pointBackgroundColor: INK,
          pointBorderWidth: 1.5,
        };
      });

      const existingChart = Chart.getChart(canvas);
      if (existingChart) existingChart.destroy();

      chartRef.current = new Chart(canvas, {
        type: 'line',
        data: { labels: paramLabels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 320, easing: 'easeOutCubic' },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: INK_SOFT,
                font: { family: 'JetBrains Mono', size: 10 },
                boxWidth: 10,
                boxHeight: 10,
                padding: 12,
              },
            },
            tooltip: {
              backgroundColor: PAPER,
              titleColor: INK,
              bodyColor: INK,
              borderColor: GOLD,
              borderWidth: 1,
              titleFont: { family: 'JetBrains Mono', size: 11, weight: 500 },
              bodyFont: { family: 'JetBrains Mono', size: 11 },
              padding: 8,
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${((ctx.parsed?.y ?? 0) * 100).toFixed(2)}%`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false, color: RULE },
              ticks: {
                color: INK_SOFT,
                font: { family: 'JetBrains Mono', size: 10 },
              },
              border: { color: RULE },
            },
            y: {
              title: { display: false },
              beginAtZero: true,
              grid: { color: RULE },
              border: { display: false },
              ticks: {
                color: INK_SOFT,
                font: { family: 'JetBrains Mono', size: 10 },
                callback: (v: number | string) => `${(Number(v) * 100).toFixed(0)}%`,
              },
            },
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [results]);

  return (
    <div class="relative" style={{ height: '300px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
