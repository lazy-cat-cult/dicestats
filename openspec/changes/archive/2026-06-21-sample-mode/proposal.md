## Why

The current "Roll the Dice" simulation runs 1,000,000 Monte Carlo iterations and returns aggregate probabilities. Users have no way to inspect a single dice throw in detail — they cannot see which dice were rolled, what the intermediate pipeline values were, whether rerolls or explosions triggered, or which outcomes matched. This makes debugging complex configurations (especially reroll chains and multi-step pipelines) a trial-and-error process requiring mental arithmetic against the final probabilities.

A "Sample" mode runs ONE throw and displays the full resolution trace: every rolled die, every reroll/explode event, every pipeline value, and every matched outcome. The user can then edit the initial dice values (and sweep X/Y values) to manually test edge cases.

## What Changes

- **New** "Sample" button in the sticky run strip, next to "Roll the Dice". The button is disabled when the configuration is invalid (same validation rules as the run button). Label: "Sample".
- **New** `SampleTrace` type capturing a single-throw resolution trace: dice pool rolls, reroll/explode events, pipeline values, and matched outcomes.
- **New** worker message `{ type: 'sample'; job: SimJob; x?: number; y?: number }` and response `{ type: 'sampleResult'; trace: SampleTrace }` (or `{ type: 'sampleError'; message: string }`).
- **New** `SampleView` component in the right (result) panel, replacing the result canvas when sample mode is active. The SampleView renders the full trace in a read-only card layout with editable dice-pool fields and editable X/Y fields. When the user edits a dice face or an X/Y value, the trace is recalculated live (via the worker with one iteration) and the view updates.
- **Modified** `App`: tracks `sampleMode: 'idle' | 'sampling' | 'result'` and `sampleTrace: SampleTrace | null`. The Sample button toggles sample mode; clicking it clears any existing Monte Carlo results. When sample mode is active and a trace exists, the right panel shows `SampleView` instead of `OddsTape` + `ResultView` + `DistributionChart`.
- **Modified** worker: inlines a `sampleOnce(job, x?, y?)` function that runs one iteration but returns the trace instead of aggregate counts. The existing `runSimulation` is unchanged.
- **Modified** `SimResult` / `SimJob`: no changes — sample mode uses its own types and messages.
- **Modified** `SweepParameters`: when X and Y are defined, a random pair `(x, y)` is selected and shown in editable fields in the SampleView. Editing them recalculates the trace.

## Capabilities

### New Capabilities
- `sample`: the Sample mode feature — single-throw resolution trace, live editing of initial values, and recalculation.

### Modified Capabilities
- `ui`: the result panel layout gains a `SampleView`; the sticky run strip gains a "Sample" button; the right panel toggles between Monte Carlo results and sample trace.
- `simulation`: the worker gains a `sample` message handler and a `sampleOnce` function returning `SampleTrace`.

## Impact

- `src/types/index.ts`: add `SampleTrace`, `SampleDiceRoll`, `SampleRerollEvent`, `SamplePipelineValue`, `SampleOutcomeMatch` types. No changes to existing types.
- `src/worker/sim.worker.ts`: add `sampleOnce()` (inlined, imports from domain modules), add `sample` message handler.
- `src/components/SampleView.tsx` (new): renders the trace card layout with editable fields.
- `src/app.tsx`: add `sampleMode` and `sampleTrace` signals; add Sample button; conditionally render SampleView vs result canvas.
- `src/state/app-state.ts`: add `sampleMode`, `sampleTrace`, `sampleX`, `sampleY` signals.
- No changes to domain modules (roller, reroll, resolve, classify).
- No changes to persistence, validation, presets, or YAML.
- No new dependencies.
