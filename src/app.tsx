import { signal } from '@preact/signals';
import type { SimResult, SimJob, SampleTrace } from '@/types';
import {
  dicePool,
  rerollConditions,
  pipeline,
  outcomes,
  sweep,
  isSimulating,
  simProgress,
  totalIterations,
  sweepSimCount,
  confirmedHighCost,
  configDirty,
  showComments,
  showPoolComments,
  showRerollComments,
  showOutcomeComments,
  currentPresetName,
  sampleMode,
  sampleTrace,
  sampleX,
  sampleY,
  resetSampleMode,
  applyPresetConfig,
  flushPendingPresetWrites,
  resetToDefaults,
} from '@/state/app-state';
import { PresetSelector } from '@/components/PresetSelector';
import { DicePoolEditor } from '@/components/DicePoolEditor';
import { RerollEditor } from '@/components/RerollEditor';
import { PipelineEditor } from '@/components/PipelineEditor';
import { OutcomeEditor } from '@/components/OutcomeEditor';
import { SweepEditor } from '@/components/SweepEditor';
import { ResultView } from '@/components/ResultView';
import { ResultDetailsModal } from '@/components/ResultDetailsModal';
import { OutcomeChart, ParameterChart } from '@/components/DistributionChart';
import { OddsTape } from '@/components/OddsTape';
import { SampleView } from '@/components/SampleView';
import { saveConfig } from '@/state/persistence';
import { validateConfig, canRunSimulation } from '@/utils/validation';
import { decodeShareUrl } from '@/utils/share';
import { computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Section, Button, Checkbox } from '@/components/ui';

export const simResults = signal<SimResult[]>([]);
export const simError = signal<string | null>(null);
export const highCostTooltip = signal<boolean>(false);
export const loadError = signal<string | null>(null);
export const detailsModalOpen = signal<boolean>(false);

export function closeDetailsModal() {
  detailsModalOpen.value = false;
}

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
  resetSampleMode();
}

const validationErrors = computed(() =>
  validateConfig(dicePool.value, rerollConditions.value, pipeline.value, outcomes.value, sweep.value)
);

const canRun = computed(() => !isSimulating.value && canRunSimulation(validationErrors.value) && outcomes.value.length > 0);

export function App() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const shared = decodeShareUrl(hash);
      if (shared) {
        applyPresetConfig({
          id: 'shared',
          name: 'Shared',
          pool: shared.pool,
          rerollConditions: shared.rerollConditions,
          pipeline: shared.pipeline,
          outcomes: shared.outcomes,
          sweep: shared.sweep,
        });
        configDirty.value = false;
        return;
      }
    }
    resetToDefaults();
  }, []);

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
    function onPageHide() { flush(); flushPendingPresetWrites(); }
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
    resetSampleMode();
    isSimulating.value = true;
    simError.value = null;
    simResults.value = [];

    const job: SimJob = {
      pool: { ...dicePool.value, terms: dicePool.value.terms.map((t) => ({ ...t, count: t.count, sides: t.sides })) },
      rerollConditions: rerollConditions.value.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } })),
      pipeline: pipeline.value.map((p) => ({ ...p })),
      outcomes: outcomes.value.map((o) => ({ ...o, conditions: [...o.conditions] })),
      sweep: { x: [...sweep.value.x], y: sweep.value.y ? [...sweep.value.y] : null, xName: sweep.value.xName, yName: sweep.value.yName },
      iterations: 1_000_000,
      taskName: currentPresetName.value ?? undefined,
    };

    worker = new Worker(new URL('@/worker/sim.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        simProgress.value = {
          completed: msg.completed,
          total: msg.total,
          overallCompleted: msg.overallCompleted ?? 0,
          overallTotal: msg.overallTotal ?? 0,
        };
      }
      if (msg.type === 'result') {
        simResults.value = msg.results;
        isSimulating.value = false;
        worker?.terminate();
        worker = null;
      }
      if (msg.type === 'sampleResult') {
        sampleTrace.value = msg.trace as SampleTrace;
        sampleMode.value = 'result';
        worker?.terminate();
        worker = null;
      }
      if (msg.type === 'sampleError') {
        simError.value = msg.message || 'Sample error';
        sampleMode.value = 'idle';
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
      if (sampleMode.value === 'sampling') {
        simError.value = e.message || 'Sample error';
        sampleMode.value = 'idle';
      } else {
        simError.value = e.message || 'Simulation error';
        isSimulating.value = false;
      }
      worker?.terminate();
      worker = null;
    };

    worker.postMessage({ type: 'run', job });
  }

  function runSample() {
    cancelSimulation();
    resetSampleMode();
    simResults.value = [];
    simError.value = null;
    sampleMode.value = 'sampling';

    const sw = sweep.value;
    let xVal: number | null = null;
    let yVal: number | null = null;
    if (sw.x.length > 0) {
      xVal = sw.x[Math.floor(Math.random() * sw.x.length)]!;
    }
    if (sw.y && sw.y.length > 0) {
      yVal = sw.y[Math.floor(Math.random() * sw.y.length)]!;
    }
    sampleX.value = xVal;
    sampleY.value = yVal;

    const job: SimJob = {
      pool: { ...dicePool.value, terms: dicePool.value.terms.map((t) => ({ ...t, count: t.count, sides: t.sides })) },
      rerollConditions: rerollConditions.value.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } })),
      pipeline: pipeline.value.map((p) => ({ ...p })),
      outcomes: outcomes.value.map((o) => ({ ...o, conditions: [...o.conditions] })),
      sweep: { x: [...sw.x], y: sw.y ? [...sw.y] : null, xName: sweep.value.xName, yName: sweep.value.yName },
      iterations: 1,
      taskName: currentPresetName.value ?? undefined,
    };

    worker = new Worker(new URL('@/worker/sim.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'sampleResult') {
        sampleTrace.value = msg.trace as SampleTrace;
        sampleMode.value = 'result';
        worker?.terminate();
        worker = null;
      }
      if (msg.type === 'sampleError') {
        simError.value = msg.message || 'Sample error';
        sampleMode.value = 'idle';
        worker?.terminate();
        worker = null;
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      simError.value = e.message || 'Sample error';
      sampleMode.value = 'idle';
      worker?.terminate();
      worker = null;
    };

    worker.postMessage({ type: 'sample', job, x: xVal ?? undefined, y: yVal ?? undefined });
  }

  const blockingErrors = validationErrors.value.filter((e) => e.blocking);
  const hasResults = !isSimulating.value && simResults.value.length > 0 && sampleMode.value === 'idle';
  const singleResult = simResults.value.length === 1 ? simResults.value[0] : null;
  const sims = sweepSimCount.value;
  const sw = sweep.value;
  const xCount = sw.x.length;
  const yCount = sw.y ? sw.y.length : 0;
  const yActive = yCount > 0;
  const subLabel = yActive
    ? xCount > 0
      ? `1M × ${xCount} · ${yCount}`
      : `1M × ${yCount}`
    : `1M × ${Math.max(1, sims)}`;
  const canSample = canRun.value && sampleMode.value !== 'sampling';
  const sampleActive = sampleMode.value === 'result' && sampleTrace.value !== null;

  return (
    <div class="min-h-screen flex flex-col">
      <header class="bg-billiard text-paper">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
          <a href="#" class="flex items-center gap-3 group" aria-label="Dicestats home">
            <img src={`${import.meta.env.BASE_URL}cat_paw_roll.png`} alt="Dicestats" class="w-14 h-14 object-contain" />
            <span class="flex flex-col leading-none">
              <span class="font-display text-[30px] tracking-[0.06em] text-paper leading-none">DICESTATS</span>
              <span class="font-mono text-[9px] uppercase tracking-[0.28em] text-gold mt-1.5">
                dice probability calculator
              </span>
            </span>
          </a>
          <a href="https://lazycatcult.com" target="_blank" rel="noopener noreferrer" aria-label="Lazy Cat Cult">
            <img src={`${import.meta.env.BASE_URL}lcc_logo2.png`} alt="Lazy Cat Cult" class="h-12 w-auto" />
          </a>
        </div>
      </header>

      <PresetSelector />

      <main class="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
        <div class="space-y-0">
          <Section
            eyebrow="Step 01"
            title="Sweep Parameters"
            description="Two independent variables, X and Y. Type a number or expression containing X or Y in any value cell below. Y produces one result section per value; each section contains the full X sweep."
          >
            <SweepEditor />
          </Section>
          <Section
            eyebrow="Step 02"
            title="Dice Pool"
            description="Which dice are rolled and how many of each. Tag a die set to refer to it by name in later steps."
            actions={
              <Checkbox
                label="Comments"
                checked={showPoolComments.value}
                onChange={(v) => { showPoolComments.value = v; }}
              />
            }
          >
            <DicePoolEditor />
          </Section>
          <Section
            eyebrow="Step 03"
            title="Additional Dice Rolls"
            description="Add extra dice to the pool based on conditions — roll additional D6s, bonus dice, or extra dice from tagged sets."
            actions={
              <Checkbox
                label="Comments"
                checked={showRerollComments.value}
                onChange={(v) => { showRerollComments.value = v; }}
              />
            }
          >
            <RerollEditor />
          </Section>
          <Section
            eyebrow="Step 04"
            title="Resolution Pipeline"
            description="Transform the rolled dice into named values: keep the best, count sixes, sum, filter by tag, or add a modifier. Reference X or Y in any value to make it a sweep variable."
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
            eyebrow="Step 05"
            title="Outcomes"
            description="The buckets the roll is sorted into. The probability of each one is what the simulation estimates. Use X or Y in any threshold to make it a sweep variable."
            actions={
              <Checkbox
                label="Comments"
                checked={showOutcomeComments.value}
                onChange={(v) => { showOutcomeComments.value = v; }}
              />
            }
          >
            <OutcomeEditor />
          </Section>

          <div class="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mt-2 bg-paper/95 backdrop-blur border-t-2 border-gold">
            <div class="flex items-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={runSample}
                disabled={!canSample}
                className="shrink-0"
                ariaLabel="Roll a single sample throw"
              >
                {sampleMode.value === 'sampling' ? 'Sampling…' : 'Sample'}
              </Button>
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
                  {subLabel}
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
          {sampleActive && (() => {
            const trace = sampleTrace.value!;
            function postSample(overrides?: { termIndex: number; faces: number[] }[]) {
              cancelSimulation();
              const job: SimJob = {
                pool: { ...dicePool.value, terms: dicePool.value.terms.map((t) => ({ ...t, count: t.count, sides: t.sides })) },
                rerollConditions: rerollConditions.value.map((r) => ({ ...r, conditions: { ...r.conditions, clauses: [...r.conditions.clauses] } })),
                pipeline: pipeline.value.map((p) => ({ ...p })),
                outcomes: outcomes.value.map((o) => ({ ...o, conditions: [...o.conditions] })),
                sweep: { x: [...sweep.value.x], y: sweep.value.y ? [...sweep.value.y] : null, xName: sweep.value.xName, yName: sweep.value.yName },
                iterations: 1,
                taskName: currentPresetName.value ?? undefined,
              };
              worker = new Worker(new URL('@/worker/sim.worker.ts', import.meta.url), { type: 'module' });
              worker.onmessage = (e2) => {
                const m = e2.data;
                if (m.type === 'sampleResult') {
                  sampleTrace.value = m.trace as SampleTrace;
                  worker?.terminate();
                  worker = null;
                }
                if (m.type === 'sampleError') {
                  worker?.terminate();
                  worker = null;
                }
              };
              worker.onerror = () => { worker?.terminate(); worker = null; };
              worker.postMessage({ type: 'sample', job, x: sampleX.value ?? undefined, y: sampleY.value ?? undefined, overrides });
            }
            function buildAllFaces(): { termIndex: number; faces: number[] }[] {
              return dicePool.value.terms.map((_, ti) => ({
                termIndex: ti,
                faces: trace.diceDetails.filter((d) => d.termIndex === ti).map((d) => d.originalFace),
              }));
            }
            return (
              <SampleView
                trace={trace}
                diceTerms={dicePool.value.terms}
                onFaceChange={(termIndex, dieIndex, newFace) => {
                  const overrides = buildAllFaces();
                  const ot = overrides.find((o) => o.termIndex === termIndex);
                  if (ot && dieIndex < ot.faces.length) ot.faces[dieIndex] = newFace;
                  postSample(overrides);
                }}
                onSweepChange={(xVal, yVal) => {
                  if (xVal !== undefined) sampleX.value = xVal;
                  if (yVal !== undefined) sampleY.value = yVal;
                  postSample(buildAllFaces());
                }}
                onRollAgain={() => runSample()}
                sampleX={sampleX.value}
                sampleY={sampleY.value}
              />
            );
          })()}
          {sampleMode.value === 'sampling' && (
            <SampleRunningPanel />
          )}
          {hasResults && singleResult && <OddsTape result={singleResult} progress={null} />}
          {isSimulating.value && <RunningPanel progress={simProgress.value} />}
          {simError.value && <ErrorPanel message={simError.value} />}

          {hasResults && (
            <Section
              eyebrow="Detail"
              title={simResults.value.length > 1 ? 'Probability Table' : 'Roll Count'}
              actions={
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => { detailsModalOpen.value = true; }}
                  ariaLabel="Open details and statistics"
                >
                  Details &amp; Statistics
                </Button>
              }
            >
              <ResultView results={simResults.value} xName={sweep.value.xName} yName={sweep.value.yName} />
              {simResults.value.length === 1 && (
                <div class="mt-5">
                  <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep mb-2">
                    Distribution
                  </p>
                  <OutcomeChart result={simResults.value[0]} />
                </div>
              )}
              {simResults.value.length > 1 && !yActive && (
                <div class="mt-5">
                  <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-deep mb-2">
                    Probability by Sweep
                  </p>
                  <ParameterChart results={simResults.value} />
                </div>
              )}
            </Section>
          )}

          {!isSimulating.value && !hasResults && !simError.value && sampleMode.value === 'idle' && (
            <EmptyPanel />
          )}
        </aside>
      </main>

      <footer class="border-t border-rule mt-auto">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          <span>
            Created by <a href="https://lazycatcult.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-gold-deep transition-colors">Lazy Cat Cult</a> {new Date().getFullYear() === 2026 ? '2026' : `2026-${new Date().getFullYear()}`}
          </span>
          <span>
            Help us make this site better: <a href="https://github.com/lazy-cat-cult/dicestats/issues" target="_blank" rel="noopener noreferrer" class="underline hover:text-gold-deep transition-colors">lazy-cat-cult.github.io/dicestats</a>
          </span>
        </div>
      </footer>

      <div class="sr-only" role="status" aria-live="polite">
        {isSimulating.value ? 'Simulation running.' : ''}
        {hasResults ? 'Simulation complete.' : ''}
        {simError.value ? `Simulation error: ${simError.value}` : ''}
      </div>

      {detailsModalOpen.value && simResults.value.length > 0 && (
        <ResultDetailsModal results={simResults.value} xName={sweep.value.xName} yName={sweep.value.yName} onClose={closeDetailsModal} />
      )}
    </div>
  );
}

function RunningPanel({ progress }: { progress: { completed: number; total: number; overallCompleted: number; overallTotal: number } }) {
  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const overallPct = progress.overallTotal > 0 ? Math.round((progress.overallCompleted / progress.overallTotal) * 100) : 0;
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
      <div class="flex items-end gap-4 mb-4">
        <div class="flex flex-col items-center">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft mb-1">Step</span>
          <span class="font-display text-[3rem] text-ink tabular-nums leading-none">
            {String(pct).padStart(2, '0')}<span class="text-ink-soft text-[1.25rem]">%</span>
          </span>
        </div>
        <span class="font-mono text-ink-mute text-[1.5rem] pb-2">/</span>
        <div class="flex flex-col items-center">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft mb-1">Overall</span>
          <span class="font-display text-[3rem] text-ink tabular-nums leading-none">
            {String(overallPct).padStart(2, '0')}<span class="text-ink-soft text-[1.25rem]">%</span>
          </span>
        </div>
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

function SampleRunningPanel() {
  return (
    <div class="border-2 border-billiard bg-paper p-5 shadow-[0_3px_0_0_var(--color-billiard)]">
      <div class="flex items-center justify-between mb-3">
        <span class="font-display text-billiard text-[15px] tracking-[0.18em] inline-flex items-center gap-2">
          <span class="inline-block w-2 h-2 bg-billiard rounded-full" />
          SAMPLING
        </span>
      </div>
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        Running one throw…
      </p>
    </div>
  );
}
