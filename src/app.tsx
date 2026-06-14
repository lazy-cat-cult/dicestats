import { signal } from '@preact/signals';
import type { SimResult, SimJob } from '@/types';
import { dicePool, rerollConditions, pipeline, outcomes, parameters, isSimulating, simProgress } from '@/state/app-state';
import { currentStep } from '@/components/StepWizard';
import { PresetSelector } from '@/components/PresetSelector';
import { DicePoolEditor } from '@/components/DicePoolEditor';
import { RerollEditor } from '@/components/RerollEditor';
import { PipelineEditor } from '@/components/PipelineEditor';
import { OutcomeEditor } from '@/components/OutcomeEditor';
import { ParameterEditor } from '@/components/ParameterEditor';
import { ResultView } from '@/components/ResultView';
import { OutcomeChart, ParameterChart } from '@/components/DistributionChart';
import { saveConfig, loadConfig } from '@/state/persistence';
import { validateConfig, canRunSimulation } from '@/utils/validation';
import { computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';

export const simResults = signal<SimResult[]>([]);
export const simError = signal<string | null>(null);

let worker: Worker | null = null;

const validationErrors = computed(() =>
  validateConfig(dicePool.value, rerollConditions.value, pipeline.value, outcomes.value, parameters.value)
);

const canRun = computed(() => !isSimulating.value && canRunSimulation(validationErrors.value) && outcomes.value.length > 0);

export function App() {
  useEffect(() => { loadConfig(); }, []);

  function runSimulation() {
    if (!canRun.value) return;
    isSimulating.value = true;
    simError.value = null;
    simResults.value = [];
    currentStep.value = 2;

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

  function cancelSimulation() {
    worker?.terminate();
    worker = null;
    isSimulating.value = false;
  }

  const blockingErrors = validationErrors.value.filter((e) => e.blocking);

  return (
    <div class="min-h-screen bg-white text-gray-900">
      <header class="border-b border-gray-200 px-4 py-3">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-800">Dice Probability</h1>
          <button
            class="text-sm text-gray-500 hover:text-gray-700"
            onClick={() => saveConfig()}
          >
            Save
          </button>
        </div>
      </header>

      <main class="max-w-2xl mx-auto px-4 py-6">
        {currentStep.value < 3 && <PresetSelector />}

        <div class="mb-4">
          {blockingErrors.length > 0 && (
            <div class="bg-red-50 border border-red-200 rounded p-3 mb-3">
              {blockingErrors.map((e) => (
                <p key={e.id} class="text-red-700 text-sm">{e.message}</p>
              ))}
            </div>
          )}
        </div>

        <div class="flex gap-2 mb-6">
          {['Dice Pool & Reroll', 'Resolve & Outcomes', 'Results'].map((label, i) => (
            <button
              key={i}
              class={`flex-1 text-center text-sm py-2 border-b-2 transition-colors ${
                i === currentStep.value
                  ? 'border-indigo-500 text-indigo-600 font-semibold'
                  : 'border-gray-200 text-gray-400'
              }`}
              onClick={() => { currentStep.value = i; }}
            >
              {label}
            </button>
          ))}
        </div>

        <div class="min-h-[400px]">
          {currentStep.value === 0 && (
            <div class="space-y-6">
              <DicePoolEditor />
              <RerollEditor />
            </div>
          )}
          {currentStep.value === 1 && (
            <div class="space-y-6">
              <PipelineEditor />
              <OutcomeEditor />
              <ParameterEditor />
            </div>
          )}
          {currentStep.value === 2 && (
            <div>
              <div>
                {!isSimulating.value && simResults.value.length === 0 && (
                  <div class="text-center py-12">
                    <p class="text-gray-500 mb-4">Configure dice pool and outcomes, then run simulation.</p>
                    <button
                      class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-lg font-semibold disabled:opacity-40"
                      onClick={runSimulation}
                      disabled={!canRun.value}
                    >
                      Run Simulation (1,000,000 rolls)
                    </button>
                  </div>
                )}

                {isSimulating.value && (
                  <div class="text-center py-12">
                    <p class="text-gray-600 mb-2">Simulation running...</p>
                    <p class="text-sm text-gray-400">
                      {simProgress.value.completed} / {simProgress.value.total || '\u2026'}
                    </p>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div
                        class="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: simProgress.value.total > 0 ? `${(simProgress.value.completed / simProgress.value.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <button
                      class="mt-4 px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                      onClick={cancelSimulation}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {simError.value && (
                  <div class="bg-red-50 border border-red-200 rounded p-4 mb-4">
                    <p class="text-red-700">{simError.value}</p>
                  </div>
                )}

                {!isSimulating.value && simResults.value.length > 0 && (
                  <div>
                    <ResultView results={simResults.value} />

                    {simResults.value.length === 1 && (
                      <div class="mt-6">
                        <h3 class="text-sm font-semibold text-gray-600 mb-2">Outcome Probabilities</h3>
                        <OutcomeChart result={simResults.value[0]} />
                      </div>
                    )}

                    {simResults.value.length > 1 && (
                      <div class="mt-6">
                        <h3 class="text-sm font-semibold text-gray-600 mb-2">Outcome Probabilities</h3>
                        <ParameterChart results={simResults.value} />
                      </div>
                    )}

                    <div class="mt-6 text-center">
                      <button
                        class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                        onClick={runSimulation}
                      >
                        Re-run
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div class="flex justify-between mt-6">
          <button
            class="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            disabled={currentStep.value === 0}
            onClick={() => { currentStep.value = Math.max(0, currentStep.value - 1); }}
          >
            Back
          </button>
          <button
            class="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            disabled={currentStep.value === 2}
            onClick={() => { currentStep.value = Math.min(2, currentStep.value + 1); }}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}