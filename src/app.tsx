import { signal } from '@preact/signals';
import type { SimResult, SimJob } from '@/types';
import {
  dicePool,
  rerollConditions,
  pipeline,
  outcomes,
  parameters,
  isSimulating,
  simProgress,
  totalIterations,
  confirmedHighCost,
  configDirty,
  showComments,
} from '@/state/app-state';
import { PresetSelector } from '@/components/PresetSelector';
import { DicePoolEditor } from '@/components/DicePoolEditor';
import { RerollEditor } from '@/components/RerollEditor';
import { PipelineEditor } from '@/components/PipelineEditor';
import { OutcomeEditor } from '@/components/OutcomeEditor';
import { ParameterEditor } from '@/components/ParameterEditor';
import { ResultView } from '@/components/ResultView';
import { SweepCostChip } from '@/components/SweepCostChip';
import { OutcomeChart, ParameterChart } from '@/components/DistributionChart';
import { OddsTape } from '@/components/OddsTape';
import { saveConfig, loadConfig } from '@/state/persistence';
import { validateConfig, canRunSimulation } from '@/utils/validation';
import { computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Section, Button, Checkbox } from '@/components/ui';

export const simResults = signal<SimResult[]>([]);
export const simError = signal<string | null>(null);
export const highCostTooltip = signal<boolean>(false);
export const loadError = signal<string | null>(null);

let worker: Worker | null = null;

export function cancelSimulation() {
  worker?.terminate();
  worker = null;
  isSimulating.value = false;
}

export function resetUiForPresetApply() {
  cancelSimulation();
  simResults.value = [];
  simError.value = null;
  confirmedHighCost.value = false;
}

const validationErrors = computed(() =>
  validateConfig(dicePool.value, rerollConditions.value, pipeline.value, outcomes.value, parameters.value)
);

const canRun = computed(() => !isSimulating.value && canRunSimulation(validationErrors.value) && outcomes.value.length > 0);

export function App() {
  useEffect(() => { loadConfig(); }, []);

  useEffect(() => {
    function flush() {
      if (configDirty.value) {
        saveConfig();
        configDirty.value = false;
      }
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      flush();
    }, 2000);
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }
    function onPageHide() { flush(); }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  function runSimulation() {
    if (!canRun.value) return;
    const total = totalIterations.value;
    if (total > 50_000_000 && !confirmedHighCost.value) {
      confirmedHighCost.value = true;
      highCostTooltip.value = true;
      setTimeout(() => { highCostTooltip.value = false; }, 4000);
      return;
    }
    confirmedHighCost.value = false;
    isSimulating.value = true;
    simError.value = null;
    simResults.value = [];

    const job: SimJob = {
      pool: { ...dicePool.value, terms: dicePool.value.terms.map((t) => ({ ...t })) },
      rerollConditions: rerollConditions.value.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } })),
      pipeline: pipeline.value.map((p) => ({ ...p })),
      outcomes: outcomes.value.map((o) => ({ ...o, conditions: [...o.conditions] })),
      parameters: parameters.value.length > 0 ? parameters.value.map((p) => ({ ...p })) : undefined,
      iterations: 1_000_000,
    };

    worker = new Worker(new URL('@/worker/sim.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        simProgress.value = { completed: msg.completed, total: msg.total };
      }
      if (msg.type === 'result') {
        simResults.value = msg.results;
        isSimulating.value = false;
        worker?.terminate();
        worker = null;
      }
      if (msg.type === 'error') {
        simError.value = msg.message;
        isSimulating.value = false;
        worker?.terminate();
        worker = null;
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      simError.value = e.message || 'Simulation error';
      isSimulating.value = false;
      worker?.terminate();
      worker = null;
    };

    worker.postMessage({ type: 'run', job });
  }

  const blockingErrors = validationErrors.value.filter((e) => e.blocking);
  const hasResults = !isSimulating.value && simResults.value.length > 0;
  const singleResult = simResults.value.length === 1 ? simResults.value[0] : null;
  const sweepCount = parameters.value.reduce((a, p) => a * p.values.length, 1);

  return (
    <div class="min-h-screen flex flex-col">
      <header class="bg-billiard text-paper">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <a href="#" class="flex items-center gap-3 group" aria-label="Oddsboard home">
            <span class="inline-flex items-center justify-center w-12 h-12 border-2 border-gold bg-billiard-deep shadow-[0_2px_0_0_var(--color-gold)]">
              <svg viewBox="0 0 100 100" class="w-9 h-9" aria-hidden="true">
                <path d="M50 22 L78 36 L68 70 L32 70 L22 36 Z"
                      fill="none" stroke="#faf8f2" stroke-width="4" stroke-linejoin="round"/>
                <circle cx="50" cy="36" r="4" fill="#faf8f2"/>
                <circle cx="38" cy="50" r="4" fill="#faf8f2"/>
                <circle cx="62" cy="50" r="4" fill="#faf8f2"/>
                <circle cx="44" cy="62" r="4" fill="#faf8f2"/>
                <circle cx="56" cy="62" r="4" fill="#c9a646"/>
              </svg>
            </span>
            <span class="flex flex-col leading-none">
              <span class="font-display text-[30px] tracking-[0.06em] text-paper leading-none">ODDSBOARD</span>
              <span class="font-mono text-[9px] uppercase tracking-[0.28em] text-gold mt-1.5">
                Dice Probability · v1
              </span>
            </span>
          </a>
        </div>
      </header>

      <PresetSelector />

      <main class="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
        <div class="space-y-0">
          <Section
            eyebrow="Step 01"
            title="Dice Pool"
            description="Which dice are rolled and how many of each. Tag a die set to refer to it by name in later steps."
          >
            <DicePoolEditor />
          </Section>
          <Section
            eyebrow="Step 02"
            title="Reroll Conditions"
            description="Re-roll or explode any die whose face matches a value or whose tag matches a name. Optional — leave empty for a plain roll."
          >
            <RerollEditor />
          </Section>
          <Section
            eyebrow="Step 03"
            title="Resolution Pipeline"
            description="Transform the rolled dice into named values: keep the best, count sixes, sum, filter by tag, or add a modifier."
            actions={
              <Checkbox
                label="Comments"
                checked={showComments.value}
                onChange={(v) => { showComments.value = v; }}
              />
            }
          >
            <PipelineEditor />
          </Section>
          <Section
            eyebrow="Step 04"
            title="Outcomes"
            description="The buckets the roll is sorted into. The probability of each one is what the simulation estimates."
          >
            <OutcomeEditor />
          </Section>
          <Section
            eyebrow="Step 05"
            title="Sweep Parameters"
            description="Re-run the whole simulation for each value of a chosen input. One number becomes a curve."
          >
            <ParameterEditor />
            <div class="mt-4">
              <SweepCostChip
                onConfirmHighCost={() => {
                  confirmedHighCost.value = true;
                  highCostTooltip.value = true;
                  setTimeout(() => { highCostTooltip.value = false; }, 4000);
                }}
              />
            </div>
          </Section>

          <div class="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mt-2 bg-paper/95 backdrop-blur border-t-2 border-gold">
            <div class="flex items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={runSimulation}
                disabled={!canRun.value}
                className="flex-1 sm:flex-none sm:min-w-[280px]"
                ariaLabel="Run simulation with 1,000,000 rolls per sweep value"
              >
                {isSimulating.value ? 'Running…' : hasResults ? 'Roll the Dice Again' : 'Roll the Dice'}
                <span class="font-mono text-[10px] opacity-90 ml-1 normal-case tracking-[0.08em]">
                  1M × {Math.max(1, sweepCount)}
                </span>
              </Button>
              {isSimulating.value && (
                <Button variant="ghost" size="md" onClick={cancelSimulation} ariaLabel="Cancel running simulation">
                  Cancel
                </Button>
              )}
            </div>
            {blockingErrors.length > 0 && (
              <ul class="mt-3 space-y-1">
                {blockingErrors.map((e) => (
                  <li key={e.id} class="font-mono text-[11px] text-billiard-deep">— {e.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside class="lg:sticky lg:top-6 lg:self-start space-y-6">
          {hasResults && singleResult && <OddsTape result={singleResult} progress={null} />}
          {isSimulating.value && <RunningPanel progress={simProgress.value} />}
          {simError.value && <ErrorPanel message={simError.value} />}

          {hasResults && (
            <Section
              eyebrow="Detail"
              title={simResults.value.length > 1 ? 'Probability Table' : 'Roll Count'}
            >
              <ResultView results={simResults.value} />
              {simResults.value.length === 1 && (
                <div class="mt-5">
                  <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep mb-2">
                    Distribution
                  </p>
                  <OutcomeChart result={simResults.value[0]} />
                </div>
              )}
              {simResults.value.length > 1 && (
                <div class="mt-5">
                  <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep mb-2">
                    Probability by Sweep
                  </p>
                  <ParameterChart results={simResults.value} />
                </div>
              )}
            </Section>
          )}

          {!isSimulating.value && !hasResults && !simError.value && (
            <EmptyPanel />
          )}
        </aside>
      </main>

      <footer class="border-t border-rule mt-auto">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          <span>Monte Carlo · 1,000,000 iterations per value</span>
          <span>Web Worker · No analytics · No tracking</span>
        </div>
      </footer>

      <div class="sr-only" role="status" aria-live="polite">
        {isSimulating.value ? 'Simulation running.' : ''}
        {hasResults ? 'Simulation complete.' : ''}
        {simError.value ? `Simulation error: ${simError.value}` : ''}
      </div>
    </div>
  );
}

function RunningPanel({ progress }: { progress: { completed: number; total: number } }) {
  const pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  return (
    <div class="border-2 border-billiard bg-paper p-5 shadow-[0_3px_0_0_var(--color-billiard)]">
      <div class="flex items-center justify-between mb-3">
        <span class="font-display text-billiard text-[15px] tracking-[0.18em] inline-flex items-center gap-2">
          <span class="inline-block w-2 h-2 bg-billiard rounded-full" />
          ROLLING
        </span>
        <span class="font-mono tabular text-[11px] text-ink">
          {progress.completed.toLocaleString()} / {progress.total > 0 ? progress.total.toLocaleString() : '…'}
        </span>
      </div>
      <div class="font-display text-[3.5rem] text-ink tabular leading-none mb-4">
        {pct.toFixed(1)}<span class="text-ink-soft text-[1.25rem]">%</span>
      </div>
      <div class="h-1.5 bg-paper-soft border border-rule">
        <div
          class="h-full bg-billiard"
          style={{ width: `${pct}%`, transformOrigin: 'left center' }}
        />
      </div>
      <p class="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        Shaking 1,000,000 outcomes in worker…
      </p>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div class="border-2 border-billiard bg-billiard-soft/40 p-5">
      <p class="font-display text-billiard-deep text-[15px] tracking-[0.18em] mb-2">
        Snake Eyes — Simulation Failed
      </p>
      <p class="font-mono text-[12px] text-ink">{message}</p>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div class="border-2 border-dashed border-gold bg-paper p-5">
      <div class="flex items-center gap-2 mb-3">
        <span class="h-px w-6 bg-gold" aria-hidden="true" />
        <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-deep">
          Result Canvas
        </p>
      </div>
      <p class="font-display text-[2.25rem] text-ink leading-[0.95] tracking-wide mb-3">
        No roll yet.
      </p>
      <p class="text-[13px] text-ink-soft leading-relaxed">
        Define at least one die set and one outcome, then press
        <span class="font-mono text-billiard"> Roll the Dice</span>. The simulation
        runs 1,000,000 rolls in a background worker and reports each outcome's
        probability here.
      </p>
    </div>
  );
}
